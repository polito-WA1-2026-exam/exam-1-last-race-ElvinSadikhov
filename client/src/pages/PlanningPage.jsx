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

function SegmentItem({ seg, isSelected, isUnreachable, onAdd, disabled }) {
  const cls = [
    'lr-segment-item',
    isSelected    && 'lr-segment-item--selected',
    isUnreachable && 'lr-segment-item--unreachable',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      onClick={() => onAdd(seg)}
      disabled={isSelected || isUnreachable || disabled}
    >
      {seg.fromName} ↔ {seg.toName}
    </button>
  );
}

SegmentItem.propTypes = {
  seg:           PropTypes.shape({ from: PropTypes.number, to: PropTypes.number, fromName: PropTypes.string, toName: PropTypes.string, key: PropTypes.string }).isRequired,
  isSelected:    PropTypes.bool.isRequired,
  isUnreachable: PropTypes.bool.isRequired,
  onAdd:         PropTypes.func.isRequired,
  disabled:      PropTypes.bool.isRequired,
};

function PlanningView({ game, network }) {
  const navigate = useNavigate();

  const [route, setRoute]   = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'done'
  const [error, setError]   = useState('');
  const inFlightRef         = useRef(false);

  const segments = useMemo(() => buildSegments(network.lines), [network]);

  const currentTail = route.length === 0
    ? game.startStation.id
    : route[route.length - 1].to;

  const selectedKeys = useMemo(() => new Set(route.map(s => s.key)), [route]);

  const handleSubmit = async () => {
    if (inFlightRef.current || status !== 'idle') return;
    inFlightRef.current = true;
    setStatus('submitting');
    try {
      const result = route.length === 0
        ? { valid: false, steps: [], finalScore: 0 }
        : await submitRoute(game.gameId, route.map(s => ({ from: s.from, to: s.to })));
      navigate(`/game/${game.gameId}/execution`, { state: { game, result } });
    } catch {
      inFlightRef.current = false;
      setStatus('idle');
      setError('Could not submit your route. Please try again.');
    }
  };

  const timeLeft = useCountdown(90, handleSubmit);

  const minutes  = Math.floor(timeLeft / 60);
  const seconds  = String(timeLeft % 60).padStart(2, '0');
  const timerCls = timeLeft <= 10 ? 'lr-timer--danger'
                 : timeLeft <= 30 ? 'lr-timer--warning'
                 : '';

  const addSegment = (seg) => {
    if (status !== 'idle' || selectedKeys.has(seg.key)) return;
    if (seg.from === currentTail) {
      setRoute(r => [...r, seg]);
    } else if (seg.to === currentTail) {
      setRoute(r => [...r, { from: seg.to, to: seg.from, fromName: seg.toName, toName: seg.fromName, key: seg.key }]);
    }
  };

  const removeLast = () => {
    if (status !== 'idle') return;
    setRoute(r => r.slice(0, -1));
  };

  const chain = [game.startStation.name, ...route.map(s => s.toName)];

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
                isUnreachable={route.length > 0 && !selectedKeys.has(seg.key) && seg.from !== currentTail && seg.to !== currentTail}
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
              {chain.map((name, i) => (
                <li key={i} className={`lr-route-chain__station${i === 0 ? ' lr-route-chain__start' : ''}`}>
                  {name}
                </li>
              ))}
            </ol>
            {route.length > 0 && (
              <button className="lr-btn-remove-last" onClick={removeLast} disabled={status !== 'idle'}>
                ← Remove last
              </button>
            )}
          </div>

          <MetroMap mode="planning" lines={[]} stations={network.stations} interchanges={new Set()} />

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
