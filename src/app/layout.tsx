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
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d22' },
  ],
  width: 'device-width',
  initialScale: 1,
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          {isAuthenticated && (
            <Nav
              user={session!.user as { id?: string; name?: string; isAdmin?: boolean }}
              users={users}
            />
          )}
          <main
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
