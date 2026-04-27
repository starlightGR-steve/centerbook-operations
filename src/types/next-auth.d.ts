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
    /** Wall-clock ms timestamp of the last role refresh against cb_staff.
     *  jwt() callback re-derives role on a 5-minute TTL so audits + retitles
     *  propagate to live sessions without a forced re-login. */
    roleCheckedAt?: number;
  }
}
