import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  addChat,
  bondInfo,
  createRoom,
  joinRoom,
  markOffline,
  normalizeCode,
  performAction,
  placeMark,
  publicRoom,
  requestRematch,
  tickRoom,
} from './game.js';

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
