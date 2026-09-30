import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';

function rankLabel(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
}

export default function Toppers() {
  const [filters, setFilters] = useState({ className: '', limit: '10' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ limit: filters.limit });
      if (filters.className) params.set('className', filters.className);
      api.get(`/students/top?${params.toString()}`)
        .then((response) => { if (active) setRows(response.data.data); })
        .catch((requestError) => { if (active) { setError(requestError.message); setRows([]); } })
        .finally(() => { if (active) setLoading(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [filters.className, filters.limit]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <main className="container">
      <div className="page-head"><div><p className="eyebrow">PERFORMANCE</p><h1>Toppers</h1><p className="muted">Students ranked by weighted overall percentage.</p></div></div>
      <section className="card">
        <div className="form-row filters">
          <div className="form-field"><label htmlFor="topper-class">Class (optional)</label><input id="topper-class" name="className" value={filters.className} onChange={updateFilter} placeholder="e.g. 10" /></div>
          <div className="form-field"><label htmlFor="topper-limit">Show</label><select id="topper-limit" name="limit" value={filters.limit} onChange={updateFilter}><option value="5">5 students</option><option value="10">10 students</option><option value="25">25 students</option></select></div>
        </div>
        {error && <p className="alert error" role="alert">{error}</p>}
        {loading ? <Loader label="Calculating rankings..." /> : rows.length === 0 ? <div className="empty">No topper data yet. Marks must exist before rankings can be calculated.</div> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Subjects</th><th>Percentage</th><th>Grade</th></tr></thead><tbody>{rows.map((row) => <tr key={row.studentId}><td>{rankLabel(row.rank)}</td><td><Link to={`/students/${row.studentId}/report-card`}>{row.name}</Link><small className="muted block">{row.rollNo}</small></td><td>{row.className}-{row.section}</td><td>{row.subjectCount}</td><td>{row.percentage}%</td><td>{row.grade}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
