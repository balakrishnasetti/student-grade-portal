import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function Students() {
  const { isTeacher } = useAuth();
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ search: '', className: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (filters.search) params.set('search', filters.search);
      if (filters.className) params.set('className', filters.className);
      const response = await api.get(`/students?${params.toString()}`);
      setStudents(response.data.data);
      setMeta(response.data.meta);
    } catch (requestError) {
      setError(requestError.message);
      setStudents([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [filters.className, filters.search, page]);

  useEffect(() => {
    // Without useCallback, fetchStudents changes every render and this effect loops.
    const timer = setTimeout(() => {
      fetchStudents();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPage(1);
  }

  async function deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete ${student.name} and all of this student's marks? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await api.delete(`/students/${student._id}`);
      await fetchStudents();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <p className="eyebrow">ROSTER</p>
          <h1>{isTeacher ? 'Students' : 'My student record'}</h1>
          <p className="muted">{isTeacher ? 'Search and manage the class roster.' : 'Your personal student and class details.'}</p>
        </div>
        {isTeacher && <Link className="btn primary" to="/students/new">Add student</Link>}
      </div>

      <section className="card">
        {isTeacher && <div className="form-row filters">
          <div className="form-field">
            <label htmlFor="student-search">Search name or roll number</label>
            <input id="student-search" name="search" value={filters.search} onChange={updateFilter} placeholder="e.g. Aarav or 10A01" />
          </div>
          <div className="form-field">
            <label htmlFor="student-class">Class</label>
            <input id="student-class" name="className" value={filters.className} onChange={updateFilter} placeholder="e.g. 10" />
          </div>
        </div>}

        {error && <p className="alert error" role="alert">{error}</p>}
        {loading ? <Loader label="Loading students..." /> : students.length === 0 ? (
          <div className="empty">No students match the current filters.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Roll no.</th><th>Name</th><th>Class</th><th>Section</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.rollNo}</td>
                      <td>{student.name}</td>
                      <td>{student.className}</td>
                      <td>{student.section}</td>
                      <td className="actions">
                        <Link to={`/students/${student._id}/report-card`}>Report card</Link>
                        {isTeacher && <Link to={`/students/${student._id}/edit`}>Edit</Link>}
                        {isTeacher && <button className="text-button danger-text" type="button" onClick={() => deleteStudent(student)}>Delete</button>}
                      </td>
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
