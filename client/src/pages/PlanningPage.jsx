import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Container, Row, Col, Card, ListGroup, Button, Alert, Modal } from 'react-bootstrap';
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

function PlanningView({ game, network }) {
  const navigate = useNavigate();

  const [route, setRoute]     = useState([]);
  const [status, setStatus]   = useState('idle');
  const [error, setError]     = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const submittingRef         = useRef(false);

  const segments     = useMemo(() => buildSegments(network.lines), [network]);
  const selectedKeys = useMemo(() => new Set(route.map(s => s.key)), [route]);
  const emptySet     = useMemo(() => new Set(), []);

  const currentTail = route.length === 0
    ? game.startStation.id
    : route[route.length - 1].to;

  const handleSubmit = async () => {
    if (submittingRef.current || status !== 'idle') return;
    submittingRef.current = true;
    setStatus('submitting');
    try {
      const result = await submitRoute(game.gameId, route.map(s => ({ from: s.from, to: s.to })));
      navigate(`/game/${game.gameId}/execution`, { state: { game, result } });
    } catch (err) {
      submittingRef.current = false;
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

  const toggleSegment = (seg) => {
    if (status !== 'idle') return;
    if (selectedKeys.has(seg.key)) {
      setRoute(r => r.filter(s => s.key !== seg.key));
    } else if (seg.to === currentTail) {
      setRoute(r => [...r, { from: seg.to, to: seg.from, fromName: seg.toName, toName: seg.fromName, key: seg.key }]);
    } else {
      setRoute(r => [...r, seg]);
    }
  };

  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMapOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapOpen]);

  return (
    <Container style={{ maxWidth: 1100 }} className="py-4 px-4 pb-5">
      <div className="lr-planning-header mb-4">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="lr-mission-label">From</span>
          <span className="fw-bold">{game.startStation.name}</span>
          <span className="lr-mission-arrow mx-1">→</span>
          <span className="lr-mission-label">To</span>
          <span className="fw-bold">{game.destStation.name}</span>
        </div>
        <div className={`lr-timer ${timerCls}`}>{minutes}:{seconds}</div>
      </div>

      {error && (
        <Alert variant="danger" className="small" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row className="g-4 align-items-start">
        <Col>
          <p className="text-uppercase fw-bold text-muted small mb-3">Choose segments</p>
          <ListGroup>
            {segments.map(seg => (
              <ListGroup.Item
                key={seg.key}
                as="button"
                action
                active={selectedKeys.has(seg.key)}
                disabled={status !== 'idle'}
                onClick={() => toggleSegment(seg)}
                className="lr-segment-item text-start"
              >
                {seg.fromName} ↔ {seg.toName}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        <Col xs={12} md="auto" style={{ width: 300 }}>
          <div className="d-flex flex-column gap-3">
            <Card className="border">
              <Card.Body>
                <p className="text-uppercase fw-bold text-muted small mb-3 d-flex justify-content-between align-items-center">
                  Your route
                  <span className="fw-normal" style={{ textTransform: 'none', letterSpacing: 0 }}>
                    {route.length} segment{route.length !== 1 ? 's' : ''}
                  </span>
                </p>
                <ol className="list-unstyled mb-3">
                  {route.length === 0
                    ? <li className="text-muted small fst-italic ps-2">No segments selected yet</li>
                    : route.map(seg => (
                        <li key={seg.key} className="small text-secondary ps-2 mb-1"
                            style={{ borderLeft: '2px solid var(--border)' }}>
                          {seg.fromName} → {seg.toName}
                        </li>
                      ))
                  }
                </ol>
                {route.length > 0 && (
                  <Button variant="link" size="sm" className="p-0 text-muted"
                          onClick={removeLast} disabled={status !== 'idle'}>
                    ← Remove last
                  </Button>
                )}
              </Card.Body>
            </Card>

            <button className="lr-map-thumb" onClick={() => setMapOpen(true)} title="Click to enlarge map">
              <MetroMap mode="stationsOnly" lines={[]} stations={network.stations} interchanges={emptySet} />
              <span className="lr-map-thumb-hint">
                <i className="bi bi-arrows-fullscreen me-1" />Enlarge
              </span>
            </button>

            <Button variant="dark" className="w-100 text-uppercase fw-bold"
                    onClick={handleSubmit} disabled={status === 'submitting' || timeLeft === 0}>
              {status === 'submitting' ? 'Submitting…' : 'Submit Route'}
            </Button>
          </div>
        </Col>
      </Row>

      <Modal show={mapOpen} onHide={() => setMapOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-uppercase fw-bold small text-muted">Metro Network</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <MetroMap mode="stationsOnly" lines={[]} stations={network.stations} interchanges={emptySet} />
        </Modal.Body>
      </Modal>
    </Container>
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
