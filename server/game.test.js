import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  addChat,
  bondInfo,
  createRoom,
  detachSocket,
  joinRoom,
  markOffline,
  normalizeCode,
  parseMusicLink,
  applyPersonal,
  changeNote,
  performAction,
  performStudyGrade,
  performStudyLevelChange,
  placeMark,
  publicRoom,
  requestRematch,
  setOutfit,
  settleActivity,
  startActivity,
  tickRoom,
  vacateSeat,
} from './game.js';
import {
  DEFAULT_OUTFITS as SERVER_OUTFITS,
  OUTFIT_IDS,
  isValidOutfit as serverIsValidOutfit,
} from './outfits.js';
import {
  DISHES as SERVER_DISHES,
  GROCERY_BATCH,
  GROCERY_MS,
  INGREDIENTS,
  ROOM_TASKS,
  TASK_BY_ID,
  activityDoneKey,
  activityDuration,
  activityStartKey,
  emptyPantry,
  parseActivityId,
} from './activities.js';
import {
  BEAR_OUTFITS,
  DEFAULT_OUTFITS as CLIENT_OUTFITS,
  FISH_OUTFITS,
  isValidOutfit as clientIsValidOutfit,
  sanitizeOutfits,
} from '../src/utils/wardrobe.js';
import {
  DISHES as CLIENT_DISHES,
  PANTRY_ITEMS,
  activityTitleKey,
  dishOptions,
  tasksForRoom,
} from '../src/utils/activityCatalog.js';
import {
  DATE_BEATS,
  DATE_CATALOG,
  DATE_ENDS,
  GESTURES,
  MOMENT_LINES,
  PERIODS,
  ROOMS,
  buildDateMenu,
  dateProgression,
  roomForDate,
} from '../src/utils/dateCatalog.js';
import { messages } from '../src/i18n.js';

const T0 = 1_700_000_000_000;
const HOST_TOKEN = 'host-token-1234';
const GUEST_TOKEN = 'guest-token-1234';

function roomWithPair(now = T0) {
  const room = createRoom('ABCD', now);
  const host = joinRoom(room, { name: '小满', token: HOST_TOKEN, now });
  const guest = joinRoom(room, { name: '阿远', token: GUEST_TOKEN, now });
  assert.equal(host.ok, true);
  assert.equal(guest.ok, true);
  return { room, host, guest };
}

test('creates a room with two seats and joins each side once', () => {
  const room = createRoom('ABCD', T0);
  const host = joinRoom(room, { name: '  小满  ', token: HOST_TOKEN, now: T0 });
  const guest = joinRoom(room, { name: '阿远', token: GUEST_TOKEN, now: T0 });
  assert.equal(host.seat, 'host');
  assert.equal(guest.seat, 'guest');
  assert.equal(room.seats.host.name, '小满');
  assert.equal(room.seats.host.online, true);

  const third = joinRoom(room, { name: '路人', token: 'third-token-1234', now: T0 });
  assert.deepEqual(third, { ok: false, error: 'full' });
});

test('reconnects with the same token instead of taking a third seat', () => {
  const { room } = roomWithPair();
  markOffline(room, 'guest', T0 + 1000);
  const again = joinRoom(room, { name: '阿远', token: GUEST_TOKEN, now: T0 + 2000 });
  assert.equal(again.ok, true);
  assert.equal(again.seat, 'guest');
  assert.equal(again.reconnected, true);
  assert.equal(room.seats.guest.online, true);
});

test('a second device with the same name shares the seat', () => {
  const { room } = roomWithPair();
  const phone = joinRoom(room, { name: '小满', token: 'host-phone-5678', now: T0 + 100 });
  assert.equal(phone.ok, true);
  assert.equal(phone.seat, 'host');
  assert.equal(phone.reconnected, true);
  assert.equal(room.seats.host.online, true);

  // The partner can still take the guest seat afterwards.
  const partner = joinRoom(room, { name: '阿远', token: 'guest-phone-5678', now: T0 + 150 });
  assert.equal(partner.seat, 'guest');
});

