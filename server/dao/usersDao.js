import db from '../db.js';
import { DatabaseError } from '../errors/AppError.js';

function getUser(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(new DatabaseError(err.message));
      else resolve(row ?? null);
    })
  );
}

export function getUserById(id) {
  return getUser('SELECT id, email, name FROM users WHERE id = ?', [id]);
}

export function getUserRowByEmail(email) {
  return getUser('SELECT id, email, name, hash, salt FROM users WHERE email = ?', [email]);
}
