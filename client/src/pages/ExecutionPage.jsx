import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Container, Card, Button } from 'react-bootstrap';

function ExecutionView({ game, result }) {
  const navigate = useNavigate();
  const { valid, steps, finalScore } = result;
  const safeSteps = steps ?? [];

  const [revealed, setRevealed] = useState(1);

  const allRevealed = revealed >= safeSteps.length;

  const missionBadge = (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className="lr-mission-label">From</span>
      <span className="fw-bold">{game.startStation.name}</span>
      <span className="lr-mission-arrow mx-1">→</span>
      <span className="lr-mission-label">To</span>
      <span className="fw-bold">{game.destStation.name}</span>
    </div>
  );

  if (!valid || safeSteps.length === 0) {
    return (
      <Container style={{ maxWidth: 1100 }} className="py-4 px-4 pb-5">
        <div className="lr-planning-header mb-4">{missionBadge}</div>
        <Card className="border text-center mt-4">
          <Card.Body className="p-4">
            <p className="fs-4 fw-bold mb-1" style={{ color: 'var(--line-red)' }}>Route Invalid</p>
            <p className="text-muted">Your route did not connect the assigned stations correctly.</p>
            <p className="text-muted mt-2 mb-4">Final score: <strong>0 coins</strong></p>
            <Button variant="dark" className="text-uppercase fw-bold px-4" onClick={() => navigate('/setup')}>
              Play Again
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container style={{ maxWidth: 1100 }} className="py-4 px-4 pb-5">
      <div className="lr-planning-header mb-4">
        {missionBadge}
        <span className="fw-bold font-monospace" style={{ color: 'rgba(245,240,232,0.6)' }}>
          {revealed} / {safeSteps.length}
        </span>
      </div>

      <div className="d-flex flex-column gap-3 mb-4">
        {safeSteps.slice(0, revealed).map((step, i) => {
          const effect = step.event?.effect ?? 0;
          return (
            <Card key={`${step.fromName}-${step.toName}-${i}`} className="border lr-step-card">
              <Card.Body className="py-3 px-4">
                <div className="d-flex align-items-baseline gap-3 mb-1">
                  <span className="text-muted text-uppercase fw-bold flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                    Step {i + 1}
                  </span>
                  <span className="fw-bold">{step.fromName} → {step.toName}</span>
                </div>
                <p className="text-secondary small mb-1">{step.event?.description ?? 'No event'}</p>
                <p className={`small fw-semibold mb-0${effect >= 0 ? ' text-success' : ' text-danger'}`}>
                  {effect >= 0 ? '+' : ''}{effect} → {step.coinsAfter} coins remaining
                </p>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {allRevealed ? (
        <Card className="border text-center mt-3">
          <Card.Body className="p-4">
            <p className="text-uppercase fw-bold text-muted small mb-2">Journey complete</p>
            <p className={`lr-score-value${finalScore === 0 ? ' lr-score-value--zero' : ''}`}>{finalScore}</p>
            <p className="text-muted text-uppercase fw-bold small mb-4" style={{ letterSpacing: '0.09em' }}>coins</p>
            <Button variant="dark" className="text-uppercase fw-bold px-4" onClick={() => navigate('/setup')}>
              Play Again
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Button variant="dark" className="text-uppercase fw-bold px-4"
                onClick={() => setRevealed(r => r + 1)}>
          Reveal next step →
        </Button>
      )}
    </Container>
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
