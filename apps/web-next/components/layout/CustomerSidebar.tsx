import Link from 'next/link';
import DashboardBridge from '@/components/navigation/DashboardBridge';

export default function CustomerSidebar() {
  return (
    <aside className="sidebar">
      <h2 style={{ marginTop: 0 }}>TradeMatch Customer</h2>
      <nav style={{ display: 'grid', gap: '0.5rem' }}>
        <Link href="/customer/dashboard">Dashboard</Link>
        <Link href="/customer/dashboard#jobs">My Jobs</Link>
        <Link href="/customer/dashboard#messages">Messages</Link>
      </nav>
      <DashboardBridge />
    </aside>
  );
}