test('a seat stays online until its last device disconnects', () => {
  const { room } = roomWithPair();
  const phoneSock = {};
  const laptopSock = {};
  room.seats.host.sockets.push(phoneSock, laptopSock);

  assert.equal(detachSocket(room, 'host', phoneSock, T0 + 200), true);
  assert.equal(room.seats.host.online, true, 'the laptop is still connected');
  assert.equal(room.seats.host.sockets.length, 1);

  assert.equal(detachSocket(room, 'host', laptopSock, T0 + 300), true);
  assert.equal(room.seats.host.online, false, 'the last device just left');
  assert.equal(room.seats.host.sockets.length, 0);
  assert.equal(room.seats.host.name, '小满', 'the seat keeps the name for rejoining');
});

test('normalizes shared room codes and links', () => {
  assert.equal(normalizeCode('abcd'), 'ABCD');
  assert.equal(normalizeCode(' abcd '), 'ABCD');
  assert.equal(normalizeCode('http://localhost:8787/?room=W7K2'), 'W7K2');
  assert.equal(normalizeCode('nope'), '');
});

test('actions change stats and respect a shared cooldown', () => {
  const { room } = roomWithPair();
  const before = { ...room.stats };
  const first = performAction(room, 'host', 'feed', T0 + 100);
  assert.equal(first.ok, true);
  assert.equal(room.stats.fullness, Math.min(100, before.fullness + ACTIONS.feed.effects.fullness));
  assert.equal(room.stats.bond, ACTIONS.feed.effects.bond);

  const tooSoon = performAction(room, 'guest', 'feed', T0 + 200);
  assert.equal(tooSoon.ok, false);
  assert.equal(tooSoon.error, 'cooldown');

  const later = performAction(room, 'guest', 'feed', T0 + 100 + ACTIONS.feed.cooldown);
  assert.equal(later.ok, true);
  assert.equal(room.log.length, 2);
  assert.equal(room.log[0].name, '阿远');
  assert.equal(room.log[0].action, 'feed');
});

test('fishy dates and gestures warm the bond through the same actions', () => {
  const { room } = roomWithPair();
  const beforeBond = room.stats.bond;
  const beforeFullness = room.stats.fullness;

  const cook = performAction(room, 'host', 'cook', T0 + 100);
  assert.equal(cook.ok, true);
  assert.equal(room.stats.bond, beforeBond + ACTIONS.cook.effects.bond);
  assert.equal(room.stats.fullness, Math.min(100, beforeFullness + ACTIONS.cook.effects.fullness));

  const kiss = performAction(room, 'guest', 'fishKiss', T0 + 150);
  assert.equal(kiss.ok, true);
  assert.equal(room.stats.bond, beforeBond + ACTIONS.cook.effects.bond + ACTIONS.fishKiss.effects.bond);

  // Dates share the same cooldown machinery as care actions.
  const tooSoon = performAction(room, 'guest', 'cook', T0 + 200);
  assert.equal(tooSoon.error, 'cooldown');

  // Unknown ids are still rejected.
  assert.equal(performAction(room, 'host', 'nope', T0 + 300).ok, false);
});

test('stats decay while someone is online and pause while empty', () => {
  const { room } = roomWithPair();
  room.stats = { fullness: 80, mood: 80, energy: 80, bond: 0 };
  room.lastTick = T0;
  assert.equal(tickRoom(room, T0 + 10_000), true);
  assert.ok(Math.abs(room.stats.fullness - 79.5) < 0.001);
  assert.ok(Math.abs(room.stats.energy - 79.7) < 0.001);
  assert.ok(Math.abs(room.stats.mood - 79.92) < 0.001);
  assert.ok(Math.abs(room.stats.bond - 0.1) < 0.001);

  markOffline(room, 'host', T0 + 10_000);
  markOffline(room, 'guest', T0 + 10_000);
  const frozen = { ...room.stats };
  tickRoom(room, T0 + 120_000);
  assert.deepEqual(room.stats, frozen);
});

