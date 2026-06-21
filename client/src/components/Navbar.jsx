import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Modal } from 'react-bootstrap';
import { useUser } from '../context/UserContext.jsx';
import { logout } from '../api.js';

export default function LRNavbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setShowConfirm(false);
    try { await logout(); } catch { /* session may already be gone */ }
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <Navbar style={{ background: 'var(--nav-bg)' }} data-bs-theme="dark">
        <Container fluid className="px-4">
          <Navbar.Brand as={Link} to={user ? '/setup' : '/'} className="fw-bold text-uppercase ls-wide">
            Last <span style={{ color: 'var(--line-red)' }}>Race</span>
          </Navbar.Brand>
          {user && (
            <Nav className="ms-auto align-items-center gap-3">
              <Nav.Link as={Link} to="/ranking" className="text-uppercase fw-semibold small">Ranking</Nav.Link>
              <span className="text-white-50 small">{user.name}</span>
              <Button variant="outline-light" size="sm" onClick={() => setShowConfirm(true)}>Logout</Button>
            </Nav>
          )}
        </Container>
      </Navbar>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered size="sm">
        <Modal.Body className="p-4 text-center">
          <p className="fw-bold mb-3">Are you sure you want to log out?</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="dark" onClick={handleLogout}>Log out</Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
