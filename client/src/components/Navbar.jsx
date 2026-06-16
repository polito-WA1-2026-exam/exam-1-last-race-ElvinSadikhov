import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import { logout } from '../api.js';

export default function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="lr-nav">
      <Link to={user ? '/setup' : '/'} className="lr-nav-brand">
        Last <span>Race</span>
      </Link>
      {user && (
        <div className="lr-nav-right">
          <Link to="/ranking" className="lr-nav-link">Ranking</Link>
          <span className="lr-nav-user">{user.name}</span>
          <button onClick={handleLogout} className="lr-nav-btn">Logout</button>
        </div>
      )}
    </nav>
  );
}
