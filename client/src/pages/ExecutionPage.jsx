import { useLocation, Navigate } from 'react-router-dom';

export default function ExecutionPage() {
  const { state } = useLocation();
  if (!state?.game) return <Navigate to="/setup" replace />;
  return <main className="lr-page"><p>Execution — coming soon</p></main>;
}