test('plays a full tic-tac-toe round and alternates the starter', () => {
  const { room } = roomWithPair();
  const moves = [
    ['host', 0],
    ['guest', 3],
    ['host', 1],
    ['guest', 4],
    ['host', 2],
  ];
  for (const [seat, index] of moves) {
    const result = placeMark(room, seat, index, T0 + 100);
    assert.equal(result.ok, true);
  }
  assert.equal(room.game.winner, 'host');
  assert.deepEqual(room.game.line, [0, 1, 2]);
  assert.equal(room.game.scores.host, 1);

  const blocked = placeMark(room, 'guest', 5, T0 + 200);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'finished');

  assert.equal(requestRematch(room, 'guest', T0 + 300).ok, true);
  assert.equal(room.game.round, 2);
  assert.equal(room.game.starter, 'guest');
  assert.equal(room.game.turn, 'guest');
  assert.equal(room.game.scores.host, 1);
});

test('refuses moves when the partner is away or it is not your turn', () => {
  const { room } = roomWithPair();
  markOffline(room, 'guest', T0 + 10);
  const waiting = placeMark(room, 'host', 0, T0 + 20);
  assert.equal(waiting.error, 'waiting');

  room.seats.guest.online = true;
  const notTurn = placeMark(room, 'guest', 0, T0 + 30);
  assert.equal(notTurn.error, 'not_turn');
});

test('sanitizes chat and enforces a short anti-spam window', () => {
  const { room } = roomWithPair();
  const first = addChat(room, 'host', { text: '  晚安\u0000呀  ', emote: '🌙' }, T0 + 1000);
  assert.equal(first.ok, true);
  assert.equal(first.message.text, '晚安呀');
  assert.equal(first.message.emote, '🌙');

  const tooFast = addChat(room, 'host', { text: '再一句' }, T0 + 1100);
  assert.equal(tooFast.ok, false);

  const empty = addChat(room, 'guest', { text: '   ' }, T0 + 2000);
  assert.equal(empty.ok, false);
});

test('publishes a safe snapshot without tokens', () => {
  const { room } = roomWithPair();
  const state = publicRoom(room, T0 + 500);
  assert.equal(state.code, 'ABCD');
  assert.equal(state.players.host.name, '小满');
  assert.equal(JSON.stringify(state).includes(HOST_TOKEN), false);
  assert.equal(typeof state.serverTime, 'number');
  assert.equal(state.bond.level, 1);
  const joinMessage = state.chat.find((message) => message.kind === 'system');
  assert.equal(joinMessage.event, 'join');
  assert.equal(joinMessage.data.name, '阿远');
  assert.equal('text' in joinMessage, false);
});

test('maps bond points onto numbered levels', () => {
  assert.equal(bondInfo(0).level, 1);
  assert.equal(bondInfo(29).level, 1);
  assert.equal(bondInfo(30).level, 2);
  assert.equal(bondInfo(90).level, 3);
  assert.equal(bondInfo(180).level, 4);
  assert.equal(bondInfo(320).level, 5);
  assert.equal(bondInfo(320).progress, 1);
  assert.equal('name' in bondInfo(30), false);
});

test('gives each seat its own vocabulary deck', () => {
  const { room, host } = roomWithPair();

  const mine = performStudyGrade(room, 'host', '的', 'good', T0 + 1000);
  assert.equal(mine.ok, true);
  assert.equal(room.personal.host.study.reviewedToday, 1);
  assert.equal(room.personal.guest.study.reviewedToday, 0);

  const view = publicRoom(room, T0 + 1000, 'host');
  assert.equal(view.study.level, 1);
  assert.equal(view.study.today.reviewed, 1);
  assert.equal(view.study.partner.name, '阿远');
  assert.equal(view.study.partner.reviewed, 0);
  assert.equal('queue' in view.study.partner, false, 'partner view stays a summary');

  // The other seat sees their own (still untouched) deck.
  const theirs = publicRoom(room, T0 + 1000, 'guest');
  assert.equal(theirs.study.today.reviewed, 0);
  assert.equal(theirs.study.partner.reviewed, 1);

  // Without a seat there is no private data to leak.
  assert.equal(publicRoom(room, T0 + 1000).study, null);
  assert.equal(JSON.stringify(view).includes(host.token), false);
});

