/**
 * Manual end-to-end check for the 4-device feature (2 people x 2 devices).
 * Run with the server up:  node scripts/verify-multidevice.mjs [port]
 */
import WebSocket from 'ws';

const PORT = process.argv[2] || '8787';
const URL = `ws://localhost:${PORT}/ws`;
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures += 1;
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const inbox = [];
    ws.on('message', (raw) => {
      inbox.push(JSON.parse(String(raw)));
    });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    ws.inbox = inbox;
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

const states = (ws) => ws.inbox.filter((m) => m.type === 'state').map((m) => m.room);
const latest = (ws) => {
  const list = states(ws);
  return list[list.length - 1] ?? null;
};

const wsLaptop = await connect();
send(wsLaptop, { type: 'create', name: '小满', token: 'laptop-token-12345' });
await settle(300);
const joinedLaptop = wsLaptop.inbox.find((m) => m.type === 'joined');
const code = joinedLaptop?.code;
check('laptop joins as host', joinedLaptop?.seat === 'host', `seat=${joinedLaptop?.seat}`);

const wsPhone = await connect();
send(wsPhone, { type: 'join', code, name: '小满', token: 'phone-token-123456' });
await settle(300);
const joinedPhone = wsPhone.inbox.find((m) => m.type === 'joined');
check(
  'phone (same name, new token) shares the host seat',
  joinedPhone?.seat === 'host',
  `seat=${joinedPhone?.seat}`,
);

const wsPartner = await connect();
send(wsPartner, { type: 'join', code, name: '阿远', token: 'partner-token-12345' });
await settle(300);
const joinedPartner = wsPartner.inbox.find((m) => m.type === 'joined');
check('partner takes the guest seat', joinedPartner?.seat === 'guest', `seat=${joinedPartner?.seat}`);

const wsPartnerPhone = await connect();
send(wsPartnerPhone, { type: 'join', code, name: '阿远', token: 'partner-phone-123456' });
await settle(500);
const joinedPartnerPhone = wsPartnerPhone.inbox.find((m) => m.type === 'joined');
check(
  'partner phone shares the guest seat',
  joinedPartnerPhone?.seat === 'guest',
  `seat=${joinedPartnerPhone?.seat}`,
);

// 4 devices connected. The latest state should show 2 devices per seat.
const fourWay = latest(wsLaptop);
check(
  'header shows 2 devices per seat',
  fourWay?.players?.host?.devices === 2 && fourWay?.players?.guest?.devices === 2,
  `host=${fourWay?.players?.host?.devices} guest=${fourWay?.players?.guest?.devices}`,
);
check('together is true with 4 devices', fourWay?.together === true);

// Close the laptop socket: host seat must STAY online (phone still there).
wsLaptop.close();
await settle(600);
const afterLaptopClose = latest(wsPhone);
check(
  'host stays online after laptop closes',
  afterLaptopClose?.players?.host?.online === true,
  `host.online=${afterLaptopClose?.players?.host?.online}`,
);
check(
  'host device count drops to 1',
  afterLaptopClose?.players?.host?.devices === 1,
  `devices=${afterLaptopClose?.players?.host?.devices}`,
);
check('together stays true', afterLaptopClose?.together === true);

// Phone can still act (pet) — the message guard accepts any socket of the seat.
const logBefore = latest(wsPartner)?.log?.length ?? 0;
send(wsPhone, { type: 'action', action: 'pet' });
await settle(500);
const logAfter = latest(wsPartner)?.log?.length ?? 0;
check('phone can perform actions on the shared seat', logAfter > logBefore, `log ${logBefore} -> ${logAfter}`);

// Partner closes BOTH devices: guest goes offline.
wsPartner.close();
await settle(300);
wsPartnerPhone.close();
await settle(600);
const afterPartnerGone = latest(wsPhone);
check(
  'guest goes offline after both partner devices close',
  afterPartnerGone?.players?.guest?.online === false,
  `guest.online=${afterPartnerGone?.players?.guest?.online}`,
);

wsPhone.close();
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
