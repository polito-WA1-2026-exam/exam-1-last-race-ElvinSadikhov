import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user } = useUser();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

ProtectedRoute.propTypes = { children: PropTypes.node.isRequired };
