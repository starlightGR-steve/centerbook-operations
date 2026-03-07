import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export type AppRole = 'superuser' | 'admin' | 'staff';

// Mock staff credentials for development
// TODO: Replace with cb/v1 API lookup or direct DB query
const MOCK_AUTH_USERS = [
  {
    id: '1',
    name: 'Bincy Sines',
    email: 'bincyteo@gmail.com',
    passwordHash: bcrypt.hashSync('CenterBook2026!', 12),
    role: 'admin' as AppRole,
  },
  {
    id: '2',
    name: 'Nicole Edmondson',
    email: 'nicoleedmo@gmail.com',
    passwordHash: bcrypt.hashSync('CenterBook2026!', 12),
    role: 'admin' as AppRole,
  },
  {
    id: '3',
    name: 'Steve Edmondson',
    email: 'steve@starlightgr.com',
    passwordHash: bcrypt.hashSync('Starlight2026!', 12),
    role: 'superuser' as AppRole,
  },
];

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

        // TODO: Replace with GET /cb/v1/staff?email=... or direct DB query
        const user = MOCK_AUTH_USERS.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
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
