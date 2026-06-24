import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/layout/nav';
import { PwaInstallPrompt } from '@/components/pwa-install';
import { auth } from '@/auth';
import { getActiveUsersForAssignment } from '@/actions/users';
import { PasswordChangeGuard } from '@/components/password-change-guard';
import { copy } from '@/lib/copy';
import { APP_VERSION_LABEL } from '@/lib/version';
import { BRAND } from '@/lib/brand';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

function buildSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    // Vercel env vars are often set without protocol (e.g. "helperpinda.vercel.app").
    // new URL() throws on bare hostnames — always ensure a scheme is present.
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
const SITE_URL = buildSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: copy.brand.name,
    template: `%s · ${copy.brand.name}`,
  },
  description: copy.brand.description,
  applicationName: APP_VERSION_LABEL,
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
  other: {
    'application-version': APP_VERSION_LABEL,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.themeColorLight },
    { media: '(prefers-color-scheme: dark)', color: BRAND.themeColorDark },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  let users: { id: string; displayName: string }[] = [];
  if (isAuthenticated && !session?.user?.mustChangePassword) {
    try {
      users = await getActiveUsersForAssignment();
    } catch (error) {
      const digest = (error as Error & { digest?: string }).digest;
      if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))) throw error;
      // A navegação ainda deve renderizar quando o banco estiver indisponível.
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
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
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
            <PasswordChangeGuard mustChangePassword={session.user.mustChangePassword ?? false} />
          )}
          {isAuthenticated && !session.user.mustChangePassword && (
            <Nav
              user={session.user}
              users={users}
            />
          )}
          <main
            id="main-content"
            className={
              isAuthenticated
                ? 'safe-auth-main mx-auto w-full max-w-7xl py-5 sm:py-7 lg:py-8'
                : ''
            }
          >
            {children}
          </main>
          {isAuthenticated && !session.user.mustChangePassword && <PwaInstallPrompt />}
        </Providers>
      </body>
    </html>
  );
}
