#!/usr/bin/env node
/**
 * Attach a fill-in-the-blank sentence to every card of a deck.
 *
 * Source: Tatoeba (CC BY 2.0 FR)
 *   zh: https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2
 *   fr: https://downloads.tatoeba.org/exports/per_language/fra/fra_sentences.tsv.bz2
 *
 * Chinese mixes simplified and traditional, so the dump is converted with
 * OpenCC before matching. French keeps accents but must match whole words
 * (otherwise "ce" would be found inside "commence").
 *
 * Rules for a usable sentence:
 *   - a sensible length for the language, ending in punctuation
 *   - the target word appears exactly once, as a whole word
 *   - the blank sits in the middle of the sentence, not at its edge
 *   - Chinese: the word is not merely part of a longer HSK word (我 inside 我们)
 *
 * Usage:
 *   npm run data:examples                 # Chinese deck
 *   npm run data:examples -- --lang fr    # French deck
 *   npm run data:examples -- --source /tmp/cmn.tsv
 */

import { execFileSync } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenCC from 'opencc-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LANGUAGES = {
  zh: {
    deck: 'server/data/hsk.json',
    url: 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2',
    minChars: 8,
    maxChars: 22,
    idealChars: 12,
    // Only content words make a meaningful fill-in-the-blank in Chinese.
    contentPos: new Set(['n', 'v', 'a', 'ad', 'vn', 'an', 'ns', 'nz', 'nr']),
    simplify: true,
  },
  fr: {
    deck: 'server/data/french.json',
    url: 'https://downloads.tatoeba.org/exports/per_language/fra/fra_sentences.tsv.bz2',
    minChars: 20,
    maxChars: 95,
    idealChars: 55,
    // Articles and prepositions are exactly what a French learner drills, so
    // every part of speech is fair game here.
    contentPos: null,
    simplify: false,
  },
};

const MAX_USES_PER_SENTENCE = 2;
const MIN_POSITION = 0.15;
const MAX_POSITION = 0.85;
const MAX_CANDIDATES = 120;

const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });

function parseArgs(argv) {
  const options = { lang: 'zh', source: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--lang') options.lang = argv[i + 1];
    else if (argv[i] === '--source') options.source = argv[i + 1];
  }
  return options;
}

async function loadSentences(config, source) {
  let tsvPath = source ?? config.url;
  if (/^https?:/.test(tsvPath)) {
    process.stdout.write(`Downloading ${tsvPath}\n`);
    const response = await fetch(tsvPath);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const archive = path.join(os.tmpdir(), `tatoeba-${Date.now()}.bz2`);
    await fsp.writeFile(archive, Buffer.from(await response.arrayBuffer()));
    const text = execFileSync('bunzip2', ['-c', archive], { maxBuffer: 1 << 29 }).toString('utf8');
    tsvPath = path.join(os.tmpdir(), `tatoeba-${Date.now()}.tsv`);
    await fsp.writeFile(tsvPath, text);
    await fsp.rm(archive, { force: true });
  }

  const raw = await fsp.readFile(tsvPath, 'utf8');
  const sentences = [];
  for (const line of raw.split('\n')) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const text = (config.simplify ? toSimplified(parts[2]) : parts[2]).trim();
    if (!text) continue;
    if (config.simplify && /[A-Za-z0-9]/.test(text)) continue;
    const length = Array.from(text).length;
    if (length < config.minChars || length > config.maxChars) continue;
    if (!/[。！？.!?]$/.test(text)) continue;
    sentences.push(text);
  }
  return sentences;
}

function wordPattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu');
}

/** HSK words that are strictly longer and contain `word`. */
function buildContainers(words) {
  const containers = new Map(words.map((word) => [word, []]));
  for (const word of words) {
    for (const other of words) {
      if (other.length > word.length && other.includes(word)) {
        containers.get(word).push(other);
      }
    }
  }
  return containers;
}

function overlapsLongerWord(sentence, word, containers, index) {
  const end = index + word.length;
  for (const longer of containers) {
    let at = sentence.indexOf(longer);
    while (at !== -1) {
      if (at <= index && at + longer.length >= end) return true;
      at = sentence.indexOf(longer, at + 1);
    }
  }
  return false;
}

/** Index only the words that actually appear in the deck. */
function indexByWord(sentences, words) {
  const byWord = new Map();
  for (const sentence of sentences) {
    const tokens = new Set(sentence.toLowerCase().match(/[\p{L}'-]+/gu) || []);
    for (const token of tokens) {
      if (!words.has(token)) continue;
      if (!byWord.has(token)) byWord.set(token, []);
      const list = byWord.get(token);
      if (list.length < MAX_CANDIDATES) list.push(sentence);
    }
  }
  return byWord;
}

function pickBest(config, card, candidates, usage, containers) {
  let best = null;
  for (const sentence of candidates) {
    const matches = [...sentence.matchAll(wordPattern(card.w))];
    if (matches.length !== 1) continue;

    const index = matches[0].index;
    const ratio = index / sentence.length;
    if (ratio < MIN_POSITION || ratio > MAX_POSITION) continue;
    if (containers && overlapsLongerWord(sentence, card.w, containers, index)) continue;
    if ((usage.get(sentence) || 0) >= MAX_USES_PER_SENTENCE) continue;

    const score = -Math.abs(Array.from(sentence).length - config.idealChars);
    if (!best || score > best.score) {
      best = { sentence, score, index, length: matches[0][0].length };
    }
  }
  return best;
}

async function main() {
  const { lang, source } = parseArgs(process.argv.slice(2));
  const config = LANGUAGES[lang];
  if (!config) throw new Error(`Unknown language: ${lang}`);

  const deckFile = path.join(ROOT, config.deck);
  const deck = JSON.parse(await fsp.readFile(deckFile, 'utf8'));
  const sentences = await loadSentences(config, source);
  process.stdout.write(`[${lang}] usable sentences: ${sentences.length}\n`);

  const words = new Set(deck.map((card) => card.w.toLowerCase()));
  const byWord = indexByWord(sentences, words);
  const containers = config.simplify ? buildContainers(deck.map((card) => card.w)) : null;

  const usage = new Map();
  let filled = 0;

  for (const card of deck) {
    delete card.s;
    if (config.contentPos && !config.contentPos.has(card.pos)) continue;

    const candidates = byWord.get(card.w.toLowerCase()) || [];
    const best = pickBest(config, card, candidates, usage, containers);
    if (!best) continue;

    usage.set(best.sentence, (usage.get(best.sentence) || 0) + 1);
    card.s =
      best.sentence.slice(0, best.index) + '＿＿' + best.sentence.slice(best.index + best.length);
    filled += 1;
  }

  await fsp.writeFile(deckFile, JSON.stringify(deck), 'utf8');
  const bytes = (await fsp.stat(deckFile)).size;
  process.stdout.write(
    `\n[${lang}] ${filled}/${deck.length} cards have a sentence (${((filled / deck.length) * 100).toFixed(1)}%)\n`,
  );
  process.stdout.write(`Wrote ${path.relative(ROOT, deckFile)} (${(bytes / 1024).toFixed(0)} KB)\n`);
  for (const card of deck.filter((entry) => entry.s).slice(0, 6)) {
    process.stdout.write(`  ${card.w} — ${card.s}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
