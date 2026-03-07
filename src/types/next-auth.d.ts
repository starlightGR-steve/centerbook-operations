import type { AppRole } from '@/lib/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: AppRole;
    };
  }

  interface User {
    role: AppRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: AppRole;
    id: string;
  }
}
