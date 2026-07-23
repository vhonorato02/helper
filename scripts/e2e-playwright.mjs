import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, devices } from '@playwright/test';

const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '3101', 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const timeoutMs = 60_000;
const responsiveViewports = [375, 390, 430, 768, 1024, 1280];
const responsivePublicRoutes = [
  ['/login', 'Helper'],
  ['/solicitar', 'Como podemos ajudar?'],
  ['/solicitar/ti', 'Solicitar suporte de TI'],
  ['/solicitar/chromebooks', 'Solicitar Chromebooks'],
];
const authenticatedRoutes = [
  '/',
  '/kanban',
  '/tickets',
  '/agendamentos',
  '/marketing',
  '/marketing/calendario',
  '/marketing/gravacoes',
  '/equipe',
  '/atividade',
  '/notificacoes',
  '/respostas-rapidas',
  '/solicitacoes-publicas',
  '/chromebooks',
  '/minha-conta',
];

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
    DATABASE_URL: process.env.PLAYWRIGHT_DATABASE_URL ?? '',
    DATABASE_URL_UNPOOLED: process.env.PLAYWRIGHT_DATABASE_URL_UNPOOLED ?? '',
    DATABASE_TIMEOUT_MS: process.env.DATABASE_TIMEOUT_MS ?? '1000',
    AUTH_SECRET: process.env.AUTH_SECRET ?? 'playwright-local-secret-with-32-characters',
    BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ?? 'playwright-bootstrap-secret',
    CRON_SECRET: process.env.CRON_SECRET ?? 'playwright-cron-secret',
    APP_URL: baseURL,
    NEXT_PUBLIC_SITE_URL: baseURL,
  };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;

  if (process.env.PLAYWRIGHT_SKIP_BUILD !== '1') {
    const build = spawnSync(process.execPath, ['scripts/next-build.mjs'], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
    if (build.status !== 0) {
      throw new Error(`next build failed before Playwright E2E with code ${build.status ?? 1}`);
    }
  }

  return spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
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
  const url = new URL(request.url());
  if (request.method() === 'GET') return true;
  // Next can abort the login server-action request after the client receives a safe error state.
  if (request.method() === 'POST' && url.pathname === '/login') return true;

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
  await page.getByRole('combobox', { name: 'Urgência' }).click();
  await expectVisible(
    page.getByRole('option', { name: 'Urgente' }),
    `${name}: public priority options should open`,
  );
  await page.getByRole('option', { name: 'Alta' }).click();
  await expectVisible(
    page.getByRole('combobox', { name: 'Urgência' }).filter({ hasText: 'Alta' }),
    `${name}: public priority selection`,
  );
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
      const location = message.location();
      const source = location.url ? ` (${location.url}:${location.lineNumber})` : '';
      browserIssues.push(`${message.type()}: ${message.text()}${source}`);
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
  await page.getByLabel('Usuário').fill('qa.user');
  await page.getByLabel('Senha').fill('invalid-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const safeLoginErrors = [
    'Usuário ou senha incorretos.',
    'Algo deu errado. Tente novamente.',
    'Muitas ações em pouco tempo. Aguarde um momento.',
  ];
  await page.waitForFunction(
    (messages) => {
      const pageText = document.body.innerText;
      return messages.some((message) => pageText.includes(message));
    },
    safeLoginErrors,
    { timeout: 8_000 },
  );
  const loginAlertText = await page.locator('body').innerText();
  assert(
    safeLoginErrors.some((message) => loginAlertText.includes(message)),
    `${name}: invalid login should show a safe error message`,
  );

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

async function expectResponsivePublicRoutes(browser) {
  for (const width of responsiveViewports) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 900 },
      deviceScaleFactor: 1,
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    const page = await context.newPage();

    for (const [path, heading] of responsivePublicRoutes) {
      await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
      await expectVisible(
        page.getByRole('heading', { name: heading }),
        `viewport ${width}: ${path} heading`,
      );
      await expectNoHorizontalOverflow(
        page,
        `viewport ${width}: ${path} should not overflow horizontally`,
      );
    }

    await context.close();
  }
}

async function expectAuthenticatedRoutes(browser) {
  const username = process.env.PLAYWRIGHT_USERNAME;
  const password = process.env.PLAYWRIGHT_PASSWORD;
  if (!username && !password) {
    console.log('Authenticated E2E skipped (PLAYWRIGHT_USERNAME/PLAYWRIGHT_PASSWORD not set).');
    return;
  }
  assert(
    username && password,
    'PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be configured together',
  );

  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();
  const failures = [];

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseURL && response.status() >= 500) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Usuário').fill(username);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 });
  assert(
    new URL(page.url()).pathname !== '/alterar-senha',
    'E2E user must finish the mandatory password change before route validation',
  );

  const routes = process.env.PLAYWRIGHT_ADMIN === '1'
    ? [...authenticatedRoutes, '/configuracoes']
    : authenticatedRoutes;
  for (const path of routes) {
    const response = await page.goto(`${baseURL}${path}`, {
      waitUntil: 'networkidle',
      timeout: 20_000,
    });
    assert(response && response.status() < 400, `${path} returned ${response?.status() ?? 'no response'}`);
    const body = await page.locator('body').innerText();
    assert(
      !body.includes('Não foi possível carregar esta tela') &&
        !body.includes("This page couldn't load"),
      `${path} rendered the application error boundary`,
    );
    await expectNoHorizontalOverflow(page, `${path} should not overflow horizontally`);
  }

  assert(failures.length === 0, `authenticated route failures\n${failures.join('\n')}`);
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
    await expectResponsivePublicRoutes(browser);
    await expectAuthenticatedRoutes(browser);
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
