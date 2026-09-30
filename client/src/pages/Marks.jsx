import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function Marks() {
  const { isTeacher } = useAuth();
  const [marks, setMarks] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ subject: '', examType: '' });
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.examType) params.set('examType', filters.examType);
    api.get(`/marks?${params.toString()}`)
      .then((response) => {
        if (!active) return;
        setMarks(response.data.data);
        setMeta(response.data.meta);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setMarks([]);
        setMeta(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters.examType, filters.subject, page, refresh]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPage(1);
  }

  async function deleteMark(mark) {
    if (!window.confirm(`Delete ${mark.subject} for ${mark.student?.name || 'this student'}?`)) return;
    try {
      await api.delete(`/marks/${mark._id}`);
      setRefresh((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="container">
      <div className="page-head">
        <div><p className="eyebrow">ASSESSMENTS</p><h1>Marks</h1><p className="muted">Review assessment entries by subject or exam.</p></div>
        {isTeacher && <Link className="btn primary" to="/marks/new">Add mark</Link>}
      </div>
      <section className="card">
        <div className="form-row filters">
          <div className="form-field"><label htmlFor="mark-subject">Subject</label><input id="mark-subject" name="subject" value={filters.subject} onChange={updateFilter} placeholder="Search subject" /></div>
          <div className="form-field"><label htmlFor="mark-exam">Exam type</label><select id="mark-exam" name="examType" value={filters.examType} onChange={updateFilter}><option value="">All exams</option><option value="unit-test">Unit test</option><option value="midterm">Midterm</option><option value="final">Final</option></select></div>
        </div>
        {error && <p className="alert error" role="alert">{error}</p>}
        {loading ? <Loader label="Loading marks..." /> : marks.length === 0 ? <div className="empty">No marks match the current filters.</div> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Student</th><th>Roll no.</th><th>Subject</th><th>Exam</th><th>Score</th><th>Percentage</th>{isTeacher && <th>Actions</th>}</tr></thead>
                <tbody>
                  {marks.map((mark) => (
                    <tr key={mark._id}>
                      {/* A deleted student can leave populate returning null, so use optional chaining. */}
                      <td>{mark.student?.name || 'Removed student'}</td>
                      <td>{mark.student?.rollNo || '—'}</td>
                      <td>{mark.subject}</td>
                      <td>{mark.examType}</td>
                      <td>{mark.score} / {mark.maxScore}</td>
                      <td>{mark.percentage}%</td>
                      {isTeacher && <td className="actions"><Link to={`/marks/${mark._id}/edit`}>Edit</Link><button className="text-button danger-text" type="button" onClick={() => deleteMark(mark)}>Delete</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </section>
    </main>
  );
}
