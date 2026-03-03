import Topbar from '@/components/layout/Topbar';

export default function VendorDashboardPage() {
  return (
    <section className="container">
      <Topbar title="Dashboard" />
      <div className="grid grid-4">
        <article className="panel"><h3>Active Jobs</h3><p>12</p></article>
        <article className="panel"><h3>New Leads</h3><p>5</p></article>
        <article className="panel"><h3>Messages</h3><p>3</p></article>
        <article className="panel"><h3>Wallet</h3><p>£47.50</p></article>
      </div>
    </section>
  );
}
