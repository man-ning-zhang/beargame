import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_GOAL,
  DAILY_NEW,
  STUDY_LEVELS,
  buildQueue,
  createStudyState,
  currentStreak,
  levelsFor,
  setStudyLang,
  dayKey,
  deckSize,
  gradeCard,
  levelProgress,
  setStudyLevel,
  studyStats,
  studySummary,
  studyView,
  gradeCloze,
  nextCloze,
  sanitizeStudyState,
  setStudyLimit,
} from './study.js';

const T0 = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Cards in the order they would be introduced, without touching a room. */
function freshWords(count) {
  return buildQueue(createStudyState(1), T0)
    .slice(0, count)
    .map((card) => card.w);
}

test('starts on HSK 1 with an empty deck and no progress', () => {
  const study = createStudyState();
  assert.equal(study.level, 1);
  assert.deepEqual(study.cards, {});
  assert.equal(study.reviewedToday, 0);
  assert.equal(deckSize('zh', 1), 150);
  assert.deepEqual(STUDY_LEVELS, [1, 2, 3, 4, 5, 6]);
});

test('hands out new words commonest-first, up to the daily limit', () => {
  const queue = buildQueue(createStudyState(1), T0);
  assert.equal(queue.length, DAILY_NEW);
  assert.equal(queue[0].w, '的');
  assert.ok(queue.every((card) => card.l === 1));
  assert.ok(queue[0].p && queue[0].m, 'cards carry pinyin and a definition');
});

test('a fresh card graduates to one day, then three, then ease-based', () => {
  const study = createStudyState(1);
  const word = freshWords(1)[0];

  const first = gradeCard(study, word, 'good', T0);
  assert.equal(first.ok, true);
  assert.equal(first.wasNew, true);
  assert.equal(first.interval, 1);
  assert.equal(study.reviewedToday, 1);
  assert.equal(study.newToday, 1);

  const second = gradeCard(study, word, 'good', T0 + DAY);
  assert.equal(second.interval, 3);

  const third = gradeCard(study, word, 'good', T0 + 4 * DAY);
  assert.ok(third.interval > 3, `expected growth, got ${third.interval}`);
  assert.equal(study.cards[word].reps, 3);
});

test('"again" sends the card back into the same sitting', () => {
  const study = createStudyState(1);
  const word = freshWords(1)[0];

  gradeCard(study, word, 'good', T0);
  const lapse = gradeCard(study, word, 'again', T0 + DAY);

  assert.equal(lapse.interval, 0);
  assert.equal(study.cards[word].lapses, 1);
  assert.equal(study.cards[word].reps, 0);
  const dueIn = study.cards[word].due - (T0 + DAY);
  assert.ok(dueIn > 0 && dueIn <= 15 * MINUTE);

  // ... so it is queued again right away instead of tomorrow.
  const queue = buildQueue(study, T0 + DAY);
  assert.ok(queue.some((card) => card.w === word));
});

test('"hard" grows the interval more gently than "good"', () => {
  const study = createStudyState(1);
  const word = freshWords(1)[0];

  gradeCard(study, word, 'good', T0); // 1 day
  gradeCard(study, word, 'good', T0 + DAY); // 3 days
  const hard = gradeCard(study, word, 'hard', T0 + 4 * DAY);
  const good = gradeCard(study, word, 'good', T0 + 4 * DAY);

  assert.ok(hard.interval >= 3);
  assert.ok(good.interval > hard.interval);
});

test('stops introducing new cards once the daily allowance is spent', () => {
  const study = createStudyState(1);
  for (const word of freshWords(DAILY_NEW)) {
    gradeCard(study, word, 'good', T0);
  }
  assert.equal(study.newToday, DAILY_NEW);
  assert.equal(buildQueue(study, T0).length, 0);

  // Tomorrow the allowance resets: the 10 graduated cards come back due, and
  // 10 brand new cards follow them.
  const tomorrow = T0 + DAY;
  const queue = buildQueue(study, tomorrow);
  assert.equal(queue.length, DAILY_NEW * 2);
  const graduated = freshWords(DAILY_NEW);
  assert.ok(queue.slice(0, DAILY_NEW).every((card) => graduated.includes(card.w)));
  assert.ok(queue.slice(DAILY_NEW).every((card) => !graduated.includes(card.w)));
});

