import styles from './AlertsBlock.module.css';

export default function AlertsBlock() {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>🔔 Recent Alerts</div>
        <button type="button" className={styles.markBtn}>Mark all read</button>
      </div>
      <div className={styles.list}>
        <div className={styles.row}><span className={`${styles.dot} ${styles.amber}`} /><div><div className={styles.text}>Milestone 2 awaiting your review · £1,500 held</div><div className={styles.time}>3 min ago</div></div></div>
        <div className={styles.row}><span className={`${styles.dot} ${styles.green}`} /><div><div className={styles.text}>Jake is 28 mins away — GPS tracking active</div><div className={styles.time}>12 min ago</div></div></div>
        <div className={styles.row}><span className={`${styles.dot} ${styles.blue}`} /><div><div className={styles.text}>Completion Certificate will be generated on final payment</div><div className={styles.time}>Today · 08:00</div></div></div>
      </div>
    </section>
  );
}
