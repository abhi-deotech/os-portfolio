/**
 * Turns the sparse calendar in githubSnapshot.json into the dense week grid the heatmap draws.
 *
 * The snapshot stores only days that HAVE contributions — 269 pairs instead of 365 mostly-zero
 * entries, which is a third of the payload. Everything the grid needs to put those days back in
 * their right cells (the date range, the quartile thresholds) travels with them, so densifying is
 * a pure function of the snapshot and can be verified without a browser.
 *
 * Two rules the layout depends on:
 *   - Columns are ISO weeks starting SUNDAY, matching GitHub's own grid, so the weekday rows line
 *     up with the month labels a reader expects.
 *   - The first and last columns are padded with nulls rather than zeroes. A null renders as
 *     nothing; a zero renders as an empty-but-present cell. Confusing the two makes the map look
 *     like it starts with a week of inactivity.
 */

/** Local-noon parse: sidesteps the DST/timezone shifts that make date-only strings drift a day. */
const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** count -> 0..4. Level 0 means "no contributions", never "a few". */
export const levelFor = (count, thresholds) => {
  if (!count) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
};

/**
 * @returns {{ weeks: ({date:string,count:number,level:number}|null)[][],
 *             months: {label:string,column:number}[] }}
 *          `weeks` is column-major: weeks[w][0] is that column's Sunday.
 */
export function buildGrid(calendar) {
  if (!calendar?.from || !calendar?.to) return { weeks: [], months: [] };

  const counts = new Map(calendar.active ?? []);
  const thresholds = calendar.thresholds ?? [1, 2, 3];

  const start = parseISO(calendar.from);
  const end = parseISO(calendar.to);
  // Back up to the Sunday on or before `from` so column 0 is a whole week.
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  const months = [];
  let cursor = new Date(start);
  let lastMonth = -1;

  while (cursor <= end) {
    const column = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const iso = toISO(cursor);
      // Outside the reported range: pad, don't invent a zero-contribution day.
      if (iso < calendar.from || iso > calendar.to) column.push(null);
      else {
        const count = counts.get(iso) ?? 0;
        column.push({ date: iso, count, level: levelFor(count, thresholds) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Label a column with its month when the month changes, and only once it has room for the
    // text — a label on the final column would overflow the viewBox.
    const first = column.find(Boolean);
    if (first) {
      const month = parseISO(first.date).getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        months.push({
          label: parseISO(first.date).toLocaleString('en-US', { month: 'short' }),
          column: weeks.length,
        });
      }
    }
    weeks.push(column);
  }

  return { weeks, months };
}

/** Every real (non-padding) day, oldest first — the shape streak maths expects. */
export const flattenDays = (grid) =>
  grid.weeks.flat().filter(Boolean).map((d) => ({ date: d.date, contributionCount: d.count }));
