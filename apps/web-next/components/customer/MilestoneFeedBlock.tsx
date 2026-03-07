import styles from './MilestoneFeedBlock.module.css';

export default function MilestoneFeedBlock() {
  return (
    <section>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>📋 Milestone Feed</div>
          <div className={styles.sectionSub}>Approve or reject each stage to control escrow releases</div>
        </div>
      </div>

      <div className={styles.feed}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.milestoneNum} ${styles.done}`}>✓</div>
            <div>
              <div className={styles.cardTitle}>Milestone 1 — Site Preparation &amp; Materials</div>
              <div className={styles.cardSub}>Approved 22 Feb 2026 · £1,250 released</div>
            </div>
            <div className={`${styles.statusChip} ${styles.doneChip}`}>Approved</div>
          </div>
          <div className={styles.photos3}>
            <div className={styles.photo}>🏗️<div className={styles.photoLabel}>Before</div></div>
            <div className={styles.photo}>📦<div className={styles.photoLabel}>Materials</div></div>
            <div className={styles.photo}>✅<div className={styles.photoLabel}>Site Ready</div></div>
          </div>
        </article>

        <article className={`${styles.card} ${styles.awaitingReview}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.milestoneNum} ${styles.review}`}>2</div>
            <div>
              <div className={styles.cardTitle}>Milestone 2 — First Fix &amp; Framework</div>
              <div className={styles.cardSub}>Submitted today · £1,500 awaiting your approval</div>
            </div>
            <div className={`${styles.statusChip} ${styles.reviewChip}`}>⏳ Review Required</div>
          </div>
          <div className={styles.photos4}>
            <div className={styles.photo}>🔧<div className={styles.photoLabel}>Tap to view</div><div className={styles.signoffCheck}>✓</div></div>
            <div className={styles.photo}>⚡<div className={styles.photoLabel}>Tap to view</div><div className={styles.signoffCheck}>✓</div></div>
            <div className={styles.photo}>🏗️<div className={styles.photoLabel}>Tap to view</div><div className={styles.signoffCheck}>✓</div></div>
            <div className={styles.photo}>📐<div className={styles.photoLabel}>Tap to view</div><div className={styles.signoffCheck}>✓</div></div>
          </div>

          <div className={styles.qualityAuditArea}>
            <div className={styles.qualityAuditLabel}>Quality Audit — Compare Evidence</div>
            <div className={styles.qualityAuditGrid}>
              <div className={styles.auditPanel}>
                <div className={styles.auditPanelLabel}>Vendor Photos</div>
                <div className={styles.auditPanelIcon}>📸</div>
                <div className={styles.auditPanelAction}>4 photos submitted by Jake</div>
              </div>
              <div className={`${styles.auditPanel} ${styles.uploadZone}`}>
                <div className={styles.auditPanelLabel}>Your Evidence</div>
                <div className={styles.auditPanelIcon}>📷</div>
                <div className={styles.auditPanelAction}>Tap to upload your own site photo for comparison</div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.rejectBtn}>✗ Reject Milestone</button>
            <button type="button" className={styles.approveBtn}>✓ Approve &amp; Release £1,500</button>
            <button type="button" className={styles.reportBtn}>⚠ Report Issue</button>
            <span className={styles.hint}>View all 4 photos to approve</span>
          </div>
        </article>

        <article className={`${styles.card} ${styles.lockedCard}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.milestoneNum} ${styles.locked}`}>3</div>
            <div>
              <div className={styles.cardTitle}>Milestone 3 — Second Fix &amp; Finishing</div>
              <div className={styles.cardSub}>Unlocks after Milestone 2 is approved · £1,000</div>
            </div>
            <div className={`${styles.statusChip} ${styles.lockedChip}`}>Locked</div>
          </div>
        </article>

        <article className={`${styles.card} ${styles.lockedCard}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.milestoneNum} ${styles.locked}`}>4</div>
            <div>
              <div className={styles.cardTitle}>Milestone 4 — Final Sign-off</div>
              <div className={styles.cardSub}>Final 20% · Requires Completion Certificate preview · £500</div>
            </div>
            <div className={`${styles.statusChip} ${styles.certChip}`}>Cert Required</div>
          </div>
        </article>
      </div>
    </section>
  );
}
