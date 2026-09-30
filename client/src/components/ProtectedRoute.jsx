import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ children, teacherOnly = false }) {
  const { user, loading, isTeacher } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Checking your session..." />;
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;
  if (teacherOnly && !isTeacher) return <Navigate to="/dashboard" replace />;

  return children;
}
