/**
 * CSV generation shared by every export in the app.
 *
 * Three separate exports each hand-rolled this and each got it wrong in a
 * different way: the budget export did no escaping at all (any category with
 * a comma silently shifted every following column), the RSVP export wrapped
 * fields in quotes without doubling embedded quotes (a guest called
 * `Bob "Bobby" Smith` broke the row), and none of them defused spreadsheet
 * formulas.
 */

/**
 * Defuses spreadsheet formula injection.
 *
 * Guests type their own names, dietary notes and messages, and these files get
 * opened by the couple and the venue coordinator. Excel and Sheets execute any
 * cell beginning with =, +, - or @, so a guest calling themselves
 * `=HYPERLINK("http://evil","click")` runs against the reader's machine.
 * Prefixing an apostrophe forces the cell to render as literal text — the
 * standard mitigation for CWE-1236.
 */
function neutraliseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Escapes one value into a spreadsheet-safe CSV field. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  // Real numbers are never formulas, and they must stay numeric: the budget
  // export writes a variance column that is legitimately negative, and
  // apostrophe-prefixing those turned them into text that Excel won't sum.
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  const safe = neutraliseFormula(String(value));
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Builds a full CSV document from rows of raw values.
 *
 * Uses CRLF line endings, which is what RFC 4180 specifies and what Excel on
 * Windows expects — the couple's own machines.
 */
export function toCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(csvField).join(',')).join('\r\n');
}

/** Triggers a browser download of `content` as a .csv file. */
export function downloadCsv(filename: string, content: string): void {
  // The BOM makes Excel read the file as UTF-8, so accented guest names don't
  // arrive mangled.
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
