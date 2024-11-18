// app/api/user/route.ts
// 777-slots/app/api/user/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // Poprawiony import
import { authOptions } from '@/lib/auth';
import db from '@/lib/db'; // Import centralnego modułu

export async function GET(req: Request): Promise<Response> {
  // Pobierz sesję użytkownika
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = session.user.name;

  return new Promise((resolve) => {
    db.get(
      'SELECT credits, points FROM users WHERE username = ?',
      [username],
      (err: Error | null, user: any) => {
        if (err) {
          console.error('Błąd bazy danych podczas pobierania danych użytkownika:', err);
          resolve(
            NextResponse.json({ error: 'Internal server error' }, { status: 500 })
          );
          return;
        }

        if (!user) {
          console.error('Użytkownik nie znaleziony podczas pobierania danych:', username);
          resolve(
            NextResponse.json({ error: 'User not found' }, { status: 404 })
          );
          return;
        }

        resolve(
          NextResponse.json({
            credits: user.credits,
            points: user.points,
          }, { status: 200 })
        );
      }
    );
  });
}
