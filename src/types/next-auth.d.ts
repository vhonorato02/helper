import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
      mustChangePassword: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    username: string;
    isAdmin: boolean;
    mustChangePassword: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    username: string;
    isAdmin: boolean;
    displayName: string;
    mustChangePassword: boolean;
    sessionInvalid?: boolean;
  }
}
