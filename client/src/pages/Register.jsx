import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher', teacherRegistrationCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">STUDENT GRADE PORTAL</p>
        <h1>Create an account</h1>
        <p className="muted">Set up access to the grade portal.</p>
        {error && <p className="alert error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="register-name">Full name</label>
            <input id="register-name" name="name" type="text" value={form.name} onChange={updateField} autoComplete="name" minLength="2" maxLength="60" required />
          </div>
          <div className="form-field">
            <label htmlFor="register-email">Email</label>
            <input id="register-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
          </div>
          <div className="form-field">
            <label htmlFor="register-password">Password</label>
            <input id="register-password" name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="6" required />
          </div>
          <div className="form-field">
            <label htmlFor="register-role">Account type</label>
            <select id="register-role" name="role" value={form.role} onChange={updateField}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          {form.role === 'teacher' ? (
            <div className="form-field">
              <label htmlFor="teacher-registration-code">Teacher registration code</label>
              <input id="teacher-registration-code" name="teacherRegistrationCode" type="password" value={form.teacherRegistrationCode} onChange={updateField} autoComplete="off" />
            </div>
          ) : (
            <p className="muted">Your teacher must add your email to the student record before you can register.</p>
          )}
          <button className="btn primary auth-submit" type="submit" disabled={busy}>
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch muted">Already registered? <Link to="/login">Sign in here</Link></p>
      </section>
    </main>
  );
}
