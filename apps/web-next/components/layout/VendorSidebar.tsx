import Link from 'next/link';
import DashboardBridge from '@/components/navigation/DashboardBridge';

const links = [
  { href: '/vendor/dashboard', label: 'Dashboard' },
  { href: '/vendor/active-jobs', label: 'Active Jobs', pulse: true },
  { href: '/vendor/leads', label: 'Leads' },
  { href: '/vendor/messages', label: 'Messages' },
  { href: '/vendor/billing', label: 'Billing' },
];

export default function VendorSidebar() {
  return (
    <aside className="sidebar">
      <h2 style={{ marginTop: 0 }}>TradeMatch Pro</h2>
      <nav style={{ display: 'grid', gap: '0.5rem' }}>
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}{' '}
            {item.pulse ? (
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span
                  className="animate-ping"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: '#00e5a0',
                    opacity: 0.6,
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: '#00e5a0',
                  }}
                />
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <DashboardBridge />
    </aside>
  );
}
