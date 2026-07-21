import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getPublicAppUrl, normalizeUrl } from '@/lib/app-url';

describe('public app url helpers', () => {
  afterEach(() => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  it('normalizes hostnames and trailing slashes', () => {
    assert.equal(normalizeUrl('helperpinda.vercel.app/'), 'https://helperpinda.vercel.app');
    assert.equal(normalizeUrl('https://helperpinda.vercel.app///'), 'https://helperpinda.vercel.app');
    assert.equal(normalizeUrl('   '), null);
  });

  it('uses APP_URL only when explicitly requested', () => {
    process.env.APP_URL = 'https://app.example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'site.example.com';

    assert.equal(getPublicAppUrl(), 'https://site.example.com');
    assert.equal(getPublicAppUrl({ includeAppUrl: true }), 'https://app.example.com');
  });

  it('falls back through Vercel URL variables', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'helperpinda.vercel.app';
    process.env.VERCEL_URL = 'preview.vercel.app';

    assert.equal(getPublicAppUrl(), 'https://helperpinda.vercel.app');
  });
});
