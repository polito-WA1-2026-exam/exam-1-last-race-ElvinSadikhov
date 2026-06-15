import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import db from '../db.js';
import { DatabaseError, UnauthorizedError } from '../errors/AppError.js';

const scryptAsync = promisify(scrypt);

function getUser(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(new DatabaseError(err.message));
      else resolve(row ?? null);
    })
  );
}

export async function getUserById(id) {
  const row = await getUser('SELECT id, email, name FROM users WHERE id = ?', [id]);
  return row;
}

export async function getUserByCredentials(email, password) {
  const row = await getUser(
    'SELECT id, email, name, hash, salt FROM users WHERE email = ?',
    [email]
  );

  if (!row) throw new UnauthorizedError('Wrong email or password');

  const hashBuf = await scryptAsync(password, row.salt, 64);
  const storedBuf = Buffer.from(row.hash, 'hex');

  const match = hashBuf.length === storedBuf.length &&
    timingSafeEqual(hashBuf, storedBuf);

  if (!match) throw new UnauthorizedError('Wrong email or password');

  return { id: row.id, email: row.email, name: row.name };
}
