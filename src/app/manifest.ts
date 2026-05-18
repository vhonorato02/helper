import type { MetadataRoute } from 'next';
import { copy } from '@/lib/copy';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: copy.brand.name,
    short_name: copy.brand.name,
    description: copy.brand.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#1e3a8a',
    orientation: 'portrait-primary',
    categories: ['productivity', 'business'],
    lang: 'pt-BR',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
