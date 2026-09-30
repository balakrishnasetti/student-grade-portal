import { useEffect, useState } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';

export default function ClassSummary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/marks/class-summary')
      .then((response) => { if (active) setRows(response.data.data); })
      .catch((requestError) => { if (active) { setError(requestError.message); setRows([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="container">
      <div className="page-head"><div><p className="eyebrow">PERFORMANCE</p><h1>Class summary</h1><p className="muted">A student-weighted view of class performance.</p></div></div>
      <section className="card">
        {error && <p className="alert error" role="alert">{error}</p>}
        {loading ? <Loader label="Loading class summary..." /> : rows.length === 0 ? <div className="empty">No class summary is available until marks are entered.</div> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Class</th><th>Students</th><th>Subject entries</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Pass</th><th>Fail</th><th>Pass percentage</th><th>Average grade</th></tr></thead><tbody>{rows.map((row) => <tr key={row.className}><td>{row.className}</td><td>{row.studentCount}</td><td>{row.totalSubjectEntries}</td><td>{row.averagePercentage}%</td><td>{row.highestPercentage}%</td><td>{row.lowestPercentage}%</td><td>{row.passCount}</td><td>{row.failCount}</td><td><span className={`badge ${row.passPercentage >= 60 ? 'pass' : 'fail'}`}>{row.passPercentage}%</span></td><td>{row.averageGrade}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
