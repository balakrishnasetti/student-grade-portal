import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const features = [
  ['01', 'Track', 'Keep every student and assessment in one clear place.'],
  ['02', 'Understand', 'Turn marks into weighted averages, grades, and insight.'],
  ['03', 'Move forward', 'Give every learner a report card they can act on.'],
];

export default function Home() {
  useEffect(() => {
    const revealItems = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.18 });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="home-page">
      <header className="home-nav reveal">
        <Link className="home-brand" to="/">Grade<span>Portal</span></Link>
        <div className="home-nav-meta"><span>Student performance / 2026</span><Link to="/login">Sign in</Link><Link className="home-nav-cta" to="/register">Get started</Link></div>
      </header>

      <section className="home-hero">
        <div className="hero-image-panel reveal">
          <div className="hero-visual-glow" aria-hidden="true" />
          <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85" alt="Students collaborating around a table" />
          <div className="floating-metrics" aria-hidden="true">
            <div className="metric-pill metric-pill-primary">+18% growth</div>
            <div className="metric-panel">
              <span>Class average</span>
              <strong>92.6%</strong>
              <small>Fresh momentum</small>
            </div>
          </div>
          <div className="image-caption"><span>Classroom intelligence</span><span>Scroll to explore ↓</span></div>
        </div>
        <div className="hero-type-panel reveal">
          <div className="hero-rules" aria-hidden="true"><span /><span /><span /></div>
          <div className="orb orb-one" aria-hidden="true" />
          <div className="orb orb-two" aria-hidden="true" />
          <p className="hero-kicker">For teachers who see more</p>
          <h1><span>GRADE</span><span>PORTAL</span></h1>
          <p className="hero-copy">A sharper way to turn classroom marks into momentum. Record, understand, and share progress without losing the human story behind the numbers.</p>
          <div className="hero-actions"><Link className="home-button home-button-light" to="/register">Open your portal <span>↗</span></Link><Link className="home-text-link" to="/login">Already have access? Sign in</Link></div>
          <div className="hero-index">GP / 001</div>
        </div>
      </section>

      <section className="home-intro reveal"><p className="hero-kicker">A calmer command centre</p><h2>Make progress<br /><em>visible.</em></h2><p>From first mark to final report, Grade Portal gives your classroom a shared language for what is happening and what comes next.</p></section>

      <section className="feature-grid reveal">{features.map(([number, title, copy]) => <article key={number} className="feature-item"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</section>
      <footer className="home-footer reveal"><span>GRADE PORTAL</span><span>Built for better classroom conversations</span><Link to="/register">Create access ↗</Link></footer>
    </main>
  );
}
