import styles from './CustomerHeader.module.css';

export default function CustomerHeader({
  linkedEvents,
  unread,
}: {
  linkedEvents: number;
  unread: number;
}) {
  return (
    <header className={styles.wrap}>
      <div className={styles.breadcrumb}>TradeMatch Customer › Dashboard</div>
      <h1 className={styles.title}>Customer Dashboard</h1>
      <p className={styles.sub}>Track live job progress, messages, and quote activity in one place.</p>
      <div className={styles.meta}>
        <span>Shared Type Integration active: {linkedEvents} linked lead events, {unread} unread.</span>
        <span className={styles.tag}>Live View</span>
      </div>
    </header>
  );
}
