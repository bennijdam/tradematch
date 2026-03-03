import Topbar from '@/components/layout/Topbar';

export default function VendorActiveJobsPage() {
  return (
    <section className="container">
      <Topbar title="Active Jobs" />
      <article className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Bathroom refit - SW1</h3>
          <p style={{ color: '#a1a1aa' }}>On Site</p>
        </div>
        <span className="badge">
          <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, marginRight: 6 }}>
            <span className="animate-ping" style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#00e5a0', opacity: 0.6 }} />
            <span style={{ position: 'relative', width: 8, height: 8, borderRadius: 999, background: '#00e5a0' }} />
          </span>
          Escrow Tracked
        </span>
      </article>
    </section>
  );
}
