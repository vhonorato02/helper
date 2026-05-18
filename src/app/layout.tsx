import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/layout/nav';
import { auth } from '@/auth';
import { getUsers } from '@/actions/users';
import { copy } from '@/lib/copy';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: copy.brand.name,
    template: `%s · ${copy.brand.name}`,
  },
  description: copy.brand.description,
  applicationName: copy.brand.name,
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: copy.brand.name,
    title: copy.brand.name,
    description: copy.brand.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: copy.brand.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: copy.brand.name,
    description: copy.brand.description,
    images: ['/og.png'],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  let users: { id: string; displayName: string }[] = [];
  if (isAuthenticated) {
    try {
      const allUsers = await getUsers();
      users = allUsers
        .filter((u) => u.isActive)
        .map((u) => ({ id: u.id, displayName: u.displayName }));
    } catch {
      // A navegacao ainda deve renderizar quando o banco estiver indisponivel.
    }
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
        >
          {copy.common.skipToContent}
        </a>
        <Providers>
          {isAuthenticated && (
            <Nav
              user={session!.user}
              users={users}
            />
          )}
          <main
            id="main-content"
            className={
              isAuthenticated
                ? 'mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:py-8'
                : ''
            }
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
