import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import ClassSummary from './pages/ClassSummary';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import MarkForm from './pages/MarkForm';
import Marks from './pages/Marks';
import ReportCard from './pages/ReportCard';
import Register from './pages/Register';
import SubjectAverage from './pages/SubjectAverage';
import StudentForm from './pages/StudentForm';
import Students from './pages/Students';
import Toppers from './pages/Toppers';
import Placeholder from './pages/Placeholder';

function ProtectedPage({ title, teacherOnly = false }) {
  return (
    <ProtectedRoute teacherOnly={teacherOnly}>
      <Navbar />
      <Placeholder title={title} />
    </ProtectedRoute>
  );
}

function PublicPage({ title }) {
  return <Placeholder title={title} />;
}

function NotFound() {
  return <Placeholder title="Page not found" />;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <div key={location.pathname} className="route-transition">
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<ProtectedRoute><Navbar /><Dashboard /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Navbar /><Students /></ProtectedRoute>} />
          <Route path="/students/new" element={<ProtectedRoute teacherOnly><Navbar /><StudentForm /></ProtectedRoute>} />
          <Route path="/students/:id/edit" element={<ProtectedRoute teacherOnly><Navbar /><StudentForm /></ProtectedRoute>} />
          <Route path="/students/:id/report-card" element={<ProtectedRoute><Navbar /><ReportCard /></ProtectedRoute>} />
          <Route path="/marks" element={<ProtectedRoute><Navbar /><Marks /></ProtectedRoute>} />
          <Route path="/marks/new" element={<ProtectedRoute teacherOnly><Navbar /><MarkForm /></ProtectedRoute>} />
          <Route path="/marks/:id/edit" element={<ProtectedRoute teacherOnly><Navbar /><MarkForm /></ProtectedRoute>} />
          <Route path="/toppers" element={<ProtectedRoute teacherOnly><Navbar /><Toppers /></ProtectedRoute>} />
          <Route path="/class-summary" element={<ProtectedRoute teacherOnly><Navbar /><ClassSummary /></ProtectedRoute>} />
          <Route path="/subject-average" element={<ProtectedRoute teacherOnly><Navbar /><SubjectAverage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
