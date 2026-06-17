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

export function getLines() {
  return all('SELECT id, name, color FROM lines ORDER BY id');
}

export function getLineStations() {
  return all(`
    SELECT ls.line_id, ls.station_id, ls.position,
           s.name AS station_name, s.lat, s.lon, l.name AS line_name, l.color
    FROM   line_stations ls
    JOIN   stations s ON s.id = ls.station_id
    JOIN   lines    l ON l.id = ls.line_id
    ORDER  BY ls.line_id, ls.position
  `);
}

export function getStations() {
  return all('SELECT id, name, lat, lon FROM stations ORDER BY id');
}
