import { getLines, getLineStations, getStations } from '../dao/networkDao.js';

class NetworkService {
  constructor() {
    this._lines = [];
    this._stations = [];
    this._lineStations = [];
    // stationId → name
    this._stationMap = new Map();
    // stationId → Set<stationId> (direct neighbours on same line)
    this._adj = new Map();
    // "startId-destId" → min stops (precomputed BFS for all reachable pairs)
    this._distMatrix = new Map();
    // flat array of valid pair keys for O(1) random pick
    this._validPairsArray = [];
    this._ready = false;
  }

  async init() {
    const [lines, lineStations, stations] = await Promise.all([
      getLines(),
      getLineStations(),
      getStations(),
    ]);

    this._lines = lines;
    this._lineStations = lineStations;
    this._stations = stations;
    this._stationMap = new Map(stations.map(s => [s.id, s.name]));

    // Build adjacency: consecutive stations on the same line are neighbours
    const byLine = new Map();
    for (const row of lineStations) {
      if (!byLine.has(row.line_id)) byLine.set(row.line_id, []);
      byLine.get(row.line_id).push(row);
    }
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

    // BFS from every station — builds distance matrix and valid pairs list
    for (const start of stations) {
      const visited = new Map([[start.id, 0]]); // stationId → distance
      const queue = [start.id];
      while (queue.length) {
        const cur = queue.shift();
        const dist = visited.get(cur);
        for (const nb of (this._adj.get(cur) ?? [])) {
          if (!visited.has(nb)) {
            visited.set(nb, dist + 1);
            queue.push(nb);
            this._distMatrix.set(`${start.id}-${nb}`, dist + 1);
            this._validPairsArray.push(`${start.id}-${nb}`);
          }
        }
      }
    }

    this._ready = true;
    console.log(
      `NetworkService ready — ${stations.length} stations, ` +
      `${this._validPairsArray.length} valid pairs`
    );
  }

  // Returns lines with their ordered stations embedded, plus flat stations list
  getNetworkData() {
    const byLine = new Map(this._lines.map(l => [l.id, { ...l, stations: [] }]));
    for (const row of this._lineStations) {
      byLine.get(row.line_id)?.stations.push({
        id: row.station_id,
        name: row.station_name,
        position: row.position,
      });
    }
    for (const line of byLine.values()) {
      line.stations.sort((a, b) => a.position - b.position);
    }
    return {
      lines: [...byLine.values()],
      stations: this._stations,
    };
  }

  isValidPair(startId, destId) {
    return this._distMatrix.has(`${startId}-${destId}`);
  }

  // O(1) — picks from pre-built array
  getRandomValidPair() {
    const key = this._validPairsArray[
      Math.floor(Math.random() * this._validPairsArray.length)
    ];
    const [startId, destId] = key.split('-').map(Number);
    return { startId, destId };
  }

  // O(1) map lookup
  getStationName(id) {
    return this._stationMap.get(id) ?? null;
  }

  // O(1) — distance matrix precomputed at startup
  minStops(startId, destId) {
    if (startId === destId) return 0;
    return this._distMatrix.get(`${startId}-${destId}`) ?? Infinity;
  }
}

export const networkService = new NetworkService();
