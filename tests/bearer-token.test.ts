import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasValidBearerToken,
  parseBearerToken,
  secureTokenEquals,
} from '@/lib/bearer-token';

describe('bearer token helpers', () => {
  it('parses a bearer token without accepting malformed headers', () => {
    assert.equal(parseBearerToken('Bearer secret-token'), 'secret-token');
    assert.equal(parseBearerToken('bearer   secret-token'), 'secret-token');
    assert.equal(parseBearerToken('Basic secret-token'), null);
    assert.equal(parseBearerToken('Bearer'), null);
    assert.equal(parseBearerToken('Bearer token extra'), null);
    assert.equal(parseBearerToken(null), null);
  });

  it('compares tokens without exposing raw secrets', () => {
    assert.equal(secureTokenEquals('secret-token', 'secret-token'), true);
    assert.equal(secureTokenEquals('secret-token', 'different-token'), false);
    assert.equal(secureTokenEquals('', 'secret-token'), false);
    assert.equal(secureTokenEquals('secret-token', ''), false);
  });

  it('validates authorization headers against an expected secret', () => {
    assert.equal(hasValidBearerToken('Bearer cron-secret', 'cron-secret'), true);
    assert.equal(hasValidBearerToken('Bearer cron-secret', 'bootstrap-secret'), false);
    assert.equal(hasValidBearerToken('Basic cron-secret', 'cron-secret'), false);
  });
});
