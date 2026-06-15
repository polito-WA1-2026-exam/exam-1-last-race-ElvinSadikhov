import { getLines, getLineStations, getStations } from '../dao/networkDao.js';

class NetworkService {
  constructor() {
    this._lines = [];
    this._stations = [];
    // adjacency: stationId → Set of stationId (reachable in one stop on any shared line)
    this._adj = new Map();
    // valid pairs: Set of "startId-destId" strings (BFS distance >= 1)
    this._validPairs = new Set();
    this._ready = false;
  }

  async init() {
    const [lines, lineStations, stations] = await Promise.all([
      getLines(),
      getLineStations(),
      getStations(),
    ]);

    this._lines = lines;
    this._stations = stations;

    // Group stations per line, sorted by position
    const byLine = new Map();
    for (const row of lineStations) {
      if (!byLine.has(row.line_id)) byLine.set(row.line_id, []);
      byLine.get(row.line_id).push(row);
    }

    // Build adjacency list: consecutive stations on same line are neighbours
    for (const stops of byLine.values()) {
      stops.sort((a, b) => a.position - b.position);
      for (let i = 0; i < stops.length; i++) {
        const sid = stops[i].station_id;
        if (!this._adj.has(sid)) this._adj.set(sid, new Set());
        if (i > 0) {
          const prev = stops[i - 1].station_id;
          this._adj.get(sid).add(prev);
          this._adj.get(prev).add(sid);
        }
      }
    }

    // BFS from every station to find all reachable destinations (>= 1 hop)
    for (const start of this._stations) {
      const visited = new Set([start.id]);
      const queue = [start.id];
      while (queue.length) {
        const cur = queue.shift();
        for (const nb of (this._adj.get(cur) ?? [])) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
            this._validPairs.add(`${start.id}-${nb}`);
          }
        }
      }
    }

    this._ready = true;
    console.log(
      `NetworkService ready — ${this._stations.length} stations, ` +
      `${this._validPairs.size} valid pairs`
    );
  }

  getNetworkData() {
    // Build a structured response the client can render
    const stationMap = new Map(this._stations.map(s => [s.id, s.name]));

    const lines = this._lines.map(line => {
      // Collect stations for this line from adj (rebuild from lineStations data via _adj)
      // We stored lines/stations separately so reassemble from raw DAO data isn't needed —
      // instead expose the pre-built structure
      return line;
    });

    return {
      lines: this._lines,
      stations: this._stations,
    };
  }

  isValidPair(startId, destId) {
    return this._validPairs.has(`${startId}-${destId}`);
  }

  getRandomValidPair() {
    const pairs = [...this._validPairs];
    const key = pairs[Math.floor(Math.random() * pairs.length)];
    const [startId, destId] = key.split('-').map(Number);
    return { startId, destId };
  }

  getStationName(id) {
    return this._stations.find(s => s.id === id)?.name ?? null;
  }

  minStops(startId, destId) {
    // BFS on demand for score calculation
    if (startId === destId) return 0;
    const visited = new Set([startId]);
    const queue = [[startId, 0]];
    while (queue.length) {
      const [cur, dist] = queue.shift();
      for (const nb of (this._adj.get(cur) ?? [])) {
        if (nb === destId) return dist + 1;
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([nb, dist + 1]);
        }
      }
    }
    return Infinity;
  }
}

export const networkService = new NetworkService();
