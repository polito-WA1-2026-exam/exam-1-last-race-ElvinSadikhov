import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Table, Button, Alert } from 'react-bootstrap';
import { useUser } from '../context/UserContext.jsx';
import { getRanking } from '../api.js';

const MEDAL_COLORS = ['#C9941A', '#8A8070', '#4A4440'];

export default function RankingPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getRanking()
      .then(data => { setRows(data);  setLoading(false); })
      .catch(()  => { setError('Could not load ranking. Please try again.'); setLoading(false); });
  }, []);

  return (
    <Container style={{ maxWidth: 1100 }} className="py-4 px-4 pb-5">
      <Row className="align-items-end mb-4">
        <Col>
          <h1 className="fs-4 fw-bold mb-1">General Ranking</h1>
          <p className="text-muted small mb-0">Best score per player across all games.</p>
        </Col>
        <Col xs="auto">
          <Button variant="dark" className="text-uppercase fw-bold text-nowrap px-4" onClick={() => navigate('/setup')}>
            Play Now
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="small" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <p className="text-muted mt-4">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted mt-4">No games completed yet.</p>
      ) : (
        <Table hover className="mt-2">
          <thead>
            <tr>
              <th className="text-uppercase text-muted small fw-bold border-bottom border-2"
                  style={{ width: '3rem', textAlign: 'center' }}>#</th>
              <th className="text-uppercase text-muted small fw-bold border-bottom border-2">Player</th>
              <th className="text-uppercase text-muted small fw-bold border-bottom border-2 text-end">Best Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isMe = row.userName === user?.name;
              return (
                <tr key={row.userName} style={isMe ? { background: 'rgba(201,148,26,0.09)' } : undefined}>
                  <td className="text-center fw-bold small"
                      style={{ color: i < 3 ? MEDAL_COLORS[i] : 'var(--text-muted)', borderLeft: isMe ? '3px solid var(--line-yellow)' : undefined }}>
                    {i + 1}
                  </td>
                  <td className={isMe ? 'fw-bold' : ''}>{row.userName}</td>
                  <td className="text-end fw-bold font-monospace">{row.bestScore}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
