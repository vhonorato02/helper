// Sanitize a CSV cell against formula injection and quote correctly.
// Excel/Sheets execute formulas when a cell starts with =, +, -, @, tab or CR.
// Prefixing with a single quote forces it to be treated as text.
const INJECTION_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const raw = String(value);
  const guarded = INJECTION_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function csvRow(values: ReadonlyArray<unknown>): string {
  return values.map(csvCell).join(';');
}

export function csvDocument(headers: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return [csvRow(headers), ...rows.map(csvRow)].join('\r\n');
}

// UTF-8 BOM helps Excel open Portuguese characters correctly.
export const CSV_BOM = '﻿';
