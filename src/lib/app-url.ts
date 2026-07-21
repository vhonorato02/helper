type PublicAppUrlOptions = {
  includeAppUrl?: boolean;
  fallback?: string | null;
};

export function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getPublicAppUrl(options: PublicAppUrlOptions = {}) {
  const candidates = [
    options.includeAppUrl ? process.env.APP_URL : null,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) return normalized;
  }

  return options.fallback ?? null;
}