test('finishing the daily goal warms the bear and tells the room', () => {
  const { room } = roomWithPair();
  const words = publicRoom(room, T0, 'host').study.queue.map((card) => card.w);

  const beforeBond = room.stats.bond;
  for (const word of words) performStudyGrade(room, 'host', word, 'good', T0 + 1000);

  assert.ok(room.stats.bond > beforeBond, 'bond should grow');
  const event = room.chat.find((message) => message.event === 'studyGoal');
  assert.ok(event, 'a system message marks the milestone');
  assert.equal(event.data.name, '小满');
  assert.equal('studyTogether' in event, false);
});

test('rejects cards from another level and bad grades', () => {
  const { room } = roomWithPair();
  assert.equal(performStudyLevelChange(room, 'host', 2, T0).ok, true);
  assert.equal(room.personal.host.study.level, 2);

  // 的 is HSK 1, so it is not part of the HSK 2 deck any more.
  assert.equal(performStudyGrade(room, 'host', '的', 'good', T0).error, 'unknown_card');
  assert.equal(performStudyGrade(room, 'host', '把', 'perfect', T0).error, 'invalid_grade');
  assert.equal(performStudyLevelChange(room, 'host', 99, T0).ok, false);
});

test('a seat that is vacated starts over with a clean deck', () => {
  const { room } = roomWithPair();
  performStudyGrade(room, 'guest', '的', 'good', T0 + 1000);
  assert.equal(room.personal.guest.study.reviewedToday, 1);

  vacateSeat(room, 'guest', T0 + 2000);
  assert.equal(room.personal.guest.study.reviewedToday, 0);
  assert.deepEqual(room.personal.guest.study.cards, {});
  assert.equal(room.personal.guest.study.level, 1);
});

test('own cards jump the queue and can be graded', () => {
  const { room } = roomWithPair();
  const added = changeNote(
    room,
    'host',
    'add',
    { w: '抱抱', p: 'bào bào', m: 'to hug', note: 'TA 教我的', study: true },
    T0 + 100,
  );
  assert.equal(added.ok, true);
  assert.equal(added.notes.length, 1);

  const view = publicRoom(room, T0 + 100, 'host').study;
  assert.equal(view.myCards, 1);
  assert.equal(view.queue[0].w, '抱抱');
  assert.equal(view.queue[0].custom, true);

  const graded = performStudyGrade(room, 'host', view.queue[0].key, 'good', T0 + 200);
  assert.equal(graded.ok, true);
  assert.equal(room.personal.host.study.reviewedToday, 1);

  // The partner never sees the other player's own cards.
  const partner = publicRoom(room, T0 + 200, 'guest').study;
  assert.equal(partner.myCards, 0);
  assert.equal(partner.partner.myCards, 1);
});

test('notes can be edited, flipped into the deck, and removed', () => {
  const { room } = roomWithPair();
  const added = changeNote(room, 'host', 'add', { w: '月亮', p: 'yuè liang', m: 'moon' }, T0);
  const id = added.note.id;

  const edited = changeNote(room, 'host', 'update', { id, w: '月亮', p: 'yuè liang', m: 'the moon', note: '今晚很圆' }, T0 + 1);
  assert.equal(edited.note.m, 'the moon');
  assert.equal(edited.created, false);
  assert.equal(edited.notes.length, 1);

  const on = changeNote(room, 'host', 'study', { id, study: true }, T0 + 2);
  assert.equal(on.note.study, true);
  assert.ok(publicRoom(room, T0 + 2, 'host').study.queue.some((card) => card.w === '月亮'));

  const removed = changeNote(room, 'host', 'remove', { id }, T0 + 3);
  assert.equal(removed.ok, true);
  assert.equal(removed.notes.length, 0);
  assert.ok(!publicRoom(room, T0 + 3, 'host').study.queue.some((card) => card.w === '月亮'));
});