test('queue puts overdue reviews before brand new cards', () => {
  const study = createStudyState(1);
  const [first] = freshWords(1);
  gradeCard(study, first, 'good', T0); // due tomorrow
  const queue = buildQueue(study, T0 + 2 * DAY);
  assert.equal(queue[0].w, first);
});

test('grade previews match what the buttons will actually do', () => {
  const study = createStudyState(1);
  const [card] = buildQueue(study, T0);
  assert.deepEqual(card.iv, [0, 1]); // hard → later today, good → 1 day

  const next = gradeCard(study, card.w, 'good', T0).card;
  assert.deepEqual(next.iv, [1, 3]);
});

test('keeps a streak across consecutive days and drops it after a gap', () => {
  const study = createStudyState(1);
  const [word] = freshWords(1);

  gradeCard(study, word, 'good', T0);
  assert.equal(currentStreak(study, T0), 1);

  gradeCard(study, word, 'good', T0 + DAY);
  assert.equal(currentStreak(study, T0 + DAY), 2);

  // Two days later the chain is broken, and the next review starts at 1.
  assert.equal(currentStreak(study, T0 + 3 * DAY), 0);
  gradeCard(study, word, 'good', T0 + 3 * DAY);
  assert.equal(currentStreak(study, T0 + 3 * DAY), 1);
});

test('counts a day against the goal once enough cards are reviewed', () => {
  const study = createStudyState(1);
  const words = freshWords(DAILY_GOAL);
  for (const word of words.slice(0, DAILY_GOAL - 1)) gradeCard(study, word, 'good', T0);
  assert.equal(studyStats(study, T0).doneToday, false);
  gradeCard(study, words[DAILY_GOAL - 1], 'good', T0);
  assert.equal(studyStats(study, T0).doneToday, true);
});

test('switching levels changes the deck and rejects foreign cards', () => {
  const study = createStudyState(1);
  const [hsk1] = freshWords(1);

  assert.equal(setStudyLevel(study, 2).ok, true);
  assert.equal(study.level, 2);
  assert.equal(studyStats(study, T0).total, 147);

  const rejected = gradeCard(study, hsk1, 'good', T0);
  assert.deepEqual(rejected, { ok: false, error: 'unknown_card' });

  assert.equal(setStudyLevel(study, 9).ok, false);
});

test('level progress only counts graduated cards', () => {
  const study = createStudyState(1);
  const [word] = freshWords(1);
  gradeCard(study, word, 'good', T0);
  const progress = levelProgress(study);
  const level1 = progress.find((entry) => entry.level === 1);
  assert.equal(level1.learned, 1);
  assert.equal(level1.total, 150);
});

test('a study view is complete enough to render the panel', () => {
  const view = studyView(createStudyState(1), T0);
  assert.equal(view.level, 1);
  assert.equal(view.today.goal, DAILY_GOAL);
  assert.equal(view.today.done, false);
  assert.equal(view.levels.length, STUDY_LEVELS.length);
  assert.ok(view.queue.length > 0);
  assert.ok(Object.hasOwn(view.queue[0], 'iv'));
});

test('summaries and day keys stay stable for the same moment', () => {
  const study = createStudyState(1);
  assert.equal(dayKey(T0), dayKey(T0 + MINUTE));
  assert.equal(studySummary(study, T0).goal, DAILY_GOAL);
  assert.equal(studySummary(study, T0).reviewed, 0);
});

