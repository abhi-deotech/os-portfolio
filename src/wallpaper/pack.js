import { WIDGETS, SIZE_PX } from './config';

export const GAP = 12;

/**
 * Widgets → rows → columns, for the wallpaper's widget column.
 *
 * Apple-style rows: a small widget pairs with the next small; anything else takes a row of its own.
 * Rows fill a column top-down, and the first row that would cross `available` starts a new column,
 * which the dashboard places further from the edge. Packed here from known heights rather than with
 * `flex-wrap` on a column container, which does not grow to fit its wrapped columns in every engine.
 *
 * @param {string[]} ids        widget ids, in order
 * @param {number}   available  px from the column's top to the bottom inset
 * @returns {string[][][]}      columns → rows → widget ids
 */
export function packColumns(ids, available) {
  const rows = [];
  let pending = null;
  for (const id of ids) {
    if (WIDGETS[id].size === 'small') {
      if (pending) { rows.push([pending, id]); pending = null; } else { pending = id; }
    } else {
      if (pending) { rows.push([pending]); pending = null; }
      rows.push([id]);
    }
  }
  if (pending) rows.push([pending]);

  const columns = [];
  let used = 0;
  for (const row of rows) {
    const h = SIZE_PX[WIDGETS[row[0]].size].height;
    if (columns.length === 0 || used + GAP + h > available) {
      columns.push([row]);
      used = h;
    } else {
      columns[columns.length - 1].push(row);
      used += GAP + h;
    }
  }
  return columns;
}
