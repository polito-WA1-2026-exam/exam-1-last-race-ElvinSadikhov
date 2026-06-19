import { useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import MetroMap from '../components/MetroMap.jsx';
import useCountdown from '../hooks/useCountdown.js';
import { submitRoute } from '../api.js';

function buildSegments(lines) {
  const seen = new Set();
  const segments = [];
  for (const line of lines) {
    for (let i = 0; i + 1 < line.stations.length; i++) {
      const a = line.stations[i];
      const b = line.stations[i + 1];
      const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (!seen.has(key)) {
        seen.add(key);
        segments.push({ from: a.id, to: b.id, fromName: a.name, toName: b.name, key });
      }
    }
  }
  return segments;
}

function SegmentItem({ seg, isSelected, onAdd, disabled }) {
  const cls = [
    'lr-segment-item',
    isSelected && 'lr-segment-item--selected',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      onClick={() => onAdd(seg)}
      disabled={isSelected || disabled}
    >
      {seg.fromName} ↔ {seg.toName}
    </button>
  );
}

SegmentItem.propTypes = {
  seg:        PropTypes.shape({ from: PropTypes.number, to: PropTypes.number, fromName: PropTypes.string, toName: PropTypes.string, key: PropTypes.string }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onAdd:      PropTypes.func.isRequired,
  disabled:   PropTypes.bool.isRequired,
};

function PlanningView({ game, network }) {
  const navigate = useNavigate();

  const [route, setRoute]   = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'done'
  const [error, setError]   = useState('');
  const inFlightRef         = useRef(false);

  const segments       = useMemo(() => buildSegments(network.lines), [network]);
  const selectedKeys   = useMemo(() => new Set(route.map(s => s.key)), [route]);
  const emptySet       = useMemo(() => new Set(), []);

  const currentTail = route.length === 0
    ? game.startStation.id
    : route[route.length - 1].to;

  const handleSubmit = async () => {
    if (inFlightRef.current || status !== 'idle') return;
    inFlightRef.current = true;
    setStatus('submitting');
    try {
      const result = await submitRoute(game.gameId, route.map(s => ({ from: s.from, to: s.to })));
      // inFlightRef intentionally not reset — component unmounts on navigate
      navigate(`/game/${game.gameId}/execution`, { state: { game, result } });
    } catch (err) {
      inFlightRef.current = false;
      setStatus('idle');
      setError(err.message ?? 'Could not submit your route. Please try again.');
    }
  };

  const removeLast = () => {
    if (status !== 'idle') return;
    setRoute(r => r.slice(0, -1));
  };

  const timeLeft = useCountdown(90, handleSubmit);

  const minutes  = Math.floor(timeLeft / 60);
  const seconds  = String(timeLeft % 60).padStart(2, '0');
  const timerCls = timeLeft <= 10 ? 'lr-timer--danger'
                 : timeLeft <= 30 ? 'lr-timer--warning'
                 : '';

  const addSegment = (seg) => {
    if (status !== 'idle' || selectedKeys.has(seg.key)) return;
    // Reverse only when the "to" end matches the tail — avoids backwards display for naturally-connected
    // segments. Disconnected segments are added as-is; server validates the full route after submission.
    if (seg.to === currentTail) {
      setRoute(r => [...r, { from: seg.to, to: seg.from, fromName: seg.toName, toName: seg.fromName, key: seg.key }]);
    } else {
      setRoute(r => [...r, seg]);
    }
  };

  return (
    <main className="lr-page">
      <div className="lr-planning-header">
        <div className="lr-mission">
          <span className="lr-mission-label">From</span>
          <span className="lr-mission-station">{game.startStation.name}</span>
          <span className="lr-mission-arrow">→</span>
          <span className="lr-mission-label">To</span>
          <span className="lr-mission-station">{game.destStation.name}</span>
        </div>
        <div className={`lr-timer ${timerCls}`}>{minutes}:{seconds}</div>
      </div>

      {error && <p className="lr-error lr-error--spaced">{error}</p>}

      <div className="lr-planning-body">
        <section>
          <p className="lr-card-title">Choose segments</p>
          <div className="lr-segment-list">
            {segments.map(seg => (
              <SegmentItem
                key={seg.key}
                seg={seg}
                isSelected={selectedKeys.has(seg.key)}
                onAdd={addSegment}
                disabled={status !== 'idle'}
              />
            ))}
          </div>
        </section>

        <section className="lr-planning-right">
          <div className="lr-card">
            <p className="lr-card-title">
              Your route
              <span className="lr-route-count">{route.length} segment{route.length !== 1 ? 's' : ''}</span>
            </p>
            <ol className="lr-route-chain">
              {route.length === 0
                ? <li className="lr-route-chain__empty">No segments selected yet</li>
                : route.map(seg => (
                    <li key={seg.key} className="lr-route-chain__station">
                      {seg.fromName} → {seg.toName}
                    </li>
                  ))
              }
            </ol>
            {route.length > 0 && (
              <button className="lr-btn-remove-last" onClick={removeLast} disabled={status !== 'idle'}>
                ← Remove last
              </button>
            )}
          </div>

          {/* lines={[]} intentional — planning mode shows station dots only, not line tracks */}
          <MetroMap mode="planning" lines={[]} stations={network.stations} interchanges={emptySet} />

          {/* intentional: disabled check omits timeLeft === 0 (Bug #2, fixed in fix/planning-timer) */}
          <button className="lr-btn-primary" onClick={handleSubmit} disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting…' : 'Submit Route'}
          </button>
        </section>
      </div>
    </main>
  );
}

PlanningView.propTypes = {
  game:    PropTypes.shape({ gameId: PropTypes.number, startStation: PropTypes.shape({ id: PropTypes.number, name: PropTypes.string }), destStation: PropTypes.shape({ id: PropTypes.number, name: PropTypes.string }) }).isRequired,
  network: PropTypes.shape({ lines: PropTypes.array, stations: PropTypes.array }).isRequired,
};

export default function PlanningPage() {
  const { state } = useLocation();
  const { game, network } = state ?? {};
  if (!game || !network) return <Navigate to="/setup" replace />;
  return <PlanningView game={game} network={network} />;
}
