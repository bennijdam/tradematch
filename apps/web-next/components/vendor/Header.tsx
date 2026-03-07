import TrustBadge from './TrustBadge';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.wrap}>
      <div>
        <div className={styles.eyebrow}>TradeMatch Vendor</div>
        <h1 className={styles.title}>Good morning, Jake 👋</h1>
        <p className={styles.sub}>Here&apos;s what&apos;s happening with your account today — Sunday, 1 March 2026</p>
      </div>
      <div className={styles.tools}>
        <button type="button" className={styles.actionButton}>Browse Leads</button>
        <TrustBadge label='Alerts 3' tone='red' />
      </div>
    </header>
  );
}
