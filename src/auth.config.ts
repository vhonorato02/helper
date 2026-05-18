import type { NextAuthConfig } from 'next-auth';

// Session lifetime — short JWT to limit blast radius of token theft and pick
// up isAdmin / isActive changes from the database within a reasonable window.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
const SESSION_UPDATE_AGE_SECONDS = 60 * 30; // refresh fields every 30min

// Edge-safe config (no DB/bcrypt imports) — used by middleware.
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
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
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
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.displayName;
      session.user.username = token.username;
      session.user.isAdmin = token.isAdmin;
      return session;
    },
  },
  providers: [],
};