test('a browser copy of personal data is adopted unless it is older', () => {
  const { room } = roomWithPair();
  const saved = {
    savedAt: T0 + 5000,
    study: { level: 2, cards: {}, streak: 4, lastDay: '2023-11-14', reviewedToday: 3, newToday: 1 },
    notes: [{ id: 'nabc1234', w: '咖啡', p: 'kā fēi', m: 'coffee', study: true }],
  };

  const first = applyPersonal(room, 'host', saved, T0 + 5000);
  assert.equal(first.adopted, true);
  assert.equal(room.personal.host.study.level, 2);
  assert.equal(room.personal.host.notes.length, 1);

  const stale = applyPersonal(room, 'host', { savedAt: T0 + 1000, study: { level: 5 }, notes: [] }, T0 + 6000);
  assert.equal(stale.adopted, false);
  assert.equal(room.personal.host.study.level, 2, 'an older tab cannot roll progress back');

  const raw = publicRoom(room, T0 + 6000, 'host', { includePersonal: true }).study.personal;
  assert.equal(raw.study.level, 2);
  assert.equal(raw.notes[0].w, '咖啡');
});

test('junk in a personal payload is dropped instead of trusted', () => {
  const { room } = roomWithPair();
  applyPersonal(
    room,
    'guest',
    {
      savedAt: T0 + 10,
      study: { level: 99, streak: -5, cards: { '不存在的词': { interval: 3 }, '的': { interval: 99999, ease: 99 } } },
      notes: [{ nope: true }, { w: '好', m: 'good' }],
    },
    T0 + 10,
  );

  const personal = room.personal.guest;
  assert.equal(personal.study.level, 1);
  assert.equal(personal.study.streak, 0);
  assert.deepEqual(Object.keys(personal.study.cards), ['的']);
  assert.equal(personal.study.cards['的'].interval, 365);
  assert.equal(personal.notes.length, 1);
  assert.equal(personal.notes[0].w, '好');
});

test('turns a NetEase share link into a player card', () => {
  const { room } = roomWithPair();

  const alone = addChat(room, 'host', { text: '  https://music.163.com/song?id=1234567  ' }, T0 + 1000);
  assert.equal(alone.ok, true);
  assert.deepEqual(alone.message.music, {
    provider: 'netease',
    kind: 'song',
    id: '1234567',
    url: 'https://music.163.com/song?id=1234567',
  });
  assert.equal(alone.message.text, '', 'the raw link is replaced by the card');

  const withWords = addChat(room, 'guest', { text: '听这个 https://y.music.163.com/m/song?id=88&uct2=x' }, T0 + 2000);
  assert.equal(withWords.message.text, '听这个');
  assert.equal(withWords.message.music.id, '88');

  // Other links and broken ids stay plain text.
  assert.equal(parseMusicLink('https://example.com/song?id=1'), null);
  assert.equal(parseMusicLink('https://music.163.com/song?id=abc'), null);
  const plain = addChat(room, 'host', { text: 'https://example.com/watch?v=1' }, T0 + 3000);
  assert.equal(plain.message.music, undefined);
  assert.equal(plain.message.text, 'https://example.com/watch?v=1');
});

test('parses mobile, hash and path style shares', () => {
  assert.equal(parseMusicLink('https://music.163.com/#/playlist?id=789').kind, 'playlist');
  assert.equal(parseMusicLink('https://music.163.com/album/321').id, '321');
  assert.equal(parseMusicLink('https://y.music.163.com/m/song?id=456').id, '456');
});

test('every Fishy interaction is a real server action with two translations', () => {
  const langs = ['zh', 'en'];
  for (const item of [...GESTURES, ...DATE_CATALOG]) {
    assert.ok(ACTIONS[item.id], `server is missing ACTIONS.${item.id}`);
    for (const lang of langs) {
      const dict = messages[lang];
      assert.ok(dict[`fish.${item.id}`], `${lang} missing fish.${item.id}`);
      assert.ok(dict[`action.${item.id}.verb`], `${lang} missing action.${item.id}.verb`);
      if (DATE_CATALOG.includes(item)) {
        assert.ok(dict[`fish.dateLine.${item.id}`], `${lang} missing fish.dateLine.${item.id}`);
      } else {
        assert.ok(dict[`fish.gestureLine.${item.id}`], `${lang} missing fish.gestureLine.${item.id}`);
      }
    }
  }
});

