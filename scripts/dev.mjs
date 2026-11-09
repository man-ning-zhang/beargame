import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function launch(label, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  children.push(child);
  child.on('exit', (code) => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`[dev] ${label} exited with code ${code}`);
    }
  });
  return child;
}

console.log('\n🐻  Bear Together — starting API + Vite dev server\n');

launch('api', process.execPath, ['--watch', 'server/index.js']);
launch('vite', npm, ['run', 'dev:client']);

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev] ${signal} received, stopping both processes...`);
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(0), 400);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
