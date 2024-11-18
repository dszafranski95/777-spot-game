// 777-slots/lib/db.ts
import sqlite3 from 'sqlite3';
import path from 'path';

// Użyj absolutnej ścieżki do bazy danych, korzystając z process.cwd()
const dbPath = path.join(process.cwd(), 'db', 'data.sqlite');

// Utwórz singleton połączenie z bazą danych
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Nie udało się połączyć z bazą danych:', err);
  } else {
    console.log('Połączono z bazą danych SQLite na:', dbPath);
  }
});

export default db;
