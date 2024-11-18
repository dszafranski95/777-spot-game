// 777-slots\scripts\init-db.js
// 777-slots\scripts\init-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ustaw ścieżkę do bazy danych
const dbPath = path.join(__dirname, '../db/data1.sqlite');

// Upewnij się, że folder `db` istnieje
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Utwórz połączenie z bazą danych
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      credits INTEGER DEFAULT 10,
      points INTEGER DEFAULT 0
    );
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Table \`users\` created or already exists.');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('Database connection closed.');
  }
});
