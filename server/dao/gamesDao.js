import db from '../db.js';
import { DatabaseError } from '../errors/AppError.js';

function run(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(new DatabaseError(err.message));
      else resolve(this.lastID);
    })
  );
}

function get(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(new DatabaseError(err.message));
      else resolve(row ?? null);
    })
  );
}

function all(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(new DatabaseError(err.message));
      else resolve(rows);
    })
  );
}

export function createGame(userId, startStationId, destStationId) {
  return run(
    `INSERT INTO games (user_id, start_station_id, dest_station_id, status)
     VALUES (?, ?, ?, 'active')`,
    [userId, startStationId, destStationId]
  );
}

export function getGameByIdAndUser(gameId, userId) {
  return get(
    `SELECT id, user_id, start_station_id, dest_station_id, score, status
     FROM games WHERE id = ? AND user_id = ?`,
    [gameId, userId]
  );
}

export function saveGameResult(gameId, score) {
  return run(
    `UPDATE games SET score = ?, status = 'completed' WHERE id = ?`,
    [score, gameId]
  );
}

export function getRanking() {
  return all(
    `SELECT u.name AS userName, MAX(g.score) AS bestScore
     FROM   games g
     JOIN   users u ON u.id = g.user_id
     WHERE  g.status = 'completed'
     GROUP  BY g.user_id
     ORDER  BY bestScore DESC`,
    []
  );
}
