import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import MetroMap from '../components/MetroMap.jsx';
import { getNetwork, startGame } from '../api.js';

function deriveInterchanges(lines) {
  const seen = new Set();
  const interchanges = new Set();
  for (const line of lines)
    for (const s of line.stations)
      seen.has(s.name) ? interchanges.add(s.name) : seen.add(s.name);
  return interchanges;
}

export default function SetupPage() {
  const [network, setNetwork]               = useState(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getNetwork()
      .then(setNetwork)
      .catch(() => setError('Could not load the network. Refresh to try again.'))
      .finally(() => setNetworkLoading(false));
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const game = await startGame();
      setLoading(false);
      navigate(`/game/${game.gameId}/planning`, { state: { game, network } });
    } catch {
      setError('Could not start game. Please try again.');
      setLoading(false);
    }
  };

  const lines        = network?.lines ?? [];
  const stations     = network?.stations ?? [];
  const interchanges = lines.length ? deriveInterchanges(lines) : new Set();

  return (
    <Container style={{ maxWidth: 1100 }} className="py-4 px-4 pb-5">
      <Row className="align-items-end mb-3">
        <Col>
          <h1 className="fs-4 fw-bold mb-1">Study the Network</h1>
          <p className="text-muted small mb-0">
            Memorise the lines and connections — they will be hidden during planning.
          </p>
        </Col>
        <Col xs="auto" className="d-flex flex-column align-items-end gap-2">
          {error && (
            <Alert variant="danger" className="small mb-0" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Button variant="dark" className="text-uppercase fw-bold text-nowrap px-4"
                  onClick={handleStart} disabled={loading || networkLoading}>
            {loading ? 'Starting…' : "I'm ready — Start Planning"}
          </Button>
        </Col>
      </Row>

      <MetroMap mode="full" lines={lines} stations={stations} interchanges={interchanges} />

      <div className="d-flex gap-2 mt-3 flex-wrap">
        {lines.map(line => (
          <span key={line.name} className="rounded-pill text-uppercase small fw-bold px-3 py-1 text-white"
                style={{ background: line.color }}>
            {line.name}
          </span>
        ))}
      </div>
    </Container>
  );
}