test('rooms, periods and random date lines all have copy in both languages', () => {
  const keys = [];
  for (const room of ROOMS) {
    keys.push(room.labelKey, `house.tip.${room.id}`);
  }
  for (const period of PERIODS) {
    keys.push(`house.period.${period}`, ...MOMENT_LINES[period]);
  }
  keys.push(...DATE_BEATS, ...DATE_ENDS, 'house.title', 'fish.suggested');
  for (const lang of ['zh', 'en']) {
    for (const key of keys) {
      assert.ok(messages[lang][key], `${lang} missing ${key}`);
    }
  }
});

test('each hour and room offers four different dates that belong to that hour', () => {
  for (const period of PERIODS) {
    for (const room of ROOMS) {
      const menu = buildDateMenu({ period, roomId: room.id });
      assert.equal(menu.items.length, 4, `${period}/${room.id} should offer four dates`);
      assert.equal(new Set(menu.items.map((item) => item.id)).size, 4);
      for (const item of menu.items) {
        assert.ok(item.periods.includes(period), `${item.id} does not belong to ${period}`);
      }
      assert.ok(menu.suggested, `${period}/${room.id} should suggest something`);
    }
  }
});

test('a date plays three beats and stays in the room when the room fits', () => {
  const beats = dateProgression('cook');
  assert.equal(beats.length, 3);
  assert.equal(beats[0], 'fish.dateLine.cook');
  assert.equal(roomForDate('cook', 'kitchen'), 'kitchen');
  assert.equal(roomForDate('cook', 'rooftop'), 'kitchen');
  assert.equal(roomForDate('sunrise', 'garden'), 'garden');
});

test('every new date action grows bond and respects its own cooldown', () => {
  for (const date of DATE_CATALOG) {
    const { room } = roomWithPair();
    const first = performAction(room, 'host', date.id, T0 + 1000);
    assert.equal(first.ok, true, `${date.id} should be performable`);
    assert.ok(ACTIONS[date.id].effects.bond > 0, `${date.id} should grow bond`);
    const again = performAction(room, 'host', date.id, T0 + 2000);
    assert.equal(again.error, 'cooldown', `${date.id} should have a cooldown`);
  }
});

test('the wardrobe catalog and the server whitelist agree, with copy for every outfit', () => {
  assert.deepEqual(OUTFIT_IDS.bear, BEAR_OUTFITS.map((outfit) => outfit.id));
  assert.deepEqual(OUTFIT_IDS.fish, FISH_OUTFITS.map((outfit) => outfit.id));
  assert.deepEqual(CLIENT_OUTFITS, SERVER_OUTFITS);

  for (const [who, ids] of Object.entries(OUTFIT_IDS)) {
    for (const id of ids) {
      assert.ok(serverIsValidOutfit(who, id), `server rejects ${who}/${id}`);
      assert.ok(clientIsValidOutfit(who, id), `client rejects ${who}/${id}`);
    }
  }
  assert.equal(serverIsValidOutfit('bear', 'skater'), false);
  assert.equal(clientIsValidOutfit('fish', 'cozy'), false);
  assert.deepEqual(sanitizeOutfits({ bear: 'nope', fish: 'pjs' }), { bear: 'cozy', fish: 'pjs' });

  const keys = ['wardrobe.log.bear', 'wardrobe.log.fish', 'wardrobe.title', 'wardrobe.sub'];
  for (const outfit of [...BEAR_OUTFITS, ...FISH_OUTFITS]) keys.push(outfit.labelKey);
  for (const lang of ['zh', 'en']) {
    for (const key of keys) assert.ok(messages[lang][key], `${lang} missing ${key}`);
  }
});

