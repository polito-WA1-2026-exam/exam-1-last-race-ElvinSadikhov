import db from '../db.js';
import { DatabaseError } from '../errors/AppError.js';

function all(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(new DatabaseError(err.message));
      else resolve(rows);
    })
  );
}

export function getAllEvents() {
  return all('SELECT id, description, effect FROM events');
}
