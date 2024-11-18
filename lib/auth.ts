// lib/auth.ts
// 777-slots/lib/auth.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import db from '@/lib/db'; // Import centralnego modułu

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials as { username: string; password: string };

        return new Promise((resolve) => {
          db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err: Error | null, user: any) => {
              if (err) {
                console.error('Błąd bazy danych podczas logowania:', err);
                resolve(null);
                return;
              }

              if (!user) {
                console.warn('Użytkownik nie znaleziony:', username);
                resolve(null);
                return;
              }

              const isValid = await bcrypt.compare(password, user.password);
              if (!isValid) {
                console.warn('Nieprawidłowe hasło dla użytkownika:', username);
                resolve(null);
                return;
              }

              // Zwróć obiekt użytkownika zgodny z NextAuth
              resolve({ id: user.id, name: user.username });
            }
          );
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: '/', // Ponieważ używamy własnej strony logowania
  },
  session: {
    strategy: 'jwt',
  },
};
