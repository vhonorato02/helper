import type { MetadataRoute } from 'next';
import { copy } from '@/lib/copy';
import { BRAND } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa',
    name: copy.brand.name,
    short_name: copy.brand.name,
    description: copy.brand.description,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    background_color: BRAND.black,
    theme_color: BRAND.manifestThemeColor,
    orientation: 'portrait-primary',
    categories: ['productivity', 'business'],
    lang: 'pt-BR',
    prefer_related_applications: false,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: copy.nav.newTicket,
        short_name: 'Nova',
        url: '/tickets?novo=1',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: copy.nav.links.kanban,
        short_name: 'Kanban',
        url: '/kanban',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: copy.nav.links.tickets,
        short_name: 'Demandas',
        url: '/tickets',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: copy.nav.links.chromebooks,
        short_name: 'Chromebooks',
        url: '/chromebooks',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
