import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getUserRowByEmail, getUserById } from '../dao/UsersDao.js';
import { UnauthorizedError } from '../errors/AppError.js';

const scryptAsync = promisify(scrypt);

export async function verifyCredentials(email, password) {
  const row = await getUserRowByEmail(email);
  if (!row) throw new UnauthorizedError('Wrong email or password');

  const hashBuf = await scryptAsync(password, row.salt, 64);
  const storedBuf = Buffer.from(row.hash, 'hex');

  const match = hashBuf.length === storedBuf.length &&
    timingSafeEqual(hashBuf, storedBuf);

  if (!match) throw new UnauthorizedError('Wrong email or password');

  return { id: row.id, email: row.email, name: row.name };
}

export { getUserById } from '../dao/UsersDao.js';
