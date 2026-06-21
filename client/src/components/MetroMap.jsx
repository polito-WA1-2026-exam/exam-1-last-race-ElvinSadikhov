import PropTypes from 'prop-types';
import { project, getBounds, SVG_W, SVG_H, PAD } from '../constants/mapLayout.js';

const GRID_XS = Array.from({ length: 14 }, (_, i) => PAD + i * PAD);
const GRID_YS = Array.from({ length:  9 }, (_, i) => PAD + i * PAD);

function MetroMap({ mode = 'full', lines = [], stations = [], interchanges = new Set() }) {
  if (!stations.length) return null;

  const bounds = getBounds(stations);
  const pos = (lat, lon) => project(lat, lon, bounds);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="lr-map" role="img" aria-label="Metro network map">
      <rect width={SVG_W} height={SVG_H} fill="#FAF7F2" rx="2" />

      <g opacity="0.18">
        {GRID_XS.map(x => <line key={`gx${x}`} x1={x} y1={0}    x2={x} y2={SVG_H} stroke="#8A8070" strokeWidth="0.5" />)}
        {GRID_YS.map(y => <line key={`gy${y}`} x1={0}  y1={y}   x2={SVG_W} y2={y} stroke="#8A8070" strokeWidth="0.5" />)}
      </g>

      {mode === 'full' && lines.map(line => (
        <g key={line.name}>
          {line.stations.slice(0, -1).map((from, i) => {
            const to = line.stations[i + 1];
            const a = pos(from.lat, from.lon);
            const b = pos(to.lat, to.lon);
            return (
              <line key={from.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={line.color} strokeWidth="7" strokeLinecap="round" />
            );
          })}
        </g>
      ))}

      {stations.map(station => {
        const { x, y } = pos(station.lat, station.lon);
        return (
          <g key={station.name}>
            {interchanges.has(station.name) ? (
              <>
                <circle cx={x} cy={y} r={12} fill="#FAF7F2" stroke="#1A1614" strokeWidth="3" />
                <circle cx={x} cy={y} r={5}  fill="#1A1614" />
              </>
            ) : (
              <circle cx={x} cy={y} r={6} fill="#1A1614" stroke="#FAF7F2" strokeWidth="2" />
            )}
            <text x={x} y={y - 14} textAnchor="middle"
                  fontSize="11" fontFamily="'Segoe UI', system-ui, sans-serif"
                  fontWeight="600" fill="#1A1614">
              {station.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const stationShape = PropTypes.shape({ id: PropTypes.number.isRequired, name: PropTypes.string.isRequired, lat: PropTypes.number.isRequired, lon: PropTypes.number.isRequired });

MetroMap.propTypes = {
  mode:         PropTypes.oneOf(['full', 'stationsOnly']),
  lines:        PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, name: PropTypes.string, color: PropTypes.string, stations: PropTypes.arrayOf(stationShape) })),
  stations:     PropTypes.arrayOf(stationShape).isRequired,
  interchanges: PropTypes.instanceOf(Set),
};

export default MetroMap;