test('the daily new-word limit is adjustable and respected', () => {
  const study = createStudyState(1);
  assert.equal(study.newPerDay, 10);

  assert.equal(setStudyLimit(study, 20).ok, true);
  assert.equal(study.newPerDay, 20);
  assert.equal(buildQueue(study, T0).length, 20);

  assert.equal(setStudyLimit(study, 999).ok, true);
  assert.ok(buildQueue(study, T0).length > 20);

  assert.equal(setStudyLimit(study, 7).ok, false);
  assert.equal(study.newPerDay, 999);

  // The setting survives a round trip through the browser payload.
  const restored = sanitizeStudyState({ newPerDay: 50 });
  assert.equal(restored.newPerDay, 50);
  assert.equal(sanitizeStudyState({ newPerDay: 12345 }).newPerDay, 10);
});

test('cloze questions offer four options including the answer', () => {
  const study = createStudyState(1);
  const question = nextCloze(study, T0);
  assert.ok(question, 'HSK 1 has sentences to blank');
  assert.equal(question.options.length, 4);
  assert.ok(question.options.includes(question.answer));
  assert.ok(question.prompt.includes('＿＿'));
  assert.ok(question.m && question.p);

  const right = gradeCloze(study, question.key, question.answer, T0);
  assert.equal(right.correct, true);
  assert.equal(study.reviewedToday, 1);
  assert.equal(study.cards[question.key].reps, 1);

  const other = createStudyState(1);
  const second = nextCloze(other, T0);
  const wrongChoice = second.options.find((option) => option !== second.answer);
  const wrong = gradeCloze(other, second.key, wrongChoice, T0);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.answer, second.answer);
  assert.ok(other.cards[second.key].due - T0 <= 15 * MINUTE, 'a missed word comes back soon');
});

test('the French deck has A1-B1 levels and its own cards', () => {
  const fr = createStudyState('fr');
  assert.equal(fr.lang, 'fr');
  assert.equal(fr.level, 'A1');
  assert.deepEqual(levelsFor('fr'), ['A1', 'A2', 'B1']);
  assert.equal(deckSize('fr', 'A1'), 1070);

  const queue = buildQueue(fr, T0);
  assert.equal(queue.length, 10);
  assert.ok(queue.every((card) => card.key.startsWith('fr:')));
  assert.ok(queue[0].m, 'French cards carry an English definition');
  // The client must send `key`, not `w`: French keys are prefixed, so sending
  // the bare word would come back as "card not in this deck".
  assert.notEqual(queue[0].key, queue[0].w);
  assert.ok(queue[0].key.startsWith('fr:'));
  assert.equal('p' in queue[0], false, 'no pinyin on French cards');

  const graded = gradeCard(fr, queue[0].key, 'good', T0);
  assert.equal(graded.ok, true);
  assert.equal(fr.reviewedToday, 1);

  // A Chinese card is not part of the French deck.
  assert.equal(gradeCard(fr, '的', 'good', T0).ok, false);
});

test('switching language resets the level but keeps both decks apart', () => {
  const study = createStudyState('zh');
  const [zhCard] = buildQueue(study, T0);
  gradeCard(study, zhCard.key, 'good', T0);

  assert.equal(setStudyLang(study, 'fr').ok, true);
  assert.equal(study.lang, 'fr');
  assert.equal(study.level, 'A1');
  assert.equal(levelProgress(study).length, 3);
  assert.equal(study.cards[zhCard.key].reps, 1, 'Chinese progress is kept');

  assert.equal(setStudyLevel(study, 'B1').ok, true);
  assert.equal(study.level, 'B1');
  assert.equal(setStudyLevel(study, '1').ok, false);

  assert.equal(setStudyLang(study, 'de').ok, false);

  const restored = sanitizeStudyState({ lang: 'fr', level: 'A2', cards: { 'fr:maison': { interval: 2 } } });
  assert.equal(restored.lang, 'fr');
  assert.equal(restored.level, 'A2');
  assert.ok(restored.cards['fr:maison']);
});
