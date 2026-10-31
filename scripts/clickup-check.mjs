#!/usr/bin/env node
/**
 * clickup-check — proves the wallpaper's ClickUp link: the Vercel function and the widget logic.
 *
 * Part 1 calls api/clickup.js's GET and POST with real Requests against a fake ClickUp served on
 * 127.0.0.1 (CLICKUP_API_BASE): the key gate, input validation, the unconfigured answer, what a task
 * becomes, the due window and assignee filter it asks ClickUp for, the running timer, ClickUp's 401 and
 * 429, "complete" moving a task to its list's closed status, "start" stopping a running timer first,
 * a bad task id never reaching ClickUp, and the token never appearing in any response.
 *
 * Part 2 drives src/wallpaper/clickup.js: which bucket a task is in at a minute, the widget's order,
 * and which tasks the Agenda shows; and that the `cu` switch survives the Plash URL round trip.
 *
 *   npm run clickup:check
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer as createVite } from 'vite';
import { GET, POST } from '../api/clickup.js';

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};

/* ── Part 1: the function, against a fake ClickUp ──────────────────────────── */

const TOKEN = 'pk_42_SECRETSECRETSECRET';
const KEY = 'wallpaper-key-for-check';

const fake = {
  calls: [],
  status: 200, // what every answer returns; flipped to test 401 / 429
  timer: null, // the running time entry, or null
  taskStatus: { t1: 'to do' },
};
const TASKS = [
  {
    id: 't1', name: 'Ship the report', status: { status: 'in progress', color: '#5f55ee' },
    due_date: String(Date.UTC(2026, 9, 30, 9, 30)), due_date_time: true,
    priority: { id: '2', priority: 'high', orderindex: '2' }, url: 'https://app.clickup.com/t/t1', list: { id: 'L1', name: 'Sprint' },
  },
  {
    id: 't2', name: 'Expense claim', status: { status: 'to do', color: 'javascript:alert(1)' },
    due_date: null, due_date_time: false, priority: null, url: 'https://evil.example/t2', list: { id: 'L1', name: 'Sprint' },
  },
];

const server = createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  fake.calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
  const send = (obj) => { res.writeHead(fake.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(fake.status === 200 ? obj : { err: `token ${TOKEN}` })); };
  const path = req.url.split('?')[0];
  if (path === '/user') return send({ user: { id: 42, username: 'owner' } });
  if (path === '/team') return send({ teams: [{ id: '900', name: 'Day job' }, { id: '901', name: 'Other' }] });
  if (path === '/team/900/task') return send({ tasks: TASKS });
  if (path === '/team/900/time_entries/current') return send({ data: fake.timer });
  if (path === '/team/900/time_entries/stop') { fake.timer = null; return send({ data: {} }); }
  if (path === '/team/900/time_entries/start') {
    fake.timer = { id: 'te1', start: String(Date.UTC(2026, 9, 30, 8)), duration: -5, task: { id: JSON.parse(body).tid, name: 'Ship the report' } };
    return send({ data: fake.timer });
  }
  if (path === '/task/t1' && req.method === 'GET') return send({ id: 't1', list: { id: 'L1' } });
  if (path === '/task/t1' && req.method === 'PUT') { fake.taskStatus.t1 = JSON.parse(body).status; return send({ id: 't1' }); }
  if (path === '/list/L1') return send({ statuses: [{ status: 'to do', type: 'open' }, { status: 'review', type: 'custom' }, { status: 'complete', type: 'closed' }] });
  res.writeHead(404); res.end('{}');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
process.env.CLICKUP_API_BASE = `http://127.0.0.1:${server.address().port}`;

const auth = { authorization: `Bearer ${KEY}` };
const get = (query, headers = auth) => GET(new Request(`https://wall.example/api/clickup?${query}`, { headers }));
const post = (body, headers = auth) => POST(new Request('https://wall.example/api/clickup', {
  method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
}));
const read = async (res) => ({ status: res.status, body: await res.json(), text: '' });
const leaks = [];
const watch = async (resP) => {
  const res = await resP;
  const text = await res.clone().text();
  if (text.includes(TOKEN) || text.includes('SECRET')) leaks.push(text);
  return read(res);
};

