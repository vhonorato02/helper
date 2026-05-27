import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { csvCell, csvRow, csvDocument } from '@/lib/csv';

describe('csv escaping', () => {
  it('wraps plain values in quotes', () => {
    assert.equal(csvCell('hello'), '"hello"');
  });

  it('escapes embedded double quotes', () => {
    assert.equal(csvCell('he said "hi"'), '"he said ""hi"""');
  });

  it('prefixes formula-injection vectors with a single quote', () => {
    assert.equal(csvCell('=cmd|"/c calc"!A1'), `"'=cmd|""/c calc""!A1"`);
    assert.equal(csvCell('+1'), `"'+1"`);
    assert.equal(csvCell('-2'), `"'-2"`);
    assert.equal(csvCell('@sum'), `"'@sum"`);
    assert.equal(csvCell('\tindent'), `"'\tindent"`);
  });

  it('handles null and undefined', () => {
    assert.equal(csvCell(null), '""');
    assert.equal(csvCell(undefined), '""');
  });

  it('joins cells with semicolons', () => {
    assert.equal(csvRow(['a', 'b', 'c']), '"a";"b";"c"');
  });

  it('produces a CRLF-separated document with headers first', () => {
    const doc = csvDocument(['col1', 'col2'], [[1, 2], [3, 4]]);
    assert.equal(doc, '"col1";"col2"\r\n"1";"2"\r\n"3";"4"');
  });
});