test('every dish, ingredient and chore has copy in both languages', () => {
  const roomIds = new Set(ROOMS.map((room) => room.id));
  assert.deepEqual([...Object.keys(ROOM_TASKS)].sort(), [...roomIds].sort());

  const keys = [
    'activity.title', 'activity.sub', 'activity.shared', 'activity.free', 'activity.idle',
    'activity.busy', 'activity.busyButton', 'activity.almostDone', 'activity.by',
    'activity.remaining', 'activity.elsewhere', 'activity.cookTitle', 'activity.cookHint',
    'activity.marketTitle', 'activity.choreTitle', 'activity.choreHint', 'activity.batch',
    'activity.buyHint', 'activity.cookButton', 'activity.groceryButton', 'activity.choreButton',
    'activity.ready', 'activity.missing', 'activity.goMarket', 'activity.reward',
    'activity.choreNote', 'activity.pantry', 'activity.pantryHint', 'activity.foot',
    'activity.groceryTitle', 'activity.unknown', 'pantry.unknown',
    'toast.activityBusy', 'toast.activityIngredients',
    'action.outfitChange.verb', 'action.activityStart.verb', 'action.activityDone.verb',
  ];

  for (const dish of SERVER_DISHES) {
    keys.push(`dish.${dish.id}`);
    keys.push(activityStartKey(`cook:${dish.id}`), activityDoneKey(`cook:${dish.id}`));
    keys.push(activityStartKey(`grocery:${dish.id}`), activityDoneKey(`grocery:${dish.id}`));
  }
  for (const task of Object.values(TASK_BY_ID)) {
    keys.push(`task.${task.id}`, `activity.${task.id}.hint`);
    keys.push(activityStartKey(task.id), activityDoneKey(task.id));
  }
  for (const item of PANTRY_ITEMS) keys.push(item.labelKey);
  for (const option of [...dishOptions('cook'), ...dishOptions('grocery')]) {
    keys.push(activityTitleKey(option.id));
  }
  for (const roomId of roomIds) {
    for (const task of tasksForRoom(roomId)) keys.push(activityTitleKey(task.id), task.labelKey);
  }

  assert.deepEqual(PANTRY_ITEMS.map((item) => item.id), INGREDIENTS);
  assert.deepEqual(CLIENT_DISHES.map((dish) => dish.id), SERVER_DISHES.map((dish) => dish.id));
  for (const lang of ['zh', 'en']) {
    for (const key of keys) assert.ok(messages[lang][key], `${lang} missing ${key}`);
  }
});

test('outfits are shared state, validated, and logged with their own key', () => {
  const { room } = roomWithPair();
  assert.deepEqual(room.outfits, SERVER_OUTFITS);
  assert.deepEqual(publicRoom(room, T0).outfits, SERVER_OUTFITS);

  const first = setOutfit(room, 'guest', 'fish', 'chef', T0 + 1000);
  assert.equal(first.changed, true);
  assert.equal(publicRoom(room, T0 + 1000).outfits.fish, 'chef');
  assert.equal(room.log[0].action, 'outfitChange');
  assert.equal(room.log[0].verbKey, 'wardrobe.log.fish');

  assert.equal(setOutfit(room, 'host', 'fish', 'chef', T0 + 2000).unchanged, true);
  assert.deepEqual(setOutfit(room, 'host', 'fish', 'nope', T0 + 3000), { ok: false, error: 'invalid_outfit' });
  assert.deepEqual(setOutfit(room, 'host', 'stranger', 'chef', T0 + 3000), { ok: false, error: 'invalid_outfit' });
  assert.deepEqual(setOutfit(room, 'third', 'bear', 'knit', T0 + 3000), { ok: false, error: 'invalid' });

  assert.equal(setOutfit(room, 'host', 'bear', 'knit', T0 + 4000).ok, true);
  assert.equal(room.log[0].verbKey, 'wardrobe.log.bear');
  assert.equal(room.stats.bond, 0, 'changing clothes never touches the stats');
  assert.deepEqual(room.outfits, { bear: 'knit', fish: 'chef' });
});

