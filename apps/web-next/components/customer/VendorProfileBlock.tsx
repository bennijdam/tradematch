import styles from './VendorProfileBlock.module.css';

export default function VendorProfileBlock() {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>JD</div>
        <div className={styles.name}>Jake Donovan</div>
        <div className={styles.trade}>Master Electrician · 8 yrs experience</div>
        <div className={styles.scoreRow}>
          <div className={styles.scoreBig}>9.8</div>
          <div className={styles.scoreOut}>/10</div>
          <div className={styles.stars}>★★★★★</div>
        </div>
        <div className={styles.badges}>
          <div className={styles.badge}>ID Verified</div>
          <div className={styles.badge}>PLI Active</div>
          <div className={styles.badge}>DBS Clear</div>
        </div>
      </div>

      <div className={styles.credentials}>
        <div className={styles.row}><span>🛡️ PLI Insurance</span><span>AXA · £2M</span></div>
        <div className={styles.row}><span>📋 Show-Up Score</span><span>97%</span></div>
        <div className={styles.row}><span>⭐ Reviews</span><span>4.92 · 127 jobs</span></div>
        <div className={styles.row}><span>✅ Completion Rate</span><span>99.2%</span></div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.blueBtn}>Message Jake</button>
        <button type="button" className={styles.dangerBtn}>Raise a Dispute</button>
      </div>
    </section>
  );
}
