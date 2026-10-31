/**
 * The ClickUp widget's data, and the ClickUp tasks the Agenda shows: the owner's tasks from
 * /api/clickup (api/clickup.js), read with the same key as /api/calendar. Pure apart from the fetches,
 * so clickup-check can drive `clickupView` and `agendaTasks` directly.
 */
import { localDay } from './agenda';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Ask the server for the tasks due by the end of the coming week. Never throws: every outcome is a
 * status the widget can say plainly.
 *
 * @returns {Promise<{status: 'ok', tasks: object[], timer: object | null} | {status: 'rejected' | 'unconfigured' | 'error' | 'limited'}>}
 */
export async function fetchClickup(key, day, timeZone = zone()) {
  try {
    const res = await fetch(`/api/clickup?${new URLSearchParams({ tz: timeZone, date: day })}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (res.status === 401) return { status: 'rejected' };
    if (res.status === 429) return { status: 'limited' };
    if (!res.ok) return { status: 'error' };
    const body = await res.json();
    if (!body.configured) return { status: 'unconfigured' };
    return { status: 'ok', tasks: Array.isArray(body.tasks) ? body.tasks : [], timer: body.timer ?? null };
  } catch {
    return { status: 'error' };
  }
}

/** One request serves the ClickUp widget and the Agenda: answers younger than 10 s are shared. */
let shared = { at: 0, sig: '', promise: null };
export function fetchClickupShared(key, day) {
  const sig = `${key}|${day}`;
  if (!shared.promise || shared.sig !== sig || Date.now() - shared.at > 10_000) {
    shared = { at: Date.now(), sig, promise: fetchClickup(key, day) };
  }
  return shared.promise;
}

/** The next read must ask ClickUp again: a task was just completed or a timer changed. */
export const forgetClickup = () => { shared = { at: 0, sig: '', promise: null }; };

/**
 * Complete a task, or start or stop its timer. Resolves to `{ ok: true, timer? }` or
 * `{ ok: false, error }` with a sentence the widget can show.
 */
export async function clickupAction(key, body) {
  forgetClickup();
  try {
    const res = await fetch('/api/clickup', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const answer = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, timer: answer.timer ?? null };
    return { ok: false, error: typeof answer.error === 'string' ? answer.error.slice(0, 120) : 'ClickUp didn’t take that.' };
  } catch {
    return { ok: false, error: 'ClickUp unreachable.' };
  }
}

/**
 * Where a task sits on `now`'s day: `overdue` (its due moment, or its whole due day for an untimed one,
 * has passed), `today`, or `later`. Tasks with no due date can't come back from the server's window,
 * but are `later` if they do.
 */
export function dueBucket(task, now) {
  if (!task.due) return 'later';
  const due = new Date(task.due);
  const today = localDay(now);
  const day = localDay(due);
  if (day < today || (day === today && task.dueTime && due.getTime() < now.getTime())) return 'overdue';
  return day === today ? 'today' : 'later';
}

const BUCKET_ORDER = { overdue: 0, today: 1, later: 2 };

/**
 * The widget's list: overdue first, then today, then the week ahead; within each, by due moment and
 * then by priority (urgent first, unset last). The running timer's task is marked.
 */
export function clickupView(tasks, now, timer = null) {
  return tasks
    .map((t) => ({ ...t, bucket: dueBucket(t, now), running: Boolean(timer && timer.taskId === t.id) }))
    .sort((a, b) =>
      BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket]
      || (a.due ?? '').localeCompare(b.due ?? '')
      || (a.priority ?? 5) - (b.priority ?? 5)
      || a.name.localeCompare(b.name));
}

/**
 * ClickUp tasks as Agenda events for `day`: a task due at a set time today becomes a moment in the
 * timeline (start = end = its due time); one due today with no time joins the all-day line. Overdue
 * and later tasks stay in the ClickUp widget.
 */
export function agendaTasks(tasks, day) {
  return tasks
    .filter((t) => t.due && localDay(new Date(t.due)) === day)
    .map((t) => ({
      title: t.name,
      start: t.due,
      end: t.due,
      allDay: !t.dueTime,
      task: { id: t.id, url: t.url },
    }));
}
