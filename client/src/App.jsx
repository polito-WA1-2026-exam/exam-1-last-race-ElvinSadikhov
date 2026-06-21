import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { getMe } from './api.js';
import LRNavbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import PlanningPage from './pages/PlanningPage.jsx';
import ExecutionPage from './pages/ExecutionPage.jsx';
import RankingPage from './pages/RankingPage.jsx';

function AppInner() {
  const { user, setUser } = useUser();

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;

  return (
    <>
      <LRNavbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/setup" replace /> : <LoginPage />} />
        <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
        <Route path="/game/:id/planning"   element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
        <Route path="/game/:id/execution"  element={<ProtectedRoute><ExecutionPage /></ProtectedRoute>} />
        <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppInner />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
