import Link from 'next/link';
import DashboardBridge from '@/components/navigation/DashboardBridge';
import styles from './CustomerSidebar.module.css';

export default function CustomerSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandWrap}>
        <div className={styles.logoMark}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <div>
          <h2 className={styles.title}>TradeMatch</h2>
          <p className={styles.subtitle}>Customer Portal</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <Link href="/customer/dashboard" className={`${styles.link} ${styles.active}`}>
          <span>My Projects</span>
          <span>3</span>
        </Link>
        <Link href="/customer/billing" className={styles.link}>
          <span>My Wallet</span>
          <span>Review</span>
        </Link>
        <Link href="/customer/messages" className={styles.link}>
          <span>Message Centre</span>
          <span>2</span>
        </Link>
        <Link href="/customer/quotes" className={styles.link}>
          <span>Compare Quotes</span>
          <span>5</span>
        </Link>
        <Link href="/customer/dispute-centre" className={styles.link}>Dispute Centre</Link>
        <Link href="/customer/document-vault" className={styles.link}>Document Vault</Link>
        <Link href="/customer/settings" className={styles.link}>Settings</Link>
      </nav>

      <div className={styles.footer}>Homeowner · Verified</div>
      <DashboardBridge />
    </aside>
  );
}
