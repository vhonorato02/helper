import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number.parseInt(process.env.SMOKE_PORT ?? '3100', 10);
const baseUrl = `http://localhost:${port}`;
const timeoutMs = 45_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(processRef) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (processRef.exitCode !== null) {
      throw new Error(`next dev exited early with code ${processRef.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (response.status === 200) return;
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`server did not become ready at ${baseUrl}`);
}

async function runChecks() {
  const loginResponse = await fetch(`${baseUrl}/login`);
  const loginHtml = await loginResponse.text();
  assert(loginResponse.status === 200, 'login should render');
  assert(loginHtml.includes('Helper'), 'login should include product name');
  assert(loginHtml.includes('name="username"'), 'login should include username field');
  assert(loginHtml.includes('name="password"'), 'login should include password field');

  const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`, { redirect: 'manual' });
  const manifestBody = await manifestResponse.text();
  const manifest = JSON.parse(manifestBody);
  assert(manifestResponse.status === 200, 'manifest should be public');
  assert(
    manifestResponse.headers.get('content-type')?.includes('application/manifest+json'),
    'manifest should return manifest JSON',
  );
  assert(manifestBody.includes('icons'), 'manifest should include icons');
  assert(manifest.name === 'Helper', 'manifest should expose Helper as the app name');
  assert(manifest.short_name === 'Helper', 'manifest should expose Helper as the short name');

  for (const assetPath of ['/favicon.svg', '/icon-192.png', '/sw.js']) {
    const assetResponse = await fetch(`${baseUrl}${assetPath}`, { redirect: 'manual' });
    assert(assetResponse.status === 200, `${assetPath} should be public`);
  }

  const publicHubResponse = await fetch(`${baseUrl}/solicitar`);
  const publicHubHtml = await publicHubResponse.text();
  assert(publicHubResponse.status === 200, 'public request hub should render without login');
  assert(publicHubHtml.includes('Reservar Chromebooks'), 'public request hub should include Chromebooks');

  const protectedResponse = await fetch(`${baseUrl}/tickets?page=abc&status=bad`, {
    redirect: 'manual',
  });
  const protectedLocation = protectedResponse.headers.get('location') ?? '';
  assert([302, 307].includes(protectedResponse.status), 'protected page should redirect');
  const loginUrl = new URL(protectedLocation, baseUrl);
  assert(loginUrl.pathname === '/login', 'redirect should use the login page');
  assert(loginUrl.searchParams.has('callbackUrl'), 'redirect should preserve the callback URL');
  assert(!loginUrl.searchParams.has('page'), 'redirect should not leak page filters as login params');

  const bootstrapResponse = await fetch(`${baseUrl}/api/admin/bootstrap`, { method: 'POST' });
  assert(bootstrapResponse.status === 401, 'bootstrap should reject missing bearer token');
}

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://user:password@example.neon.tech/dbname?sslmode=require',
      DATABASE_TIMEOUT_MS: process.env.DATABASE_TIMEOUT_MS ?? '1000',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'smoke-test-secret-with-32-characters',
      BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ?? 'smoke-bootstrap-secret',
      CRON_SECRET: process.env.CRON_SECRET ?? 'smoke-cron-secret',
      APP_URL: baseUrl,
      NEXT_PUBLIC_SITE_URL: baseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer(child);
  await runChecks();
  console.log('Smoke tests passed.');
} catch (error) {
  console.error(output.slice(-4000));
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill();
}
