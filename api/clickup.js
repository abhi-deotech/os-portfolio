// GET  /api/clickup?tz=Asia/Kolkata[&date=YYYY-MM-DD]
//   The owner's open ClickUp tasks due by the end of the coming week (overdue ones included), and the
//   timer running now, if any.
// POST /api/clickup  { action: 'complete', taskId } | { action: 'start', taskId } | { action: 'stop' }
//
// CLICKUP_TOKEN is the owner's personal API token (pk_…): it acts as them in every Workspace they
// belong to, so it lives only in Vercel env vars and the endpoint answers only callers that send
// WALLPAPER_KEY, like /api/calendar. CLICKUP_TEAM_ID picks the Workspace; without it, the first one.
import { addDays, isValidTimeZone, localDate, zonedToEpoch } from './_lib/ics.js';
import { json, keyRejection } from './_lib/key.js';

const FETCH_TIMEOUT_MS = 8000;
// Overridable so clickup-check can stand a fake ClickUp up on 127.0.0.1.
const apiBase = () => process.env.CLICKUP_API_BASE || 'https://api.clickup.com/api/v2';
const DAYS_AHEAD = 7;
// ClickUp's own task ids: lowercase letters and digits. Anything else never reaches a ClickUp path.
const TASK_ID = /^[a-z0-9]{1,32}$/i;

class ClickUpError extends Error {
  constructor(status) {
    super(`ClickUp answered HTTP ${status}`);
    this.status = status;
  }
}

async function clickup(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: { authorization: process.env.CLICKUP_TOKEN, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new ClickUpError(0);
  }
  if (!res.ok) throw new ClickUpError(res.status);
  return res.json();
}

// Short fixed reasons only: nothing ClickUp says (its body could quote the request) is echoed back.
function failure(err) {
  if (!(err instanceof ClickUpError)) return json(502, { error: 'ClickUp sent an unexpected answer' });
  if (err.status === 401) return json(502, { error: 'ClickUp rejected CLICKUP_TOKEN' });
  if (err.status === 429) return json(429, { error: 'ClickUp rate limit reached; try again in a minute' });
  if (err.status === 0) return json(502, { error: 'ClickUp unreachable' });
  return json(502, { error: `ClickUp answered HTTP ${err.status}` });
}

// Who the token belongs to and which Workspace to read. Neither changes while a function instance is
// warm, so they are asked once per token rather than on every poll (ClickUp allows 100 calls a minute).
let identity = { token: null, promise: null };
function whoAmI() {
  const token = process.env.CLICKUP_TOKEN;
  if (identity.token !== token) {
    const promise = Promise.all([clickup('/user'), process.env.CLICKUP_TEAM_ID ? null : clickup('/team')]).then(([u, t]) => {
      const teamId = process.env.CLICKUP_TEAM_ID || t?.teams?.[0]?.id;
      if (!u?.user?.id || !teamId) throw new Error('no user or workspace');
      return { userId: String(u.user.id), teamId: String(teamId) };
    });
    identity = { token, promise };
    promise.catch(() => { if (identity.promise === promise) identity = { token: null, promise: null }; });
  }
  return identity.promise;
}

const msToIso = (ms) => {
  const n = Number(ms);
  return ms != null && ms !== '' && Number.isFinite(n) ? new Date(n).toISOString() : null;
};

/** One ClickUp task → only what the widgets show. */
function readTask(t) {
  const priority = Number(t.priority?.orderindex ?? t.priority?.id);
  return {
    id: String(t.id),
    name: String(t.name ?? '').slice(0, 200),
    status: String(t.status?.status ?? ''),
    color: /^#[0-9a-f]{3,8}$/i.test(t.status?.color ?? '') ? t.status.color : null,
    due: msToIso(t.due_date),
    dueTime: t.due_date_time === true,
    // ClickUp's 1 urgent · 2 high · 3 normal · 4 low; null when unset.
    priority: priority >= 1 && priority <= 4 ? priority : null,
    url: /^https:\/\/app\.clickup\.com\//.test(t.url ?? '') ? t.url : null,
    list: String(t.list?.name ?? ''),
  };
}

function readTimer(data) {
  if (!data || !data.task?.id) return null;
  return { taskId: String(data.task.id), name: String(data.task.name ?? '').slice(0, 200), start: msToIso(data.start) };
}

export async function GET(request) {
  const rejected = keyRejection(request);
  if (rejected) return rejected;

  const url = new URL(request.url);
  const timeZone = url.searchParams.get('tz') || 'UTC';
  if (!isValidTimeZone(timeZone)) return json(400, { error: 'Unknown time zone' });
  const date = url.searchParams.get('date') || localDate(Date.now(), timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: 'date must be YYYY-MM-DD' });
  if (!process.env.CLICKUP_TOKEN) return json(200, { configured: false, date, tasks: [], timer: null });

  const [year, month, day] = addDays(date, DAYS_AHEAD + 1).split('-').map(Number);
  const before = zonedToEpoch({ year, month, day }, timeZone);

  try {
    const { userId, teamId } = await whoAmI();
    const q = new URLSearchParams({ order_by: 'due_date', subtasks: 'true', due_date_lt: String(before) });
    q.append('assignees[]', userId);
    const [list, current] = await Promise.all([
      clickup(`/team/${teamId}/task?${q}`),
      clickup(`/team/${teamId}/time_entries/current?assignee=${userId}`),
    ]);
    const tasks = (Array.isArray(list?.tasks) ? list.tasks : []).map(readTask);
    return json(200, { configured: true, date, tasks, timer: readTimer(current?.data) });
  } catch (err) {
    return failure(err);
  }
}

/** The task's list's first "closed" status: what ClickUp's own "Mark complete" moves it to. */
async function closedStatus(taskId) {
  const task = await clickup(`/task/${taskId}`);
  const list = await clickup(`/list/${task?.list?.id}`);
  const closed = (list?.statuses ?? []).find((s) => s.type === 'closed');
  return closed ? closed.status : null;
}

export async function POST(request) {
  const rejected = keyRejection(request);
  if (rejected) return rejected;
  if (!process.env.CLICKUP_TOKEN) return json(409, { error: 'CLICKUP_TOKEN is not set on the server' });

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Body must be JSON' });
  }
  const action = body?.action;
  const taskId = body?.taskId;
  if (!['complete', 'start', 'stop'].includes(action)) return json(400, { error: 'action must be complete, start or stop' });
  if (action !== 'stop' && (typeof taskId !== 'string' || !TASK_ID.test(taskId))) return json(400, { error: 'taskId is not a ClickUp task id' });

  try {
    const { userId, teamId } = await whoAmI();
    if (action === 'complete') {
      const status = await closedStatus(taskId);
      if (!status) return json(409, { error: 'That task’s list has no closed status' });
      await clickup(`/task/${taskId}`, { method: 'PUT', body: { status } });
      return json(200, { ok: true });
    }
    // ClickUp runs one timer per person. Its docs don't say what starting a second one does, so the
    // running one is stopped first, as ClickUp's own app does when you start another.
    const current = readTimer((await clickup(`/team/${teamId}/time_entries/current?assignee=${userId}`))?.data);
    if (current) await clickup(`/team/${teamId}/time_entries/stop`, { method: 'POST' });
    if (action === 'stop') return json(200, { ok: true, timer: null });
    const started = await clickup(`/team/${teamId}/time_entries/start`, { method: 'POST', body: { tid: taskId } });
    return json(200, { ok: true, timer: readTimer(started?.data) });
  } catch (err) {
    return failure(err);
  }
}
