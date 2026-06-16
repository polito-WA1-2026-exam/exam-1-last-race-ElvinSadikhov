import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api.js';
import { useUser } from '../context/UserContext.jsx';

const PHASES = [
  { color: 'var(--line-red)',    textColor: '#fff',     label: 'Setup',     desc: 'Study the full metro network map before the race begins.' },
  { color: 'var(--line-blue)',   textColor: '#fff',     label: 'Planning',  desc: 'Build your route in 90 seconds — lines are hidden.' },
  { color: 'var(--line-green)',  textColor: '#fff',     label: 'Execution', desc: 'Travel each segment and face random events along the way.' },
  { color: 'var(--line-yellow)', textColor: '#1A1614',  label: 'Result',    desc: 'See how many coins you have left. Best score goes to the ranking.' },
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
      setError(err.error ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lr-login-page">
      <div className="lr-login-left">
        <h1 className="lr-title">Last <span>Race</span></h1>
        <p className="lr-subtitle">
          Plan a metro route from memory before time runs out.
          Each segment brings a random event — reach your destination with the most coins.
        </p>

        <ol className="lr-phases">
          {PHASES.map((p, i) => (
            <li key={i} className="lr-phase-item">
              <span className="lr-phase-num" style={{ background: p.color, color: p.textColor }}>
                {i + 1}
              </span>
              <div>
                <strong>{p.label}</strong>
                <span className="lr-phase-desc">{p.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="lr-login-right">
        <div className="lr-card">
          <h2 className="lr-card-title">Sign in to play</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="lr-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="lr-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="lr-error">{error}</p>}
            <button type="submit" className="lr-btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
