import styles from './InfraHealthNative.module.css';

export default function InfraHealthNative() {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Infra Health (Native)</h2>
      <div className={styles.grid}>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>API Uptime</div>
          <div className={styles.metricValue}>99.98%</div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>DB P95</div>
          <div className={styles.metricValue}>82ms</div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricLabel}>Queue Lag</div>
          <div className={styles.metricValue}>1.2s</div>
        </article>
      </div>
    </section>
  );
}
