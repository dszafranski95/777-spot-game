// 777-slots\app\api\play\route.ts
// 777-slots/app/api/play/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
          console.error('User not found or database error during play:', err);
          resolve(
            NextResponse.json({ error: 'User not found' }, { status: 404 })
          );
          return;
        }

        if (user.credits <= 0) {
          resolve(
            NextResponse.json({ error: 'No credits left' }, { status: 400 })
          );
          return;
        }

        // Zaktualizowana tablica symboli z większą liczbą symboli
        const symbols = [
          '🍒', '💎', '🔔', '🍋', '⭐', '7️⃣', '🍉', '🍇', '🍀', '🥇',
          '🌟', '🎲', '🍊', '🎰', '👑', '🎁', '💰', '🧲', '🔱', '💎',
        ];

        const getRandomInt = (max: number) => {
          return crypto.randomInt(0, max);
        };

        const spin = () => [
          symbols[getRandomInt(symbols.length)],
          symbols[getRandomInt(symbols.length)],
          symbols[getRandomInt(symbols.length)],
        ];

        const result = spin();
        let pointsWon = 0;

        // Logika wygranej
        if (result[0] === result[1] && result[1] === result[2]) {
          // Sprawdź, czy to rzadki symbol jackpot (np. '💎')
          if (result[0] === '💎') {
            pointsWon = 100; // Mega Jackpot za dopasowanie trzech '💎'
          } else {
            pointsWon = 50; // Jackpot za dopasowanie wszystkich trzech symboli
          }
        } else if (
          result[0] === result[1] ||
          result[1] === result[2] ||
          result[0] === result[2]
        ) {
          pointsWon = 10; // Wygrana za dopasowanie dowolnych dwóch symboli
        }

        // Oblicz nowe kredyty i punkty
        const newCredits = user.credits - 1;
        const newPoints = user.points + pointsWon;

        db.run(
          'UPDATE users SET credits = ?, points = ? WHERE username = ?',
          [newCredits, newPoints, username],
          function (updateErr: Error | null) {
            if (updateErr) {
              console.error('Failed to update user during play:', updateErr);
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
                  result,
                  pointsWon,
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
