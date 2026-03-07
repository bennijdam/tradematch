import styles from './CustomerHeader.module.css';

export default function CustomerHeader({
  linkedEvents: _linkedEvents,
  unread: _unread,
}: {
  linkedEvents: number;
  unread: number;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitleGroup}>
        <div className={styles.pageEyebrow}>TradeMatch Protected Workspace</div>
        <h1 className={styles.pageTitle}>Good morning, Sarah 👋</h1>
        <p className={styles.pageSub}>You have 1 active project, £4,250 in secure escrow, and 1 milestone awaiting your review.</p>
      </div>
      <div className={styles.pageActions}>
        <button type="button" className={styles.actionButton}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Post New Job
        </button>
      </div>
    </header>
  );
}
