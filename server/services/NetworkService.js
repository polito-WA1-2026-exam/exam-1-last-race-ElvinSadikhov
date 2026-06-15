import { getLines, getLineStations, getStations } from '../dao/networkDao.js';

class NetworkService {
  constructor() {
    this._lines = [];
    this._stations = [];
    this._lineStations = [];
    // stationId → { id, name, lines: Set<lineId>, neighbours: Set<stationId> }
    this._stationIndex = new Map();
    // "minId-maxId" → Set<lineId>  (canonical key: smaller ID first)
    this._edgeLines = new Map();
    // "startId-destId" → min stops (precomputed at startup)
    this._distMatrix = new Map();
    // all reachable pairs, for O(1) random pick
    this._validPairsArray = [];
    // subset where minStops >= 3 (game start/dest requirement)
    this._gamePairsArray = [];
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

    // Build station index: one entry per station with name, lines, neighbours
    for (const s of stations) {
      this._stationIndex.set(s.id, { id: s.id, name: s.name, lines: new Set(), neighbours: new Set() });
    }

    // Group stops by line, then populate lines/neighbours/edgeLines
    const byLine = new Map();
    for (const row of lineStations) {
      if (!byLine.has(row.line_id)) byLine.set(row.line_id, []);
      byLine.get(row.line_id).push(row);
      this._stationIndex.get(row.station_id)?.lines.add(row.line_id);
    }

    for (const stops of byLine.values()) {
      stops.sort((a, b) => a.position - b.position);
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1].station_id;
        const b = stops[i].station_id;
        const lineId = stops[i].line_id;

        this._stationIndex.get(a)?.neighbours.add(b);
        this._stationIndex.get(b)?.neighbours.add(a);

        const edgeKey = `${Math.min(a, b)}-${Math.max(a, b)}`;
        if (!this._edgeLines.has(edgeKey)) this._edgeLines.set(edgeKey, new Set());
        this._edgeLines.get(edgeKey).add(lineId);
      }
    }

    // BFS from every station — precompute distance matrix + valid pair arrays
    for (const s of stations) {
      const visited = new Map([[s.id, 0]]);
      const queue = [s.id];
      while (queue.length) {
        const cur = queue.shift();
        const dist = visited.get(cur);
        for (const nb of (this._stationIndex.get(cur)?.neighbours ?? [])) {
          if (!visited.has(nb)) {
            const d = dist + 1;
            visited.set(nb, d);
            queue.push(nb);
            this._distMatrix.set(`${s.id}-${nb}`, d);
            this._validPairsArray.push(`${s.id}-${nb}`);
            if (d >= 3) this._gamePairsArray.push(`${s.id}-${nb}`);
          }
        }
      }
    }

    this._ready = true;
    console.log(
      `NetworkService ready — ${stations.length} stations, ` +
      `${this._gamePairsArray.length} game pairs (≥3 stops)`
    );
  }

  // Returns enriched lines with ordered stations embedded + flat stations list
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

  // O(1) — picks from pre-built array filtered to distance >= 3
  getRandomGamePair() {
    const key = this._gamePairsArray[
      Math.floor(Math.random() * this._gamePairsArray.length)
    ];
    const [startId, destId] = key.split('-').map(Number);
    return { startId, destId };
  }

  // O(1) — single index lookup
  getStationName(id) {
    return this._stationIndex.get(id)?.name ?? null;
  }

  // O(1) — distance matrix precomputed at startup
  minStops(startId, destId) {
    if (startId === destId) return 0;
    return this._distMatrix.get(`${startId}-${destId}`) ?? Infinity;
  }

  // O(1) — returns Set<lineId> for the edge, empty Set if edge doesn't exist
  getEdgeLines(a, b) {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    return this._edgeLines.get(key) ?? new Set();
  }

  // O(1) — interchange = served by more than one line
  isInterchange(stationId) {
    return (this._stationIndex.get(stationId)?.lines.size ?? 0) > 1;
  }
}

export const networkService = new NetworkService();
