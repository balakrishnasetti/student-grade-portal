import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { isTeacher } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const request = isTeacher
      ? Promise.all([
        api.get('/students?limit=1'),
        api.get('/marks?limit=1'),
        api.get('/students/top?limit=3'),
        api.get('/marks/class-summary'),
      ]).then(([students, marks, top, summary]) => ({
        studentCount: students.data.meta.total,
        markCount: marks.data.meta.total,
        top: top.data.data,
        summary: summary.data.data,
      }))
      : Promise.all([api.get('/auth/me'), api.get('/marks?limit=1')])
        .then(([profile, marks]) => ({
          student: profile.data.data.user.studentProfile,
          markCount: marks.data.meta.total,
        }));

    request
      .then((data) => { if (active) setOverview(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isTeacher]);

  if (loading) return <main className="container"><Loader label="Loading dashboard..." /></main>;
  if (error) return <main className="container"><p className="alert error" role="alert">{error}</p></main>;

  if (!isTeacher) {
    return (
      <main className="container dashboard-page">
        <div className="page-head">
          <div><p className="eyebrow">MY RESULTS</p><h1>{overview.student.name}</h1><p className="muted">Your student record and assessment results.</p></div>
          <Link className="btn primary" to={`/students/${overview.student._id}/report-card`}>View my report card</Link>
        </div>
        <div className="stat-grid">
          <div className="stat dashboard-stat"><span>Roll number</span><strong>{overview.student.rollNo}</strong></div>
          <div className="stat dashboard-stat"><span>Class</span><strong>{overview.student.className}-{overview.student.section}</strong></div>
          <div className="stat dashboard-stat"><span>My mark entries</span><strong>{overview.markCount}</strong></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container dashboard-page">
      <div className="page-head"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p className="muted">A quick view of classroom performance.</p></div>{isTeacher && <div className="quick-actions"><Link className="btn primary" to="/students/new">Add student</Link><Link className="btn light" to="/marks/new">Add mark</Link></div>}</div>
      <div className="stat-grid"><div className="stat dashboard-stat"><span>Students</span><strong>{overview.studentCount}</strong></div><div className="stat dashboard-stat"><span>Mark entries</span><strong>{overview.markCount}</strong></div><div className="stat dashboard-stat"><span>Classes with marks</span><strong>{overview.summary.length}</strong></div></div>
      <section className="card dashboard-section"><div className="section-head"><div><h2>Top 3 students</h2><p className="muted">Based on weighted overall percentage.</p></div><Link to="/toppers">View rankings</Link></div>{overview.top.length === 0 ? <div className="empty">No topper data yet. Add marks to populate this table.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Percentage</th><th>Grade</th></tr></thead><tbody>{overview.top.map((row) => <tr key={row.studentId}><td>{row.rank}</td><td><Link to={`/students/${row.studentId}/report-card`}>{row.name}</Link></td><td>{row.className}-{row.section}</td><td>{row.percentage}%</td><td>{row.grade}</td></tr>)}</tbody></table></div>}</section>
    </main>
  );
}
