import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { login } from '../api.js';
import { useUser } from '../context/UserContext.jsx';

const PHASES = [
  { color: 'var(--line-red)',    textColor: '#fff',    label: 'Setup',     desc: 'Study the full metro network before the race begins.' },
  { color: 'var(--line-blue)',   textColor: '#fff',    label: 'Planning',  desc: 'Build your route in 90 seconds — lines are hidden.' },
  { color: 'var(--line-green)',  textColor: '#fff',    label: 'Execution', desc: 'Travel each segment and face random events along the way.' },
  { color: 'var(--line-yellow)', textColor: '#1A1614', label: 'Result',    desc: 'See how many coins you have left. Best score goes to the ranking.' },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      navigate('/setup');
    } catch (err) {
      setError(err.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 960, marginTop: '4rem', marginBottom: '5rem' }}>
      <Row className="g-5 align-items-start">
        <Col>
          <h1 className="lr-title">Last <span>Race</span></h1>
          <p className="text-muted mb-4">
            Plan a metro route from memory before time runs out.
            Each segment brings a random event — reach your destination with the most coins.
          </p>
          <ol className="list-unstyled d-flex flex-column gap-3">
            {PHASES.map((p, i) => (
              <li key={i} className="d-flex align-items-start gap-3">
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: 28, height: 28, background: p.color, color: p.textColor, fontSize: '0.78rem', marginTop: 2 }}
                >
                  {i + 1}
                </span>
                <div>
                  <strong>{p.label}</strong>
                  <span className="text-muted small d-block">{p.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </Col>

        <Col xs={12} md="auto" style={{ width: 380 }}>
          <Card className="border">
            <Card.Body className="p-4">
              <p className="text-uppercase fw-bold text-muted small mb-4">Sign in to play</p>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="loginEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="loginPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                {error && (
                  <Alert variant="danger" className="py-2 px-3 small" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}
                <Button type="submit" variant="dark" className="w-100 text-uppercase fw-bold" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
