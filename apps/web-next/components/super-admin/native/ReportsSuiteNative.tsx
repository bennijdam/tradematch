import styles from './ReportsSuiteNative.module.css';

export default function ReportsSuiteNative() {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Reports Suite (Native)</h2>
      <div className={styles.grid}>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>Abuse Alerts</div>
          <div className={styles.metricValue}>4</div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Reviews</div>
          <div className={styles.metricValue}>17</div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>Finance Flags</div>
          <div className={styles.metricValue}>2</div>
        </article>
      </div>
    </section>
  );
}