delete process.env.WALLPAPER_KEY;
eq('no WALLPAPER_KEY on the server → 500', (await watch(get('tz=UTC'))).status, 500);
process.env.WALLPAPER_KEY = KEY;
eq('no key → 401', (await watch(get('tz=UTC', {}))).status, 401);
eq('wrong key → 401', (await watch(get('tz=UTC', { authorization: 'Bearer nope' }))).status, 401);
eq('POST wrong key → 401', (await watch(post({ action: 'stop' }, { authorization: 'Bearer nope' }))).status, 401);
eq('bad tz → 400', (await watch(get('tz=Mars/Base'))).status, 400);
eq('bad date → 400', (await watch(get('tz=UTC&date=30-10-2026'))).status, 400);

delete process.env.CLICKUP_TOKEN;
eq('no token → configured:false', (await watch(get('tz=UTC&date=2026-10-30'))).body, { configured: false, date: '2026-10-30', tasks: [], timer: null });
eq('POST with no token → 409', (await watch(post({ action: 'stop' }))).status, 409);
eq('nothing reached ClickUp without a token', fake.calls.length, 0);

process.env.CLICKUP_TOKEN = TOKEN;
const ok = await watch(get('tz=Asia/Kolkata&date=2026-10-30'));
eq('GET → 200', ok.status, 200);
eq('task 1 as the widget sees it', ok.body.tasks[0], {
  id: 't1', name: 'Ship the report', status: 'in progress', color: '#5f55ee', due: '2026-10-30T09:30:00.000Z',
  dueTime: true, priority: 2, url: 'https://app.clickup.com/t/t1', list: 'Sprint',
});
eq('task 2: no due, a smuggled colour and a foreign url are dropped', ok.body.tasks[1], {
  id: 't2', name: 'Expense claim', status: 'to do', color: null, due: null, dueTime: false, priority: null, url: null, list: 'Sprint',
});
eq('no timer → null', ok.body.timer, null);
const taskCall = fake.calls.find((c) => c.url.startsWith('/team/900/task'));
const tq = new URL(taskCall.url, 'http://x').searchParams;
eq('reads the first Workspace when CLICKUP_TEAM_ID is unset', Boolean(taskCall), true);
eq('asks only for tasks assigned to the token owner', tq.getAll('assignees[]'), ['42']);
// Kolkata is +05:30: the end of 2026-11-07 there (start of the 8th) is 2026-11-06T18:30Z.
eq('due window ends with the 7th day after today, in the given zone', tq.get('due_date_lt'), String(Date.UTC(2026, 10, 6, 18, 30)));
eq('subtasks included', tq.get('subtasks'), 'true');
eq('the token goes to ClickUp as the Authorization header', taskCall.auth, TOKEN);

const userCalls = fake.calls.filter((c) => c.url === '/user').length;
await watch(get('tz=UTC&date=2026-10-30'));
eq('who-am-I is asked once per warm instance', fake.calls.filter((c) => c.url === '/user').length, userCalls);

fake.timer = { id: 'te0', start: String(Date.UTC(2026, 9, 30, 7)), duration: -100, task: { id: 't2', name: 'Expense claim' } };
eq('running timer', (await watch(get('tz=UTC&date=2026-10-30'))).body.timer, { taskId: 't2', name: 'Expense claim', start: '2026-10-30T07:00:00.000Z' });

fake.calls = [];
const started = await watch(post({ action: 'start', taskId: 't1' }));
eq('start → 200 with the new timer', started.body, { ok: true, timer: { taskId: 't1', name: 'Ship the report', start: '2026-10-30T08:00:00.000Z' } });
eq('start stops the running timer first', fake.calls.map((c) => `${c.method} ${c.url.split('?')[0]}`), [
  'GET /team/900/time_entries/current', 'POST /team/900/time_entries/stop', 'POST /team/900/time_entries/start',
]);
eq('start sends the task id as tid', fake.calls.at(-1).body, { tid: 't1' });

fake.calls = [];
eq('stop → timer null', (await watch(post({ action: 'stop' }))).body, { ok: true, timer: null });
fake.calls = [];
await watch(post({ action: 'stop' }));
eq('stop with nothing running asks, and stops nothing', fake.calls.map((c) => c.url.split('?')[0]), ['/team/900/time_entries/current']);

fake.calls = [];
eq('complete → 200', (await watch(post({ action: 'complete', taskId: 't1' }))).body, { ok: true });
eq('complete moves the task to its list’s closed status', fake.taskStatus.t1, 'complete');
eq('complete: task, list, then the update', fake.calls.map((c) => `${c.method} ${c.url}`), ['GET /task/t1', 'GET /list/L1', 'PUT /task/t1']);

