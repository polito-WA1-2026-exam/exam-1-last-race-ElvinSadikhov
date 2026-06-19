import { useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import MetroMap from '../components/MetroMap.jsx';
import useCountdown from '../hooks/useCountdown.js';
import { submitRoute } from '../api.js';

function buildSegments(lines) {
  const seen = new Set();
  const segs = [];
  for (const line of lines) {
    for (let i = 0; i + 1 < line.stations.length; i++) {
      const a = line.stations[i];
      const b = line.stations[i + 1];
      const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (!seen.has(key)) {
        seen.add(key);
        segs.push({ from: a.id, to: b.id, fromName: a.name, toName: b.name, key });
      }
    }
  }
  return segs;
}

function SegmentItem({ seg, isSelected, isUnreachable, onAdd, disabled }) {
  const cls = [
    'lr-segment-item',
    isSelected    ? 'lr-segment-item--selected'    : '',
    isUnreachable ? 'lr-segment-item--unreachable' : '',
  ].join(' ').trim();

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
  seg:          PropTypes.shape({ from: PropTypes.number, to: PropTypes.number, fromName: PropTypes.string, toName: PropTypes.string, key: PropTypes.string }).isRequired,
  isSelected:   PropTypes.bool.isRequired,
  isUnreachable: PropTypes.bool.isRequired,
  onAdd:        PropTypes.func.isRequired,
  disabled:     PropTypes.bool.isRequired,
};

export default function PlanningPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { game, network } = location.state ?? {};

  const [route, setRoute]           = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  const segments = useMemo(
    () => (network?.lines ? buildSegments(network.lines) : []),
    [network],
  );

  const currentTail = route.length === 0
    ? game?.startStation?.id
    : route[route.length - 1].to;

  const selectedKeys = useMemo(() => new Set(route.map(s => s.key)), [route]);

  const handleSubmit = useCallback(async () => {
    if (!game || submitting || submitted) return;
    setSubmitting(true);
    setSubmitted(true);
    if (route.length === 0) {
      navigate(`/game/${game.gameId}/execution`, {
        state: { game, result: { valid: false, steps: [], finalScore: 0 } },
      });
      return;
    }
    try {
      const result = await submitRoute(
        game.gameId,
        route.map(s => ({ from: s.from, to: s.to })),
      );
      navigate(`/game/${game.gameId}/execution`, { state: { game, result } });
    } catch {
      setError('Could not submit your route. Please try again.');
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [game, submitting, submitted, route, navigate]);

  const timeLeft = useCountdown(90, handleSubmit);

  if (!game || !network) return <Navigate to="/setup" replace />;

  const minutes   = Math.floor(timeLeft / 60);
  const seconds   = String(timeLeft % 60).padStart(2, '0');
  const timerCls  = timeLeft <= 10 ? 'lr-timer--danger'
                  : timeLeft <= 30 ? 'lr-timer--warning'
                  : '';

  const addSegment = (seg) => {
    if (submitting || submitted || selectedKeys.has(seg.key)) return;
    if (seg.from === currentTail) {
      setRoute(r => [...r, seg]);
    } else if (seg.to === currentTail) {
      setRoute(r => [...r, { from: seg.to, to: seg.from, fromName: seg.toName, toName: seg.fromName, key: seg.key }]);
    }
  };

  const removeLast = () => {
    if (submitting || submitted) return;
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

      {error && <p className="lr-error" style={{ marginBottom: '1rem' }}>{error}</p>}

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
                disabled={submitted}
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
              {chain.map(name => (
                <li key={name} className={`lr-route-chain__station${name === game.startStation.name ? ' lr-route-chain__start' : ''}`}>
                  {name}
                </li>
              ))}
            </ol>
            {route.length > 0 && (
              <button className="lr-btn-remove-last" onClick={removeLast} disabled={submitting || submitted}>
                ← Remove last
              </button>
            )}
          </div>

          <MetroMap mode="planning" lines={[]} stations={network.stations} interchanges={new Set()} />

          <button className="lr-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Route'}
          </button>
        </section>
      </div>
    </main>
  );
}
