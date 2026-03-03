export default function Topbar({ title }: { title: string }) {
  return (
    <header style={{ marginBottom: '1rem' }}>
      <p style={{ margin: 0, color: '#a1a1aa', fontSize: 12 }}>Unified Dashboard Architecture</p>
      <h1 style={{ margin: '0.2rem 0 0 0' }}>{title}</h1>
    </header>
  );
}
