import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const emailRoute = readFileSync(new URL('../src/app/api/admin/test-email/route.ts', import.meta.url), 'utf8');
const bootstrapRoute = readFileSync(new URL('../src/app/api/admin/bootstrap/route.ts', import.meta.url), 'utf8');

describe('administrative HTTP route boundaries', () => {
  it('forbids side-effectful email delivery via GET', () => {
    assert.doesNotMatch(emailRoute, /export async function GET\(/);
    assert.match(emailRoute, /export async function POST\(/);
  });

  it('refuses bootstrap after an active administrator exists', () => {
    assert.match(bootstrapRoute, /hasValidBearerToken\(req\.headers\.get\('authorization'\), bootstrapSecret\)/);
    assert.match(bootstrapRoute, /eq\(users\.isAdmin, true\)/);
    assert.match(bootstrapRoute, /eq\(users\.isActive, true\)/);
    assert.match(bootstrapRoute, /if \(activeAdmin\)/);
    assert.match(bootstrapRoute, /bootstrap_already_completed/);
  });
});
