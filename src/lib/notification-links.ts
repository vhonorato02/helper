const FALLBACK_NOTIFICATION_LINK = '/notificacoes';
const INTERNAL_LINK_BASE = 'https://helper.local';

export function normalizeInternalNotificationLink(
  link: string | null | undefined,
  options: { allowedOrigin?: string } = {},
) {
  const value = link?.trim();
  if (!value) return null;
  if (value.startsWith('//')) return null;

  try {
    if (value.startsWith('/')) {
      const url = new URL(value, INTERNAL_LINK_BASE);
      if (url.origin !== INTERNAL_LINK_BASE) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (!options.allowedOrigin) return null;

    const url = new URL(value);
    if (url.origin !== options.allowedOrigin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function notificationLinkOrDefault(link: string | null | undefined) {
  return normalizeInternalNotificationLink(link) ?? FALLBACK_NOTIFICATION_LINK;
}
