#!/usr/bin/env node
/**
 * Attach a fill-in-the-blank sentence to every HSK card.
 *
 * Source: Tatoeba Chinese sentences (CC BY 2.0 FR)
 *   https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2
 * The dump mixes simplified and traditional, so everything is converted with
 * OpenCC before matching.
 *
 * A sentence is only used when:
 *   - it is 6-26 characters, ends with Chinese punctuation, has no Latin/digits
 *   - the target word appears exactly once
 *   - the target word is not just a piece of a longer HSK word
 *     (so 我 is not taken from 我们)
 *
 * Usage:
 *   npm run data:examples              # download + rewrite server/data/hsk.json
 *   npm run data:examples -- --source /tmp/cmn.tsv
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenCC from 'opencc-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECK_FILE = path.join(ROOT, 'server/data/hsk.json');
const DUMP_URL = 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2';

const MIN_CHARS = 8;
const MAX_CHARS = 22;
const MAX_USES_PER_SENTENCE = 2;
const IDEAL_CHARS = 12;
// Only content words make a meaningful fill-in-the-blank; blanking 的 / 了
// teaches nothing.
const CONTENT_POS = new Set(['n', 'v', 'a', 'ad', 'vn', 'an', 'ns', 'nz', 'nr']);
// The blank has to sit in the middle of the sentence, not at its edge.
const MIN_POSITION = 0.15;
const MAX_POSITION = 0.85;

const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });

function parseArgs(argv) {
  const options = { source: DUMP_URL };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source') options.source = argv[i + 1];
  }
  return options;
}

async function loadSentences(source) {
  let tsvPath = source;
  if (/^https?:/.test(source)) {
    const tmp = path.join(os.tmpdir(), `tatoeba-cmn-${Date.now()}.tsv`);
    process.stdout.write(`Downloading ${source}\n`);
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const archive = path.join(os.tmpdir(), `tatoeba-cmn-${Date.now()}.bz2`);
    await fsp.writeFile(archive, Buffer.from(await response.arrayBuffer()));
    const text = execFileSync('bunzip2', ['-c', archive], { maxBuffer: 1 << 28 }).toString('utf8');
    await fsp.writeFile(tmp, text);
    await fsp.rm(archive, { force: true });
    tsvPath = tmp;
  }

  const raw = await fsp.readFile(tsvPath, 'utf8');
  const sentences = [];
  for (const line of raw.split('\n')) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const text = toSimplified(parts[2]).trim();
    if (!text) continue;
    if (/[A-Za-z0-9]/.test(text)) continue;
    const length = Array.from(text).length;
    if (length < MIN_CHARS || length > MAX_CHARS) continue;
    if (!/[。！？]$/.test(text)) continue;
    sentences.push(text);
  }
  return sentences;
}

/** HSK words that are strictly longer and contain `word`. */
function buildContainers(words) {
  const containers = new Map();
  for (const word of words) containers.set(word, []);
  for (const word of words) {
    for (const other of words) {
      if (other.length > word.length && other.includes(word)) {
        containers.get(word).push(other);
      }
    }
  }
  return containers;
}

function overlapsLongerWord(sentence, word, containers) {
  const start = sentence.indexOf(word);
  if (start < 0) return false;
  const end = start + word.length;
  for (const longer of containers) {
    let at = sentence.indexOf(longer);
    while (at !== -1) {
      if (at <= start && at + longer.length >= end) return true;
      at = sentence.indexOf(longer, at + 1);
    }
  }
  return false;
}

async function main() {
  const { source } = parseArgs(process.argv.slice(2));
  const deck = JSON.parse(await fsp.readFile(DECK_FILE, 'utf8'));
  const sentences = await loadSentences(source);
  process.stdout.write(`Usable sentences: ${sentences.length}\n`);

  const words = deck.map((card) => card.w);
  const containers = buildContainers(words);

  // Inverted index: any character → sentences containing it.
  const byChar = new Map();
  for (const sentence of sentences) {
    for (const char of new Set(Array.from(sentence))) {
      if (!byChar.has(char)) byChar.set(char, []);
      byChar.get(char).push(sentence);
    }
  }

  const usage = new Map();
  let filled = 0;

  for (const card of deck) {
    delete card.s;
    if (!CONTENT_POS.has(card.pos)) continue;

    const pool = byChar.get(Array.from(card.w)[0]) || [];
    let best = null;
    for (const sentence of pool) {
      if (sentence.split(card.w).length - 1 !== 1) continue;
      const at = sentence.indexOf(card.w);
      const length = Array.from(sentence).length;
      if (at / length < MIN_POSITION || at / length > MAX_POSITION) continue;
      if (overlapsLongerWord(sentence, card.w, containers.get(card.w) || [])) continue;
      if ((usage.get(sentence) || 0) >= MAX_USES_PER_SENTENCE) continue;
      // Medium-length sentences give context without being a wall of text.
      const score = -Math.abs(length - IDEAL_CHARS);
      if (!best || score > best.score) best = { sentence, score };
    }
    if (!best) continue;
    usage.set(best.sentence, (usage.get(best.sentence) || 0) + 1);
    card.s = best.sentence.replace(card.w, '＿＿');
    filled += 1;
  }

  await fsp.writeFile(DECK_FILE, JSON.stringify(deck), 'utf8');
  const bytes = (await fsp.stat(DECK_FILE)).size;
  process.stdout.write(
    `\n${filled}/${deck.length} cards now have a sentence (${((filled / deck.length) * 100).toFixed(1)}%)\n`,
  );
  process.stdout.write(`Wrote ${path.relative(ROOT, DECK_FILE)} (${(bytes / 1024).toFixed(0)} KB)\n`);
  const sample = deck.filter((card) => card.s).slice(0, 8);
  for (const card of sample) process.stdout.write(`  ${card.w} — ${card.s}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
