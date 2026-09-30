import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';

export default function ReportCard() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/students/${id}/report-card`)
      .then((response) => { if (active) setReport(response.data.data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="container"><Loader label="Generating report card..." /></main>;
  if (error) return <main className="container"><p className="alert error" role="alert">{error}</p></main>;

  const { student, subjects, summary } = report;
  const resultClass = summary.result === 'PASS' ? 'pass' : summary.result === 'FAIL' ? 'fail' : '';

  return (
    <main className="container report-page">
      <section className="card report-header">
        <div><p className="eyebrow">REPORT CARD</p><h1>{student.name}</h1><p className="muted">{student.rollNo} · Class {student.className}-{student.section} · {student.academicYear}</p></div>
        <button className="btn light no-print" type="button" onClick={() => window.print()}>Print</button>
      </section>
      <div className="stat-grid report-stats">
        <div className="stat"><span>Percentage</span><strong>{summary.percentage}%</strong></div>
        <div className="stat"><span>Grade</span><strong>{summary.grade}</strong></div>
        <div className="stat"><span>Rank</span><strong>{summary.rank ? `${summary.rank} / ${summary.outOf}` : '—'}</strong></div>
        <div className="stat"><span>Result</span><strong><span className={`badge ${resultClass}`}>{summary.result}</span></strong></div>
      </div>
      {subjects.length === 0 ? <div className="empty">No marks are available for this student yet.</div> : (
        <section className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Subject</th><th>Exam type</th><th>Score</th><th>Percentage</th><th>Grade</th></tr></thead>
              <tbody>{subjects.map((subject) => <tr key={subject._id}><td>{subject.subject}</td><td>{subject.examType}</td><td>{subject.score} / {subject.maxScore}</td><td>{subject.percentage}%</td><td>{subject.grade}</td></tr>)}</tbody>
              <tfoot><tr><th>Total</th><th>{summary.subjectCount} subjects</th><th>{summary.obtainedMarks} / {summary.totalMarks}</th><th>{summary.percentage}%</th><th>{summary.grade}</th></tr></tfoot>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
