/**
 * shot — render the running dev server in headless Chrome and capture real pixels.
 *
 * Why this exists: the in-app Browser pane never composites (`document.hidden` is permanently true
 * and requestAnimationFrame never fires), so framer-motion's `AnimatePresence mode="wait"` never
 * resolves its exit and the app is stuck on the pre-boot screen forever. Computed styles can still
 * be read there, but nothing can be *seen* and no interaction past the first gate lands. Every
 * visual claim about this project up to now has been a measurement, never a look.
 *
 * Drives CDP over a raw WebSocket — no puppeteer, no devDependency. Needs the flag:
 *
 *     node --experimental-websocket scripts/shot.mjs [outDir]
 *
 * Requires a `google-chrome` binary and a dev server (override with APP=http://localhost:PORT).
 *
 * The app state is set by importing the store module straight out of Vite's dev module registry —
 * `import('/src/store/osStore.js')` returns the SAME live instance the app is using — so a colorway
 * or icon theme can be applied without walking the Settings UI 80 times.
 *
 * IMPORTANT: point this at a FRESHLY STARTED dev server. Once Vite has pushed an HMR update it
 * rewrites importers to `osStore.js?t=<stamp>`, and that query string is a different module URL —
 * so a plain `import('/src/store/osStore.js')` silently evaluates the file a SECOND time and hands
 * back a second, unsubscribed store. Everything still resolves and returns plausible values; the
 * DOM just never reacts. Verify with the instance check before trusting a run:
 *
 *     setState({colorway:'honey-vivid'}) → document.documentElement.dataset.colorway === 'honey-vivid'
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] || 'shots';
const PORT = 9333;
const APP = process.env.APP || 'http://localhost:5173';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── minimal CDP client ─────────────────────────────────────────────────────────────────────── */

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); }

  static async connect(url) {
    const ws = new WebSocket(url);
    const cdp = new CDP(ws);
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      const p = cdp.pending.get(msg.id);
      if (!p) return;
      cdp.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    });
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * Evaluate in the page and return the JSON value. Awaits promises.
   *
   * Retries "Promise was collected", which is what CDP reports when the execution context is torn
   * down mid-await — Vite forces a full page reload the first time it pre-bundles deps after a
   * server restart, and that lands right where the first eval runs.
   */
  async eval(expression, attempt = 0) {
    let r;
    try {
      r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    } catch (e) {
      if (attempt < 3 && /Promise was collected|Execution context/.test(String(e))) {
        await sleep(2500);
        return this.eval(expression, attempt + 1);
      }
      throw e;
    }
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  }
}

/* ── launch ─────────────────────────────────────────────────────────────────────────────────── */

async function launch() {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1440,900',
    '--force-device-scale-factor=1',
    'about:blank',
  ], { stdio: 'ignore' });

  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return { chrome, wsUrl: page.webSocketDebuggerUrl };
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not expose a debugging target');
}

/* ── the run ────────────────────────────────────────────────────────────────────────────────── */

const SET_STATE = (patch) => `
  import('/src/store/osStore.js').then(m => {
    m.default.setState(${JSON.stringify(patch)});
    return 'ok';
  })`;

/** Skip boot + login by calling the store action directly rather than animating through two gates. */
const LOGIN = `
  import('/src/store/osStore.js').then(m => {
    const s = m.default.getState();
    if (!s.isAuthenticated) s.login('guest');
    return m.default.getState().isAuthenticated;
  })`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const { chrome, wsUrl } = await launch();
  const cdp = await CDP.connect(wsUrl);

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });

    await cdp.send('Page.navigate', { url: APP });
    // App.jsx runs its own BootSequence before LoginScreen; give both a moment, then bypass.
    await sleep(8000);
    const loggedIn = await cdp.eval(LOGIN);
    console.log('logged in:', loggedIn);
    await sleep(1200);

    // Fail loudly on the forked-module trap described in the header. Without this the run produces
    // a full set of confident, entirely wrong screenshots: every setState resolves, every probe
    // returns a plausible value, and the pixels show whatever the app happened to be on.
    await cdp.eval(SET_STATE({ colorway: 'garden-dawn' }));
    await sleep(400);
    const stamped = await cdp.eval("document.documentElement.getAttribute('data-colorway')");
    if (stamped !== 'garden-dawn') {
      throw new Error(
        `store instance is not the one React subscribed to (DOM says "${stamped}").\n`
        + 'Vite has HMR-stamped the module graph. Restart the dev server and re-run.',
      );
    }

    const shots = JSON.parse(process.env.SHOTS || '[]');
    for (const s of shots) {
      await cdp.eval(SET_STATE(s.state));
      await sleep(s.settle ?? 900);
      if (s.script) await cdp.eval(s.script);
      await sleep(s.after ?? 700);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = join(OUT, `${s.name}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));
      console.log('wrote', file);
    }

    if (process.env.PROBE) {
      const out = await cdp.eval(process.env.PROBE);
      console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
    }
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
