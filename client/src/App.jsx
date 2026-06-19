import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { getMe } from './api.js';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import PlanningPage from './pages/PlanningPage.jsx';
import ExecutionPage from './pages/ExecutionPage.jsx';

function AppInner() {
  const { user, setUser } = useUser();

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, [setUser]);

  if (user === undefined) return null;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/setup" replace /> : <LoginPage />} />
        <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
        <Route path="/game/:id/planning"   element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
        <Route path="/game/:id/execution"  element={<ProtectedRoute><ExecutionPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="lr-stripe" />
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
