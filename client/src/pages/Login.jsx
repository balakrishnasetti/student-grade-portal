import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap auth-page">
      <section className="auth-card glow-card">
        <p className="eyebrow">STUDENT GRADE PORTAL</p>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to continue to your classroom workspace.</p>
        {error && <p className="alert error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" value={form.password} onChange={updateField} autoComplete="current-password" required />
          </div>
          <button className="btn primary auth-submit" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch muted">Need an account? <Link to="/register">Register here</Link></p>
      </section>
    </main>
  );
}
