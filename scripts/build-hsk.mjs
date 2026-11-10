#!/usr/bin/env node
/**
 * Build the flashcard deck used by the Chinese Corner tab.
 *
 * Two open data sets are merged:
 *
 *   1. Word list + pinyin: https://github.com/clem109/hsk-vocabulary
 *      One curated pronunciation per word (HSK 2.0 levels 1-6). Picking a
 *      reading from a dictionary instead tends to land on archaic variants
 *      (听 yǐn, 个 gě, 都 Dū), which is exactly what a learner must not see.
 *
 *   2. Definitions / part of speech / frequency:
 *      https://github.com/drkameleon/complete-hsk-vocabulary (MIT)
 *      For each word we take the form whose pinyin matches the curated one.
 *
 * Usage:
 *   npm run data:hsk              # download and regenerate
 *   npm run data:hsk -- --level 3 # only HSK 1-3
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORDLIST_URL = (level) =>
  `https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-${level}.json`;
const DICT_URL =
  'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'server/data/hsk.json');

const MAX_MEANINGS = 2;
const MAX_MEANING_CHARS = 70;
const MAX_TOTAL_MEANING_CHARS = 110;
const HARD_MEANING_CHARS = 80;
const NO_DEFINITION = '(no definition)';

/** Readings that are grammatically interesting but wrong for a flashcard. */
const RARE_HINT = /surname|archaic|literary|variant|used in|Taiwan pr\.|old variant/i;

function parseArgs(argv) {
  const options = { maxLevel: 6 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--level') options.maxLevel = Number(argv[i + 1]);
  }
  return options;
}

function pinyinKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s'’·-]/g, '')
    .normalize('NFC');
}

function trimMeaning(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_MEANING_CHARS) return clean;
  // Long definition: keep the first full clause rather than cutting a word.
  const clause = clean.split(';')[0].trim();
  if (clause.length <= HARD_MEANING_CHARS) return clause;
  const cut = clause.slice(0, HARD_MEANING_CHARS);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
}

function scoreForm(form) {
  const readings = form.transcriptions?.pinyin ?? '';
  const meanings = form.meanings || [];
  let score = Math.min(meanings.length, 6);
  if (/^[A-Z]/.test(readings)) score -= 4; // proper-noun or surname reading
  if (RARE_HINT.test(meanings[0] || '')) score -= 3;
  return score;
}

/** Pick the dictionary form that matches the curated pinyin, else the richest one. */
function pickForm(entry, pinyin) {
  const forms = entry?.forms || [];
  if (!forms.length) return null;

  const wanted = pinyinKey(pinyin);
  // Several forms can share a reading (e.g. 和 hé vs. its "old variant" note),
  // so keep the one that actually carries the everyday definitions.
  const matching = forms.filter((form) => pinyinKey(form.transcriptions?.pinyin) === wanted);
  const pool = matching.length ? matching : forms;

  let best = pool[0];
  let bestScore = scoreForm(best);
  for (const form of pool.slice(1)) {
    const score = scoreForm(form);
    if (score > bestScore) {
      best = form;
      bestScore = score;
    }
  }
  return best;
}

function definitionsFor(form, fallbackTranslations) {
  const raw = (form?.meanings?.length ? form.meanings : fallbackTranslations || [])
    .map(trimMeaning)
    .filter((meaning) => meaning && !/^(variant of|see |also pr\.)/i.test(meaning))
    .slice(0, MAX_MEANINGS);

  const joined = raw.join(' · ');
  if (!joined) return NO_DEFINITION;
  // Two clipped senses read worse than one clean one, so drop the second.
  return joined.length > MAX_TOTAL_MEANING_CHARS ? raw[0] : joined;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.json();
}

async function main() {
  const { maxLevel } = parseArgs(process.argv.slice(2));

  process.stdout.write(`Reading dictionary: ${DICT_URL}\n`);
  const dictionary = await fetchJson(DICT_URL);
  const dictByWord = new Map();
  for (const entry of dictionary) {
    if (entry.simplified && !dictByWord.has(entry.simplified)) {
      dictByWord.set(entry.simplified, entry);
    }
  }

  const cards = new Map();
  const stats = [];

  for (let level = 1; level <= maxLevel; level += 1) {
    const url = WORDLIST_URL(level);
    process.stdout.write(`Reading HSK ${level}: ${url}\n`);
    const words = await fetchJson(url);
    let added = 0;

    for (const word of words) {
      const hanzi = String(word.hanzi ?? '').trim();
      const pinyin = String(word.pinyin ?? '').trim();
      if (!hanzi || !pinyin) continue;
      // A word listed in two levels belongs to the easier one.
      if (cards.has(hanzi)) continue;

      const entry = dictByWord.get(hanzi);
      const form = pickForm(entry, pinyin);

      const card = {
        w: hanzi,
        p: pinyin,
        m: definitionsFor(form, word.translations),
        l: level,
      };

      const classifier = form?.classifiers?.[0];
      if (classifier) card.c = classifier;

      // A flashcard without an answer is worse than no card at all.
      if (card.m === NO_DEFINITION) continue;

      const pos = entry?.pos?.[0];
      if (pos) card.pos = pos;

      // Lower rank = more common, so new cards are introduced commonest-first.
      if (Number.isFinite(entry?.frequency)) card.f = entry.frequency;

      cards.set(hanzi, card);
      added += 1;
    }
    stats.push([level, added]);
  }

  const deck = Array.from(cards.values()).sort(
    (a, b) => a.l - b.l || (a.f ?? 999999) - (b.f ?? 999999),
  );

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(deck), 'utf8');

  const bytes = (await fs.stat(OUT_FILE)).size;
  process.stdout.write(
    `\nWrote ${deck.length} cards → ${path.relative(ROOT, OUT_FILE)} (${(bytes / 1024).toFixed(0)} KB)\n`,
  );
  for (const [level, count] of stats) {
    process.stdout.write(`  HSK ${level}: ${count} new cards\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
