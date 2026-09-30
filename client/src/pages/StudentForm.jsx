import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';

const initialForm = {
  rollNo: '',
  name: '',
  email: '',
  className: '',
  section: 'A',
  academicYear: '',
};

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    api.get(`/students/${id}`)
      .then((response) => {
        if (active) setForm({ ...initialForm, ...response.data.data });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      rollNo: form.rollNo,
      name: form.name,
      className: form.className,
    };
    ['email', 'section', 'academicYear'].forEach((field) => {
      if (form[field].trim()) payload[field] = form[field].trim();
    });

    try {
      if (isEditing) await api.put(`/students/${id}`, payload);
      else await api.post('/students', payload);
      navigate('/students');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="container"><Loader label="Loading student..." /></main>;

  return (
    <main className="container">
      <div className="page-head"><div><p className="eyebrow">ROSTER</p><h1>{isEditing ? 'Edit student' : 'Add student'}</h1></div></div>
      <section className="card form-card">
        {error && <p className="alert error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field"><label htmlFor="student-roll">Roll number</label><input id="student-roll" name="rollNo" value={form.rollNo} onChange={updateField} required /></div>
            <div className="form-field"><label htmlFor="student-name">Name</label><input id="student-name" name="name" value={form.name} onChange={updateField} maxLength="60" required /></div>
            <div className="form-field"><label htmlFor="student-email">Email (optional)</label><input id="student-email" name="email" type="email" value={form.email} onChange={updateField} /></div>
            <div className="form-field"><label htmlFor="student-class-name">Class</label><input id="student-class-name" name="className" value={form.className} onChange={updateField} required /></div>
            <div className="form-field"><label htmlFor="student-section">Section</label><input id="student-section" name="section" value={form.section} onChange={updateField} /></div>
            <div className="form-field"><label htmlFor="student-year">Academic year (optional)</label><input id="student-year" name="academicYear" value={form.academicYear} onChange={updateField} /></div>
          </div>
          <div className="form-actions"><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : isEditing ? 'Save changes' : 'Add student'}</button></div>
        </form>
      </section>
    </main>
  );
}