fake.calls = [];
eq('bad action → 400', (await watch(post({ action: 'delete', taskId: 't1' }))).status, 400);
eq('path-smuggling task id → 400', (await watch(post({ action: 'complete', taskId: '../team/900' }))).status, 400);
eq('non-string task id → 400', (await watch(post({ action: 'start', taskId: 7 }))).status, 400);
eq('not JSON → 400', (await watch(post('{nope'))).status, 400);
eq('none of those reached ClickUp', fake.calls.length, 0);

fake.status = 429;
eq('ClickUp 429 → 429', (await watch(get('tz=UTC&date=2026-10-30'))).status, 429);
fake.status = 401;
const rejected = await watch(get('tz=UTC&date=2026-10-30'));
eq('ClickUp 401 → 502 naming the token, not quoting ClickUp', [rejected.status, rejected.body.error], [502, 'ClickUp rejected CLICKUP_TOKEN']);
fake.status = 200;

process.env.CLICKUP_TEAM_ID = '901';
process.env.CLICKUP_TOKEN = `${TOKEN}x`; // a new token → who-am-I again
await watch(get('tz=UTC&date=2026-10-30'));
eq('CLICKUP_TEAM_ID picks the Workspace', fake.calls.some((c) => c.url.startsWith('/team/901/task')), true);

eq('the token never appears in a response', leaks.length, 0);
server.close();

/* ── Part 2: the widget logic ───────────────────────────────────────────────── */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const vite = await createVite({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { dueBucket, clickupView, agendaTasks } = await vite.ssrLoadModule('/src/wallpaper/clickup.js');
const { agendaView } = await vite.ssrLoadModule('/src/wallpaper/agenda.js');
const { buildWallpaperSearch, readWallpaperMode } = await vite.ssrLoadModule('/src/wallpaper/config.js');

// Local wall-clock times, so the check reads the same in any zone it runs in.
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m);
const NOW = at(30, 11);
const task = (id, due, dueTime, priority = null) => ({ id, name: id, due: due && due.toISOString(), dueTime, priority, url: null });

eq('due yesterday → overdue', dueBucket(task('a', at(29, 15), true), NOW), 'overdue');
eq('due earlier today, timed → overdue', dueBucket(task('a', at(30, 9), true), NOW), 'overdue');
eq('due today, untimed → today (all day long)', dueBucket(task('a', at(30, 4), false), NOW), 'today');
eq('due later today → today', dueBucket(task('a', at(30, 16), true), NOW), 'today');
eq('due tomorrow → later', dueBucket(task('a', at(31, 9), true), NOW), 'later');
eq('no due → later', dueBucket(task('a', null, false), NOW), 'later');

const list = [
  task('tomorrow', at(31, 9), true, 1),
  task('today-low', at(30, 16), true, 4),
  task('today-urgent', at(30, 16), true, 1),
  task('overdue', at(28, 9), true),
  task('today-untimed', at(30, 4), false),
];
eq('order: overdue, today by time then priority, later', clickupView(list, NOW).map((t) => t.id), ['overdue', 'today-untimed', 'today-urgent', 'today-low', 'tomorrow']);
eq('running timer marks its task', clickupView(list, NOW, { taskId: 'tomorrow' }).filter((t) => t.running).map((t) => t.id), ['tomorrow']);

const day = '2026-10-30';
const ev = agendaTasks(list, day);
eq('Agenda takes only tasks due today', ev.map((e) => e.title).sort(), ['today-low', 'today-untimed', 'today-urgent']);
eq('untimed task → all-day line', ev.find((e) => e.title === 'today-untimed').allDay, true);
const view = agendaView([...ev, { title: 'Standup', start: at(30, 12).toISOString(), end: at(30, 12, 15).toISOString(), allDay: false }], NOW, 5);
eq('Agenda: untimed task in the all-day line', view.allDay, ['today-untimed']);
eq('Agenda: meeting first, then the due moments', view.rows.map((r) => [r.title, r.kind, Boolean(r.task)]), [
  ['Standup', 'next', false], ['today-low', 'later', true], ['today-urgent', 'later', true],
]);

const back = readWallpaperMode(buildWallpaperSearch({ clickup: true, widgets: ['clickup', 'agenda'] }), false).prefs;
eq('round trip: cu switch', back.clickup, true);
eq('round trip: clickup widget id kept', back.widgets, ['clickup', 'agenda']);
eq('cu absent → off', readWallpaperMode(buildWallpaperSearch({}), false).prefs.clickup, false);
await vite.close();

console.log(`\nclickup-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
