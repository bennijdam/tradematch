import Topbar from '@/components/layout/Topbar';

export default function VendorMessagesPage() {
  return (
    <section className="container">
      <Topbar title="Messages" />
      <article className="panel">
        <h3 style={{ marginTop: 0 }}>Sarah N.</h3>
        <p style={{ color: '#a1a1aa' }}>Bathroom refit update</p>
      </article>
    </section>
  );
}
