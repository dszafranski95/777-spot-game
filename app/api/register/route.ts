// 777-slots\app\api\register\route.ts
// 777-slots/app/api/register/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import db from '@/lib/db'; // Import centralnego modułu
import { getServerSession } from 'next-auth/next'; // Jeśli używasz sesji w rejestracji, inaczej możesz usunąć
import { authOptions } from '@/lib/auth'; // Jeśli używasz sesji w rejestracji, inaczej możesz usunąć

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  let { username, password } = body;

  // Walidacja wejścia
  if (
    typeof username !== 'string' ||
    !username.trim() ||
    typeof password !== 'string' ||
    !password.trim()
  ) {
    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 400 }
    );
  }

  // Sanityzacja nazwy użytkownika
  username = username.replace(/[^a-zA-Z0-9_-]/g, '').trim();

  // Haszowanie hasła
  const hashedPassword = await bcrypt.hash(password, 10);

  return new Promise((resolve) => {
    // Sprawdź, czy użytkownik już istnieje
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err: Error | null, row: any) => {
        if (err) {
          console.error('Database error during registration:', err);
          resolve(
            NextResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            )
          );
          return;
        }

        if (row) {
          resolve(
            NextResponse.json(
              { error: 'Username already exists' },
              { status: 400 }
            )
          );
          return;
        }

        // Przydziel 10 początkowych kredytów podczas rejestracji
        db.run(
          'INSERT INTO users (username, password, credits, points) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, 10, 0],
          function (insertErr: Error | null) {
            if (insertErr) {
              console.error('Failed to register user:', insertErr);
              resolve(
                NextResponse.json(
                  { error: 'Internal server error' },
                  { status: 500 }
                )
              );
              return;
            }
            resolve(
              NextResponse.json(
                { message: 'User registered successfully' },
                { status: 200 }
              )
            );
          }
        );
      }
    );
  });
}
