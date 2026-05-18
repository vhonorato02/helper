import { describe, expect, it } from 'vitest';
import { csvCell, csvRow, csvDocument } from '@/lib/csv';

describe('csv escaping', () => {
  it('wraps plain values in quotes', () => {
    expect(csvCell('hello')).toBe('"hello"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('prefixes formula-injection vectors with a single quote', () => {
    expect(csvCell('=cmd|"/c calc"!A1')).toBe(`"'=cmd|""/c calc""!A1"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('-2')).toBe(`"'-2"`);
    expect(csvCell('@sum')).toBe(`"'@sum"`);
    expect(csvCell('\tindent')).toBe(`"'\tindent"`);
  });

  it('handles null and undefined', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('joins cells with semicolons', () => {
    expect(csvRow(['a', 'b', 'c'])).toBe('"a";"b";"c"');
  });

  it('produces a CRLF-separated document with headers first', () => {
    const doc = csvDocument(['col1', 'col2'], [[1, 2], [3, 4]]);
    expect(doc).toBe('"col1";"col2"\r\n"1";"2"\r\n"3";"4"');
  });
});
