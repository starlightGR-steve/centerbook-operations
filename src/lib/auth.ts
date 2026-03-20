import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export type AppRole = 'superuser' | 'admin' | 'staff';

/** Map WordPress cb_staff.role values to AppRole for nav gating */
function toAppRole(wpRole: string): AppRole {
  switch (wpRole.toLowerCase()) {
    case 'superuser':
      return 'superuser';
    case 'owner':
    case 'admin':
    case 'instruction_manager':
    case 'center_manager':
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const apiBase = process.env.NEXT_PUBLIC_API_BASE;
        const apiUser = process.env.WP_API_USER;
        const apiPass = process.env.WP_API_PASSWORD;

        if (!apiBase || !apiUser || !apiPass) {
          console.error('Missing WP API credentials for staff auth');
          return null;
        }

        // Fetch staff record from WordPress REST API
        const res = await fetch(`${apiBase}/staff/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
          },
          body: JSON.stringify({ email: credentials.email }),
        });

        if (!res.ok) return null;

        const envelope = await res.json();
        const staff = envelope.data ?? envelope;

        // Verify password against bcrypt hash
        const valid = await bcrypt.compare(credentials.password, staff.password_hash);
        if (!valid) return null;

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
