#!/usr/bin/env node
/**
 * Build the French (DELF A1-B1) flashcard deck.
 *
 * Levels: FLELex (Cental, UCLouvain) — a French lexical database with
 * frequency per CEFR level. The "Beacco" export ships an explicit level column.
 *   https://cental.uclouvain.be/cefrlex/
 *   mirror used here: https://github.com/nathanschulz/french-vocab-tool
 *
 * Definitions: FreeDict French-English (GPL v2+)
 *   https://freedict.org/
 *
 * Only A1-B1 is built: FreeDict covers 90% / 71% / 64% of those levels, but
 * only ~34% of B2, so B2 would be mostly empty cards.
 *
 * Usage:
 *   npm run data:french
 */

import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'server/data/french.json');

const LEVELS_URL =
  'https://raw.githubusercontent.com/nathanschulz/french-vocab-tool/main/data/FleLex_TT_Beacco.tsv';
// Raw TEI from the FreeDict mirror — one plain request, no archive unpacking.
const DICT_URL = 'https://raw.githubusercontent.com/freedict/fd-dictionaries/master/fra-eng/fra-eng.tei';

const LEVELS = ['A1', 'A2', 'B1'];
const MAX_MEANING_CHARS = 90;

/** FLELex tag → a short English label for the card back. */
const POS_LABEL = {
  NOM: 'noun',
  VER: 'verb',
  ADJ: 'adj',
  ADV: 'adv',
  PRP: 'prep',
  'PRP:det': 'prep',
  PRO: 'pron',
  DET: 'art',
  'DET:ART': 'art',
  'DET:POS': 'det',
  KON: 'conj',
  INT: 'interj',
};

/** FLELex tag → FreeDict part of speech. */
const POS_MAP = {
  NOM: ['n'],
  VER: ['v', 'vi', 'vt'],
  ADJ: ['adj'],
  ADV: ['adv'],
  PRP: ['prep'],
  'PRP:det': ['prep'],
  PRO: ['pron'],
  DET: ['det', 'art'],
  'DET:ART': ['art', 'det'],
  'DET:POS': ['det'],
  KON: ['conj'],
  INT: ['int'],
};

function stripTags(text) {
  return String(text ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.text();
}

async function loadDictionary() {
  if (!/^https?:/.test(DICT_URL)) return parseTei(await fsp.readFile(DICT_URL, 'utf8'));
  process.stdout.write(`Downloading ${DICT_URL}\n`);
  return parseTei(await fetchText(DICT_URL));
}

/** orth (lowercase) → [{ pos, quotes }] */
function parseTei(tei) {
  const dict = new Map();
  for (const match of tei.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = match[1];
    const orth = stripTags((body.match(/<orth[^>]*>([\s\S]*?)<\/orth>/) || [])[1] || '');
    const quotes = [...body.matchAll(/<quote[^>]*>([\s\S]*?)<\/quote>/g)]
      .map((quote) => stripTags(quote[1]))
      .filter(Boolean);
    if (!orth || !quotes.length) continue;
    const pos = stripTags((body.match(/<pos>([\s\S]*?)<\/pos>/) || [])[1] || '');
    const key = orth.toLowerCase();
    if (!dict.has(key)) dict.set(key, []);
    dict.get(key).push({ pos, quotes });
  }
  return dict;
}

function pickEntry(entries, tag) {
  if (!entries?.length) return null;
  const wanted = POS_MAP[tag] || [];
  return entries.find((entry) => wanted.includes(entry.pos)) || entries[0];
}

function cleanMeanings(quotes) {
  const seen = new Set();
  const out = [];
  for (const quote of quotes) {
    const clean = quote.replace(/\s+/g, ' ').trim();
    if (!clean || /^(?:see|cf\.|variant of)/i.test(clean)) continue;
    if (seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
    if (out.length === 2) break;
  }
  const joined = out.join(' · ');
  if (!joined) return '';
  return joined.length > MAX_MEANING_CHARS
    ? `${joined.slice(0, MAX_MEANING_CHARS - 1).trim()}…`
    : joined;
}

async function main() {
  process.stdout.write(`Reading levels: ${LEVELS_URL}\n`);
  const tsv = await fetchText(LEVELS_URL);
  const rows = tsv.split('\n').slice(1).filter(Boolean).map((line) => line.split('\t'));

  process.stdout.write('Building dictionary…\n');
  const dict = await loadDictionary();
  process.stdout.write(`Dictionary entries: ${dict.size}\n`);

  const byWord = new Map();
  let skippedNoMeaning = 0;

  for (const row of rows) {
    const word = stripTags(row[0] || '').trim();
    const tag = stripTags(row[1] || '');
    const level = stripTags(row[9] || '');
    if (!word || !LEVELS.includes(level)) continue;
    // Keep single words and short expressions; skip anything that is only
    // punctuation or a bare clitic.
    if (Array.from(word).length < 2) continue;
    if (!/^[a-zàâäçéèêëîïôöùûüÿœæ' -]+$/i.test(word)) continue;

    const frequency = Number(row[7]) || 0;
    const existing = byWord.get(word);
    if (existing) {
      if (LEVELS.indexOf(level) < LEVELS.indexOf(existing.l)) {
        existing.l = level;
      }
      continue;
    }

    const entry = pickEntry(dict.get(word.toLowerCase()), tag);
    const meaning = entry ? cleanMeanings(entry.quotes) : '';
    if (!meaning) {
      skippedNoMeaning += 1;
      continue;
    }

    const card = { w: word, m: meaning, l: level };
    if (POS_LABEL[tag]) card.pos = POS_LABEL[tag];
    if (frequency > 0) card.f = Math.round(frequency * 100) / 100;
    byWord.set(word, card);
  }

  const deck = Array.from(byWord.values()).sort(
    (a, b) => LEVELS.indexOf(a.l) - LEVELS.indexOf(b.l) || (b.f ?? 0) - (a.f ?? 0),
  );

  await fsp.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fsp.writeFile(OUT_FILE, JSON.stringify(deck), 'utf8');
  const bytes = (await fsp.stat(OUT_FILE)).size;
  process.stdout.write(`\nSkipped ${skippedNoMeaning} words with no definition.\n`);
  process.stdout.write(
    `Wrote ${deck.length} cards → ${path.relative(ROOT, OUT_FILE)} (${(bytes / 1024).toFixed(0)} KB)\n`,
  );
  for (const level of LEVELS) {
    process.stdout.write(`  ${level}: ${deck.filter((card) => card.l === level).length} cards\n`);
  }
  for (const card of deck.filter((card) => card.l === 'A1').slice(0, 8)) {
    process.stdout.write(`  ${card.w} — ${card.m}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
