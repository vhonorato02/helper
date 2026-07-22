import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('admin user form accessibility', () => {
  it('exposes create-user errors as form-level alerts', () => {
    const content = source('src/app/configuracoes/create-user-form.tsx');

    assert.match(content, /aria-busy=\{isPending\}/);
    assert.match(content, /aria-describedby=\{errorId\}/);
    assert.match(content, /id="create-user-error"/);
    assert.match(content, /role="alert"/);
  });

  it('exposes edit-user errors as form-level alerts', () => {
    const content = source('src/app/configuracoes/edit-user-dialog.tsx');

    assert.match(content, /aria-busy=\{isPending\}/);
    assert.match(content, /aria-describedby=\{errorId\}/);
    assert.match(content, /edit-user-\$\{user\.id\}-error/);
    assert.match(content, /role="alert"/);
  });
});
