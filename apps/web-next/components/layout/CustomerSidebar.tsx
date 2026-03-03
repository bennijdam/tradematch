import Link from 'next/link';
import DashboardBridge from '@/components/navigation/DashboardBridge';
import styles from './CustomerSidebar.module.css';

export default function CustomerSidebar() {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>TradeMatch Customer</h2>
      <nav className={styles.nav}>
        <Link href="/customer/dashboard" className={styles.link}>Dashboard</Link>
        <Link href="/customer/dashboard#jobs" className={styles.link}>My Jobs</Link>
        <Link href="/customer/dashboard#messages" className={styles.link}>Messages</Link>
      </nav>
      <DashboardBridge />
    </aside>
  );
}
