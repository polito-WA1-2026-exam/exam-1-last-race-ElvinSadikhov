const SVG_W = 860, SVG_H = 520, PAD = 60;

export function project(lat, lon, bounds) {
  return {
    x: Math.round(PAD + (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon) * (SVG_W - 2 * PAD)),
    y: Math.round(PAD + (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat) * (SVG_H - 2 * PAD)),
  };
}

export function getBounds(stations) {
  const lats = stations.map(s => s.lat);
  const lons = stations.map(s => s.lon);
  return {
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLon: Math.min(...lons), maxLon: Math.max(...lons),
  };
}
