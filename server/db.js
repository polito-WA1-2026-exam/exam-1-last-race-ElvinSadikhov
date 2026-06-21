import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new sqlite3.Database(
  path.join(__dirname, 'database.db'),
  err => { if (err) throw err; }
);

db.run('PRAGMA foreign_keys = ON');

export default db;
