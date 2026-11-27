import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4179;
const CDP_PORT = 9229;
const PREVIEW_URL = `http://127.0.0.1:${PORT}/`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Endpoint did not become ready within ${timeoutMs}ms: ${url}`);
}

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gta-dhaka-smoke-'));
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
  stdio: 'ignore',
});
const chrome = spawn(
  CHROME_PATH,
  [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    PREVIEW_URL,
  ],
  { stdio: 'ignore' }
);

let ws;
try {
  await waitForHttp(PREVIEW_URL);
  const res = await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await res.json();
  const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  assert.ok(pageTarget, 'Expected an open Chrome page target');

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pageExceptions = [];
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      pageExceptions.push(msg.params?.exceptionDetails?.text || 'Unknown exception');
    }
  });

  const cdp = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: PREVIEW_URL });
  await new Promise((r) => setTimeout(r, 2500));

  // If Main Menu renders first, trigger Start/New Game/Continue button via DOM click
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const start = btns.find(b => /New Game|Start|Continue|খেলা শুরু/i.test(b.textContent || ''));
      if (start) start.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1200));

  const check = await cdp('Runtime.evaluate', {
    returnByValue: true,
    expression: `({
      title: document.title,
      canvases: document.querySelectorAll('canvas').length,
      bodyLen: document.body.innerText.length
    })`,
  });
  const val = check?.result?.value;
  assert.ok(val && val.canvases >= 1, `Expected >=1 mounted canvas, got ${JSON.stringify(val)}`);
  assert.equal(pageExceptions.length, 0, `Uncaught page exceptions: ${pageExceptions.join('; ')}`);
  console.log(`SMOKE PASS: title="${val.title}", canvases=${val.canvases}, pageExceptions=0`);
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.kill('SIGKILL');
  await new Promise((r) => setTimeout(r, 250));
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  } catch {
    // Non-fatal temp dir cleanup after process teardown
  }
}
