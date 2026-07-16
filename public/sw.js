// Helper Service Worker - v15
// Keep authenticated pages network-only. Older versions cached HTML and could
// serve stale Next.js payloads after deploys.

const CACHE = 'helper-static-v15';
const STATIC_URLS = [
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
  '/og.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/icon-') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/apple-touch-icon') ||
    url.pathname === '/og.png' ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(request)) {
    return;
  }

  // Assets estaticos: stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached ?? Response.error());
        return cached ?? fetchPromise;
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Helper',
    body: 'Você tem uma nova notificação.',
    link: '/notificacoes',
    tag: 'helper-notification',
  };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Helper', {
      body: payload.body || 'Você tem uma nova notificação.',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      tag: payload.tag || 'helper-notification',
      data: { url: payload.link || '/notificacoes' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notificacoes';
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
