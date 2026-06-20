import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import { getRanking } from '../api.js';

export default function RankingPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    getRanking()
      .then(data  => { setRows(data);  setLoading(false); })
      .catch(()   => { setError('Could not load ranking. Please try again.'); setLoading(false); });
  }, []);

  return (
    <main className="lr-page">
      <div className="lr-ranking-header">
        <div>
          <h1 className="lr-setup-title">General Ranking</h1>
          <p className="lr-setup-sub">Best score per player across all games.</p>
        </div>
        <button className="lr-btn-primary lr-btn-start" onClick={() => navigate('/setup')}>
          Play Now
        </button>
      </div>

      {error && <p className="lr-error">{error}</p>}

      {loading ? (
        <p className="lr-ranking-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="lr-ranking-empty">No games completed yet.</p>
      ) : (
        <table className="lr-ranking-table">
          <thead>
            <tr>
              <th className="lr-ranking-th lr-ranking-th--rank">#</th>
              <th className="lr-ranking-th">Player</th>
              <th className="lr-ranking-th lr-ranking-th--score">Best Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.userName}
                className={`lr-ranking-row${row.userName === user?.name ? ' lr-ranking-row--me' : ''}`}
              >
                <td className="lr-ranking-td lr-ranking-td--rank">{i + 1}</td>
                <td className="lr-ranking-td">{row.userName}</td>
                <td className="lr-ranking-td lr-ranking-td--score">{row.bestScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
