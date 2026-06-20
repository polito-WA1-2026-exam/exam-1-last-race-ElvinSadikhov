import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function ExecutionView({ game, result }) {
  const navigate = useNavigate();
  const { valid, steps, finalScore } = result;
  const safeSteps = steps ?? [];

  // Bug #3: should be useState(0) — first step is auto-revealed on load
  const [revealed, setRevealed] = useState(1);

  const allRevealed = revealed >= safeSteps.length;

  const missionBadge = (
    <div className="lr-mission">
      <span className="lr-mission-label">From</span>
      <span className="lr-mission-station">{game.startStation.name}</span>
      <span className="lr-mission-arrow">→</span>
      <span className="lr-mission-label">To</span>
      <span className="lr-mission-station">{game.destStation.name}</span>
    </div>
  );

  if (!valid || safeSteps.length === 0) {
    return (
      <main className="lr-page">
        <div className="lr-execution-header">{missionBadge}</div>
        <div className="lr-card lr-execution-invalid">
          <p className="lr-execution-invalid-title">Route Invalid</p>
          <p className="lr-setup-sub">Your route did not connect the assigned stations correctly.</p>
          <p className="lr-execution-score-line">Final score: <strong>0 coins</strong></p>
          <button className="lr-btn-primary" onClick={() => navigate('/setup')}>
            Play Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="lr-page">
      <div className="lr-execution-header">
        {missionBadge}
        <div className="lr-execution-progress">{revealed} / {safeSteps.length}</div>
      </div>

      <div className="lr-steps-list">
        {safeSteps.slice(0, revealed).map((step, i) => {
          const effect = step.event?.effect ?? 0;
          return (
            <div key={i} className="lr-step-card">
              <div className="lr-step-header">
                <span className="lr-step-num">Step {i + 1}</span>
                <span className="lr-step-segment">{step.fromName} → {step.toName}</span>
              </div>
              <p className="lr-step-event">{step.event?.description ?? 'No event'}</p>
              <p className={`lr-step-coins${effect >= 0 ? ' lr-step-coins--gain' : ' lr-step-coins--loss'}`}>
                {effect >= 0 ? '+' : ''}{effect} → {step.coinsAfter} coins remaining
              </p>
            </div>
          );
        })}
      </div>

      {allRevealed ? (
        <div className="lr-card lr-score-card">
          <p className="lr-card-title">Journey complete</p>
          <p className="lr-score-value">{finalScore}</p>
          <p className="lr-score-label">coins</p>
          <button className="lr-btn-primary" onClick={() => navigate('/setup')}>
            Play Again
          </button>
        </div>
      ) : (
        <button className="lr-btn-primary" onClick={() => setRevealed(r => r + 1)}>
          Reveal next step →
        </button>
      )}
    </main>
  );
}

ExecutionView.propTypes = {
  game: PropTypes.shape({
    startStation: PropTypes.shape({ name: PropTypes.string }).isRequired,
    destStation:  PropTypes.shape({ name: PropTypes.string }).isRequired,
  }).isRequired,
  result: PropTypes.shape({
    valid:      PropTypes.bool.isRequired,
    steps:      PropTypes.array,
    finalScore: PropTypes.number.isRequired,
  }).isRequired,
};

export default function ExecutionPage() {
  const { state } = useLocation();
  if (!state?.game || !state?.result) return <Navigate to="/setup" replace />;
  return <ExecutionView game={state.game} result={state.result} />;
}
