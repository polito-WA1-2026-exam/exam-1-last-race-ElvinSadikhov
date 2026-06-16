import { getLines, getLineStations, getStations } from '../dao/networkDao.js';

/**
 * @typedef {{ id: number, name: string, lines: Set<number>, neighbours: Set<number> }} StationRecord
 */

class NetworkService {
  constructor() {
    this._lines = [];
    this._stations = [];
    this._lineStations = [];

    /** @type {Map<number, StationRecord>} */
    this._stationIndex = new Map();

    /** @type {Map<string, Set<number>>} edge canonical key "minId-maxId" → line IDs */
    this._edgeLines = new Map();

    /** @type {Map<string, number>} "startId-destId" → min stops */
    this._distMatrix = new Map();

    /** @type {string[]} pairs where minStops >= 3 (game requirement) */
    this._gamePairsArray = [];

    /** @type {{ lines: object[], stations: object[] } | null} precomputed response for GET /api/network */
    this._networkData = null;

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

    this._buildStationIndex(stations, lineStations);
    this._buildDistanceMatrix(stations);
    this._networkData = this._buildNetworkData();

    this._ready = true;
    console.log(
      `NetworkService ready — ${stations.length} stations, ` +
      `${this._gamePairsArray.length} game pairs (≥3 stops)`
    );
  }

  /** @param {typeof this._stations} stations @param {typeof this._lineStations} lineStations */
  _buildStationIndex(stations, lineStations) {
    for (const s of stations) {
      this._stationIndex.set(s.id, {
        id: s.id,
        name: s.name,
        lines: new Set(),
        neighbours: new Set(),
      });
    }

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
  }

  /** @param {typeof this._stations} stations */
  _buildDistanceMatrix(stations) {
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
            if (d >= 3) this._gamePairsArray.push(`${s.id}-${nb}`);
          }
        }
      }
    }
  }

  getNetworkData() {
    return this._networkData;
  }

  _buildNetworkData() {
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
    return { lines: [...byLine.values()], stations: this._stations };
  }

  isValidPair(startId, destId) {
    return this._distMatrix.has(`${startId}-${destId}`);
  }

  getRandomGamePair() {
    const key = this._gamePairsArray[
      Math.floor(Math.random() * this._gamePairsArray.length)
    ];
    const [startId, destId] = key.split('-').map(Number);
    return { startId, destId };
  }

  /** @param {number} id @returns {string | null} */
  getStationName(id) {
    return this._stationIndex.get(id)?.name ?? null;
  }

  minStops(startId, destId) {
    if (startId === destId) return 0;
    return this._distMatrix.get(`${startId}-${destId}`) ?? Infinity;
  }

  /** @returns {Set<number>} line IDs serving this edge; empty Set if edge doesn't exist */
  getEdgeLines(a, b) {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    return this._edgeLines.get(key) ?? new Set();
  }

  isInterchange(stationId) {
    return (this._stationIndex.get(stationId)?.lines.size ?? 0) > 1;
  }
}

export const networkService = new NetworkService();
