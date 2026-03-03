import Link from 'next/link';

export default function CustomerActions() {
  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Actions</h2>
      <p style={{ color: '#a1a1aa' }}>Find a trusted pro and post a new request.</p>
      <Link href="/vendor/leads" className="badge">Find a Pro</Link>
    </section>
  );
}
