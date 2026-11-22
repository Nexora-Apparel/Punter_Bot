const sections = [
  { title: "Fixtures", description: "Upcoming matches and source verification.", status: "Not connected" },
  { title: "Predictions", description: "Independent model forecasts after validation.", status: "Not enabled" },
  { title: "Results", description: "Settled outcomes and immutable prediction history.", status: "Awaiting data" },
  { title: "Performance", description: "Calibration, Brier score, log loss and market results.", status: "Awaiting samples" }
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark">P</div>
        <div>
          <p className="eyebrow">PRIVATE FOOTBALL ANALYTICS</p>
          <h1>PUNTER AI</h1>
        </div>
        <span className="environment">FOUNDATION</span>
      </header>

      <section className="intro">
        <p className="eyebrow">PROJECT COMMAND CENTRE</p>
        <h2>Build decisions from verified match data.</h2>
        <p className="intro-copy">
          PUNTER AI is being built as an independent football analysis platform.
          Forecasts remain disabled until the data pipeline and model pass validation.
        </p>
      </section>

      <section className="metrics" aria-label="Project status">
        <article><span>Data sources</span><strong>0 verified</strong></article>
        <article><span>Stored fixtures</span><strong>0</strong></article>
        <article><span>Published forecasts</span><strong>0</strong></article>
        <article><span>Operating budget</span><strong>$0</strong></article>
      </section>

      <section className="section-heading">
        <div><p className="eyebrow">WORKSPACE</p><h2>System modules</h2></div>
        <span className="muted">Early foundation</span>
      </section>

      <section className="module-grid">
        {sections.map((section) => (
          <article className="module-card" key={section.title}>
            <div className="module-card-top"><h3>{section.title}</h3><span className="status-dot" /></div>
            <p>{section.description}</p>
            <span className="module-status">{section.status}</span>
          </article>
        ))}
      </section>

      <footer>
        <span>PUNTER AI · PRIVATE INSTANCE</span>
        <span>Provider integrations are not connected. Source attribution will be shown when required.</span>
      </footer>
    </main>
  );
}