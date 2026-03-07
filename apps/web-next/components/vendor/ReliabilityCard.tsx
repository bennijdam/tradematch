import styles from './ReliabilityCard.module.css';

export default function ReliabilityCard({ showUpScore = 100 }: { showUpScore?: number }) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Reliability Score</h3>
        <button type="button" className={styles.detailsBtn}>Details</button>
      </div>
      <div className={styles.ringWrap}>
        <div className={styles.ringOuter}>
          <div className={styles.ringValue}>4.8</div>
          <div className={styles.ringLabel}>/ 5.0</div>
        </div>
      </div>
      <div className={styles.grid}>
        <div className={styles.row}><span className={styles.key}>Response Rate</span><span className={styles.val}>96%</span></div>
        <div className={styles.row}><span className={styles.key}>Show-up Rate</span><span className={`${styles.val} ${styles.showUpScore}`}>{showUpScore}%</span></div>
        <div className={styles.row}><span className={styles.key}>Completion Rate</span><span className={styles.val}>91%</span></div>
        <div className={styles.row}><span className={styles.key}>Reviews (avg)</span><span className={styles.val}>4.9 ★</span></div>
      </div>
    </article>
  );
}
