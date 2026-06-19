import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [network, setNetwork]           = useState(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
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
    <main className="lr-page">
      <div className="lr-setup-header">
        <div>
          <h1 className="lr-setup-title">Study the Network</h1>
          <p className="lr-setup-sub">
            Memorise the lines and connections — they will be hidden during planning.
          </p>
        </div>
        <div className="lr-setup-action">
          {error && <p className="lr-error">{error}</p>}
          <button className="lr-btn-primary lr-btn-start" onClick={handleStart} disabled={loading || networkLoading}>
            {loading ? 'Starting…' : "I'm ready — Start Planning"}
          </button>
        </div>
      </div>

      <MetroMap mode="full" lines={lines} stations={stations} interchanges={interchanges} />

      <div className="lr-line-badges">
        {lines.map(line => (
          <span key={line.name} className="lr-line-badge"
                style={{ background: line.color, color: 'var(--nav-text)' }}>
            {line.name}
          </span>
        ))}
      </div>
    </main>
  );
}
