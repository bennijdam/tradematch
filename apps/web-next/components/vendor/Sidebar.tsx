import Link from 'next/link';
import styles from './Sidebar.module.css';

const items = [
  { href: '/vendor/dashboard', label: 'Dashboard', badge: '' },
  { href: '/vendor/active-jobs', label: 'Active Jobs', badge: '•' },
  { href: '/vendor/leads', label: 'Leads', badge: '5' },
  { href: '/vendor/messages', label: 'Messages', badge: '2' },
  { href: '/vendor/billing', label: 'Quotes', badge: '' },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>🛠</div>
        <span>TradeMatch</span>
      </div>

      <nav className={styles.nav}>
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${index === 0 ? styles.active : ''}`}
          >
            <span>{item.label}</span>
            {item.badge ? <span>{item.badge}</span> : null}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>JD</div>
          <div>
            <div>Jake Donovan</div>
            <div style={{ fontSize: 12, color: 'var(--tm-text-muted)' }}>Electrician · Pro Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
