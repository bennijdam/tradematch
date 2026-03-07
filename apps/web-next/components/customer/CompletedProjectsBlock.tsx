import styles from './CompletedProjectsBlock.module.css';

export default function CompletedProjectsBlock() {
  return (
    <section>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>✅ Completed Projects</div>
          <div className={styles.sectionSub}>All milestones paid · Home Passport certificates available</div>
        </div>
      </div>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.titleRow}>
              <div className={styles.cardTitle}>Fuse Box Replacement</div>
              <span className={styles.completeChip}>Complete</span>
            </div>
            <div className={styles.cardMeta}>Marcus Reed · NICEIC Electrician · Jan 2026 · £1,240</div>
          </div>
          <div className={styles.amountCol}>
            <div className={styles.amount}>£1,240</div>
            <div className={styles.amountSub}>Fully Released</div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.badge}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            All 3 milestones approved · NICEIC certified
          </div>

          <div className={styles.milestonesGrid}>
            <div className={styles.milestoneCell}><div>✓</div><span>M1 Done</span></div>
            <div className={styles.milestoneCell}><div>✓</div><span>M2 Done</span></div>
            <div className={styles.milestoneCell}><div>✓</div><span>M3 Done</span></div>
          </div>
        </div>

        <div className={styles.certSection}>
          <button type="button" className={styles.downloadBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Home Passport (PDF)
          </button>
          <div className={styles.certStamp}>Cert ID: TM-CERT-2026-0112 · NICEIC · Issued 28 Jan 2026</div>
        </div>
      </article>
    </section>
  );
}
