import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, devices } from '@playwright/test';

const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '3101', 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const timeoutMs = 60_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`next dev exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseURL}/login`, { redirect: 'manual' });
      if (response.status === 200) return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`server did not become ready at ${baseURL}`);
}

function startServerIfNeeded() {
  if (process.env.PLAYWRIGHT_BASE_URL) return null;

  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://user:password@example.neon.tech/dbname?sslmode=require',
    DATABASE_TIMEOUT_MS: process.env.DATABASE_TIMEOUT_MS ?? '1000',
    AUTH_SECRET: process.env.AUTH_SECRET ?? 'playwright-local-secret-with-32-characters',
    BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ?? 'playwright-bootstrap-secret',
    CRON_SECRET: process.env.CRON_SECRET ?? 'playwright-cron-secret',
    APP_URL: baseURL,
    NEXT_PUBLIC_SITE_URL: baseURL,
  };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;

  return spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

async function expectVisible(locator, message) {
  await locator.waitFor({ state: 'visible', timeout: 8_000 });
  assert(await locator.isVisible(), message);
}

async function expectNoHorizontalOverflow(page, message) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  assert(!hasOverflow, message);
}

function isBenignAbort(request) {
  const failure = request.failure()?.errorText ?? '';
  if (failure !== 'net::ERR_ABORTED') return false;
  if (request.method() === 'GET') return true;

  const url = new URL(request.url());
  return (
    request.isNavigationRequest() ||
    url.pathname.startsWith('/__nextjs_font/') ||
    /\.(woff2?|otf|ttf)$/i.test(url.pathname)
  );
}

async function expectPublicRoutes(page, name) {
  const routes = [
    ['/solicitar/ti', 'Solicitar suporte de TI'],
    ['/solicitar/midia', 'Solicitar fotos ou vídeos'],
    ['/solicitar/arte', 'Solicitar arte ou divulgação'],
    ['/solicitar/cobertura', 'Solicitar cobertura de evento'],
    ['/solicitar/outra', 'Enviar outra solicitação'],
    ['/solicitar/chromebooks', 'Solicitar Chromebooks'],
    ['/chromebooks/solicitar', 'Solicitar Chromebooks'],
  ];

  for (const [path, heading] of routes) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
    await expectVisible(page.getByRole('heading', { name: heading }), `${name}: ${path} heading`);
    await expectNoHorizontalOverflow(page, `${name}: ${path} should not overflow horizontally`);
  }
}

async function expectPublicContactValidation(page, name) {
  await page.goto(`${baseURL}/solicitar/ti`, { waitUntil: 'networkidle' });
  await page.locator('#public-name').fill('QA Visual');
  await page.locator('#public-location').fill('Sala QA');
  await page.locator('#public-title').fill('Teste de contato obrigatorio');
  await page.locator('#public-description').fill('Validando contato obrigatorio.');
  await page.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expectVisible(
    page.getByRole('alert').filter({ hasText: 'Informe um e-mail ou telefone para contato.' }),
    `${name}: public ticket contact validation`,
  );

  await page.goto(`${baseURL}/solicitar/chromebooks`, { waitUntil: 'networkidle' });
  await page.locator('#public-chromebook-room').fill('Sala QA');
  await page.locator('#public-chromebook-requester').fill('QA Visual');
  await page.getByRole('button', { name: 'Solicitar agendamento' }).click();
  await expectVisible(
    page.getByRole('alert').filter({ hasText: 'Informe um e-mail ou telefone para contato.' }),
    `${name}: public Chromebook contact validation`,
  );
}

async function runScenario(browser, name, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const browserIssues = [];
  const networkIssues = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => browserIssues.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (isBenignAbort(request)) return;
    if (url.origin === baseURL) {
      networkIssues.push(`${request.method()} ${url.pathname}: ${request.failure()?.errorText}`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseURL && response.status() >= 400) {
      networkIssues.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await expectVisible(page.getByRole('heading', { name: 'Helper' }), `${name}: login heading`);
  await expectVisible(page.getByLabel('Usuário'), `${name}: username field`);
  await expectVisible(page.getByLabel('Senha'), `${name}: password field`);

  const manifestResponse = await context.request.get(`${baseURL}/manifest.webmanifest`);
  assert(manifestResponse.ok(), `${name}: manifest should be public`);
  const manifest = await manifestResponse.json();
  assert(manifest.name === 'Helper', `${name}: manifest name should be Helper`);
  assert(manifest.short_name === 'Helper', `${name}: manifest short name should be Helper`);
  assert(manifest.icons.length >= 3, `${name}: manifest should include icons`);

  for (const assetPath of ['/favicon.svg', '/icon-192.png', '/sw.js']) {
    const response = await context.request.get(`${baseURL}${assetPath}`);
    assert(response.ok(), `${name}: ${assetPath} should be public`);
  }

  await page.goto(`${baseURL}/solicitar`, { waitUntil: 'networkidle' });
  await expectVisible(
    page.getByRole('heading', { name: 'Como podemos ajudar?' }),
    `${name}: public request heading`,
  );
  await expectVisible(
    page.getByRole('link', { name: /Reservar Chromebooks/ }),
    `${name}: Chromebook public request link`,
  );
  await expectVisible(
    page.getByRole('link', { name: /Suporte de TI/ }),
    `${name}: IT public request link`,
  );
  await expectNoHorizontalOverflow(page, `${name}: public request hub should not overflow horizontally`);
  await expectPublicRoutes(page, name);
  await expectPublicContactValidation(page, name);

  await page.goto(`${baseURL}/tickets?page=abc&status=bad`, { waitUntil: 'domcontentloaded' });
  assert(page.url().includes('/login?callbackUrl='), `${name}: protected route should redirect`);
  const loginUrl = new URL(page.url());
  assert(!loginUrl.searchParams.has('page'), `${name}: login URL should not leak page filters`);
  assert(
    loginUrl.searchParams.get('callbackUrl')?.includes('/tickets?page=abc&status=bad'),
    `${name}: login URL should preserve callback URL`,
  );

  assert(browserIssues.length === 0, `${name}: browser issues\n${browserIssues.join('\n')}`);
  assert(networkIssues.length === 0, `${name}: network issues\n${networkIssues.join('\n')}`);
  await context.close();
}

let child = null;
let output = '';

try {
  child = startServerIfNeeded();
  if (child) {
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    await waitForServer(child);
  }

  const browser = await chromium.launch();
  try {
    await runScenario(browser, 'desktop', devices['Desktop Chrome']);
    await runScenario(browser, 'mobile', devices['Pixel 7']);
  } finally {
    await browser.close();
  }

  console.log('Playwright E2E passed.');
} catch (error) {
  if (output) console.error(output.slice(-4000));
  console.error(error);
  process.exitCode = 1;
} finally {
  if (child) child.kill();
}
