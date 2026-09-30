import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';

const initialForm = { student: '', subject: '', examType: 'final', score: '', maxScore: '100' };

export default function MarkForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [loading, setLoading] = useState(isEditing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/students?limit=100')
      .then((response) => {
        if (!active) return;
        setStudents(response.data.data);
        if (!isEditing) {
          const studentFromQuery = searchParams.get('student');
          if (studentFromQuery) setForm((current) => ({ ...current, student: studentFromQuery }));
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setStudentsLoading(false); });
    return () => { active = false; };
  }, [isEditing, searchParams]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    api.get(`/marks/${id}`)
      .then((response) => {
        if (!active) return;
        const mark = response.data.data;
        setForm({ student: mark.student?._id || '', subject: mark.subject, examType: mark.examType, score: String(mark.score), maxScore: String(mark.maxScore) });
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const score = Number(form.score);
    const maxScore = Number(form.maxScore);
    if (!Number.isFinite(score) || score < 0 || !Number.isFinite(maxScore) || maxScore < 1 || score > maxScore) {
      setError('Score must be a number from 0 up to the maximum score.');
      return;
    }

    setBusy(true);
    try {
      const payload = { subject: form.subject, examType: form.examType, score, maxScore };
      if (!isEditing) payload.student = form.student;
      if (isEditing) await api.put(`/marks/${id}`, payload);
      else await api.post('/marks', payload);
      navigate('/marks');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || studentsLoading) return <main className="container"><Loader label={loading ? 'Loading mark...' : 'Loading students...'} /></main>;

  return (
    <main className="container">
      <div className="page-head"><div><p className="eyebrow">ASSESSMENTS</p><h1>{isEditing ? 'Edit mark' : 'Add mark'}</h1></div></div>
      <section className="card form-card">
        {error && <p className="alert error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field"><label htmlFor="mark-student">Student</label><select id="mark-student" name="student" value={form.student} onChange={updateField} disabled={isEditing || students.length === 0} required><option value="">{students.length ? 'Select student' : 'No students available'}</option>{students.map((student) => <option key={student._id} value={student._id}>{student.rollNo} · {student.name}</option>)}</select>{isEditing && <small className="muted">Reassigning a mark could conflict with the unique index.</small>}</div>
            <div className="form-field"><label htmlFor="mark-form-subject">Subject</label><input id="mark-form-subject" name="subject" value={form.subject} onChange={updateField} maxLength="50" required /></div>
            <div className="form-field"><label htmlFor="mark-form-exam">Exam type</label><select id="mark-form-exam" name="examType" value={form.examType} onChange={updateField}><option value="unit-test">Unit test</option><option value="midterm">Midterm</option><option value="final">Final</option></select></div>
            <div className="form-field"><label htmlFor="mark-score">Score</label><input id="mark-score" name="score" type="number" min="0" value={form.score} onChange={updateField} required /></div>
            <div className="form-field"><label htmlFor="mark-max-score">Maximum score</label><input id="mark-max-score" name="maxScore" type="number" min="1" value={form.maxScore} onChange={updateField} required /></div>
          </div>
          <div className="form-actions"><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : isEditing ? 'Save changes' : 'Add mark'}</button></div>
        </form>
      </section>
    </main>
  );
}
