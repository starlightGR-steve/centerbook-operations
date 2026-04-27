import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export type AppRole = 'superuser' | 'admin' | 'staff';

/** Map WordPress cb_staff.role values to AppRole for nav gating.
 *  cb_staff.role lands in either snake_case ('project_manager') or Title Case
 *  ('Project Manager'). Normalize both to snake_case before matching so the
 *  bucket is independent of how the row was written. */
function toAppRole(wpRole: string): AppRole {
  const normalized = wpRole.toLowerCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'superuser':
      return 'superuser';
    case 'owner':
    case 'admin':
    case 'instruction_manager':
    case 'center_manager':
    case 'project_manager':
      return 'admin';
    default:
      return 'staff';
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const apiBase = `${process.env.WP_API_URL}/cb/v1`;
        const apiUser = process.env.WP_API_USER;
        const apiPass = process.env.WP_API_PASSWORD;

        if (!apiBase || !apiUser || !apiPass) {
          console.error('Missing WP API credentials for staff auth');
          return null;
        }

        // Resolve the user's real public IP for the rate-limiter (mu-plugin
        // v2.59.0+). Vercel populates x-forwarded-for at ingress with the
        // client's IP as the leftmost entry; subsequent entries are edge
        // hops. NextAuth normalizes header values to string | string[] so we
        // handle both shapes. Empty / missing → omit the header so the
        // backend falls back to CF-Connecting-IP.
        const xff = req?.headers?.['x-forwarded-for'];
        const xffFirst = Array.isArray(xff) ? xff[0] : xff;
        const userIp =
          typeof xffFirst === 'string'
            ? (xffFirst.split(',')[0]?.trim() ?? '')
            : '';

        const outboundHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
        };
        if (userIp) {
          outboundHeaders['X-CB-Client-IP'] = userIp;
        }

        const res = await fetch(`${apiBase}/staff/auth`, {
          method: 'POST',
          headers: outboundHeaders,
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) {
          // Surface rate-limit lockouts to the login page via the NextAuth
          // error channel. Anything else (401, 5xx, malformed body) collapses
          // to the existing "Invalid email or password" path via null.
          let body: { code?: string; data?: { retry_after_seconds?: number } } | null = null;
          try { body = await res.json(); } catch { body = null; }
          if (res.status === 429 && body?.code === 'rate_limited') {
            const retry = body.data?.retry_after_seconds ?? 900;
            throw new Error(`rate_limited:${retry}`);
          }
          return null;
        }

        const envelope = await res.json();
        const staff = envelope.data ?? envelope;

        return {
          id: String(staff.id),
          name: `${staff.first_name} ${staff.last_name}`,
          email: staff.email,
          role: toAppRole(staff.role || 'staff'),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: AppRole }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: AppRole }).role = token.role as AppRole;
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
};
