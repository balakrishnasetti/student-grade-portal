import { useState } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';

export default function SubjectAverage() {
  const [form, setForm] = useState({ subject: '', className: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const encodedSubject = encodeURIComponent(form.subject.trim());
    // Spaces and characters in subjects such as "Social Studies" or "Maths & Stats" break the URL otherwise.
    const query = form.className ? `?className=${encodeURIComponent(form.className.trim())}` : '';
    try {
      const response = await api.get(`/marks/subject/${encodedSubject}/average${query}`);
      setResult(response.data.data);
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const hasData = result?.studentCount > 0;

  return (
    <main className="container">
      <div className="page-head"><div><p className="eyebrow">PERFORMANCE</p><h1>Subject average</h1><p className="muted">Compare performance for one subject across a class.</p></div></div>
      <section className="card average-form">
        <form onSubmit={handleSubmit} className="form-row">
          <div className="form-field"><label htmlFor="average-subject">Subject</label><input id="average-subject" name="subject" value={form.subject} onChange={updateField} placeholder="e.g. Social Studies" required /></div>
          <div className="form-field"><label htmlFor="average-class">Class (optional)</label><input id="average-class" name="className" value={form.className} onChange={updateField} placeholder="e.g. 10" /></div>
          <div className="form-actions"><button className="btn primary" type="submit" disabled={loading}>{loading ? 'Calculating...' : 'Calculate average'}</button></div>
        </form>
      </section>
      {error && <p className="alert error" role="alert">{error}</p>}
      {loading && <Loader label="Calculating subject average..." />}
      {!loading && result && !hasData && <div className="empty">No marks were found for this subject and class.</div>}
      {!loading && hasData && <section className="stat-grid average-stats"><div className="stat"><span>Students</span><strong>{result.studentCount}</strong></div><div className="stat"><span>Average score</span><strong>{result.averageScore}</strong></div><div className="stat"><span>Average percentage</span><strong>{result.averagePercentage}%</strong></div><div className="stat"><span>Highest score</span><strong>{result.highestScore}</strong></div><div className="stat"><span>Lowest score</span><strong>{result.lowestScore}</strong></div><div className="stat"><span>Pass percentage</span><strong>{result.passPercentage}%</strong></div><div className="stat"><span>Grade</span><strong>{result.grade}</strong></div></section>}
    </main>
  );
}
