import type { NextAuthConfig } from 'next-auth';

// Short JWT limits the blast radius of token theft and picks
// up isAdmin / isActive changes from the database within a reasonable window.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
const SESSION_UPDATE_AGE_SECONDS = 60 * 30; // refresh fields every 30min

// Edge-safe config (no DB/bcrypt imports) used by proxy.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname.startsWith('/api/cron')) return true;
      if (
        nextUrl.pathname === '/solicitar' ||
        nextUrl.pathname.startsWith('/solicitar/') ||
        nextUrl.pathname === '/chromebooks/solicitar'
      ) {
        return true;
      }

      const isLoggedIn = !!auth?.user?.id;
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isPasswordChange = nextUrl.pathname.startsWith('/alterar-senha');
      const mustChangePassword = Boolean(auth?.user?.mustChangePassword);

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }
      if (isLoggedIn && mustChangePassword && !isPasswordChange) {
        return Response.redirect(new URL('/alterar-senha', nextUrl));
      }
      if (isLoggedIn) return true;

      const loginUrl = new URL('/login', nextUrl);
      loginUrl.searchParams.set('callbackUrl', nextUrl.href);
      return Response.redirect(loginUrl);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? '';
        token.username = user.username ?? '';
        token.isAdmin = user.isAdmin ?? false;
        token.displayName = user.name ?? '';
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sessionInvalid) {
        session.user = {
          ...session.user,
          id: '',
          username: '',
          isAdmin: false,
          mustChangePassword: false,
        };
        return session;
      }
      session.user.id = String(token.id ?? '');
      session.user.name = token.displayName ? String(token.displayName) : null;
      session.user.username = String(token.username ?? '');
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
  },
  providers: [],
};