test('a chore belongs to its room and blocks other actions while it runs', () => {
  const { room } = roomWithPair();
  assert.deepEqual(room.pantry, emptyPantry());
  assert.equal(startActivity(room, 'host', 'bathTime', 'bedroom', T0 + 1000).error, 'wrong_room');
  assert.equal(startActivity(room, 'host', 'cook:nope', 'kitchen', T0 + 1000).error, 'invalid_activity');
  assert.equal(startActivity(room, 'third', 'tidy', 'living', T0 + 1000).error, 'invalid');

  const started = startActivity(room, 'host', 'bathTime', 'bath', T0 + 1000);
  assert.equal(started.ok, true);
  assert.equal(room.activity.endsAt, T0 + 1000 + activityDuration('bathTime'));
  assert.equal(room.log[0].verbKey, 'activity.bathTime.start');
  assert.equal(publicRoom(room, T0 + 1000).activity.id, 'bathTime');

  assert.equal(performAction(room, 'guest', 'pet', T0 + 2000).error, 'busy');
  assert.equal(startActivity(room, 'guest', 'tidy', 'living', T0 + 2000).error, 'busy');
  assert.equal(settleActivity(room, T0 + 2000), false);

  assert.equal(settleActivity(room, room.activity.endsAt), true);
  assert.equal(room.activity, null);
  assert.equal(room.log[0].action, 'activityDone');
  assert.equal(room.log[0].verbKey, 'activity.bathTime.done');
  assert.ok(room.stats.energy > 70, 'the bath restores energy when it ends');
  assert.equal(performAction(room, 'guest', 'pet', T0 + 60_000).ok, true);
});

test('tickRoom settles a finished chore even if nobody clicks', () => {
  const { room } = roomWithPair();
  const started = startActivity(room, 'host', 'tidy', 'living', T0);
  assert.equal(started.ok, true);
  assert.equal(tickRoom(room, started.activity.endsAt + 10), true);
  assert.equal(room.activity, null);
  assert.equal(room.log[0].verbKey, 'activity.tidy.done');
  assert.equal(publicRoom(room, started.activity.endsAt + 20).activity, null);
});

test('a grocery run stocks the pantry and cooking spends it, then rewards the pair', () => {
  const { room } = roomWithPair();
  assert.equal(startActivity(room, 'host', 'cook:tomatoEgg', 'kitchen', T0 + 1000).error, 'missing_ingredients');
  assert.equal(room.pantry.tomato, 0);

  const trip = startActivity(room, 'host', 'grocery:tomatoEgg', 'market', T0 + 1000);
  assert.equal(trip.ok, true);
  assert.equal(room.activity.endsAt, T0 + 1000 + GROCERY_MS);
  assert.equal(room.log[0].verbKey, 'activity.grocery.tomatoEgg.start');

  assert.equal(settleActivity(room, T0 + 1000 + GROCERY_MS), true);
  assert.equal(room.pantry.tomato, GROCERY_BATCH);
  assert.equal(room.pantry.egg, 2 * GROCERY_BATCH);
  assert.equal(room.log[0].verbKey, 'activity.grocery.tomatoEgg.done');

  const bondBefore = room.stats.bond;
  const cook = startActivity(room, 'guest', 'cook:tomatoEgg', 'kitchen', T0 + 1000 + GROCERY_MS);
  assert.equal(cook.ok, true);
  assert.equal(room.pantry.tomato, GROCERY_BATCH - 1, 'ingredients are spent when the pan heats up');
  assert.equal(room.pantry.egg, 2 * GROCERY_BATCH - 2);
  assert.equal(room.stats.bond, bondBefore, 'the reward waits for the timer');

  assert.equal(settleActivity(room, cook.activity.endsAt), true);
  assert.ok(room.stats.bond > bondBefore);
  assert.equal(room.log[0].verbKey, 'activity.cook.tomatoEgg.done');
  assert.equal(parseActivityId('cook:tomatoEgg').room, 'kitchen');
  assert.equal(parseActivityId('grocery:tomatoEgg').room, 'market');
  assert.equal(parseActivityId('tidy').kind, 'task');
});
