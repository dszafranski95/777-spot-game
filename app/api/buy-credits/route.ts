// 777-slots/app/api/buy-credits/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // Poprawiony import
import { authOptions } from '@/lib/auth';
import db from '@/lib/db'; // Import centralnego modułu

export async function POST(req: Request): Promise<Response> {
  // Pobierz sesję użytkownika
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = session.user.name;

  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err: Error | null, user: any) => {
        if (err || !user) {
          console.error('User not found or database error during credit purchase:', err);
          resolve(
            NextResponse.json({ error: 'User not found' }, { status: 404 })
          );
          return;
        }

        // Sprawdź, czy użytkownik ma wystarczającą liczbę punktów (np. 10 punktów za kredyt)
        const costPerCredit = 10;
        if (user.points < costPerCredit) {
          resolve(
            NextResponse.json(
              { error: 'Not enough points to buy credits' },
              { status: 400 }
            )
          );
          return;
        }

        const newPoints = user.points - costPerCredit;
        const newCredits = user.credits + 1;

        db.run(
          'UPDATE users SET points = ?, credits = ? WHERE username = ?',
          [newPoints, newCredits, username],
          function (updateErr: Error | null) {
            if (updateErr) {
              console.error('Failed to update user during credit purchase:', updateErr);
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
                {
                  message: 'Credits purchased successfully',
                  credits: newCredits,
                  points: newPoints,
                },
                { status: 200 }
              )
            );
          }
        );
      }
    );
  });
}
