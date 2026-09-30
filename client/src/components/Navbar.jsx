import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const teacherLinks = [
  ['/dashboard', 'Dashboard'],
  ['/students', 'Students'],
  ['/marks', 'Marks'],
  ['/toppers', 'Toppers'],
  ['/class-summary', 'Class summary'],
  ['/subject-average', 'Subject average'],
];
const studentLinks = [
  ['/dashboard', 'Dashboard'],
  ['/students', 'My record'],
  ['/marks', 'My marks'],
];

export default function Navbar() {
  const { user, isTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const links = isTeacher ? teacherLinks : studentLinks;

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="navbar glass-nav">
      <NavLink className="brand" to="/dashboard">Grade Portal</NavLink>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map(([path, label]) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-user glass-user-pill">
        <span>{user?.name} · {user?.role}</span>
        <button className="btn ghost sm" type="button" onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
