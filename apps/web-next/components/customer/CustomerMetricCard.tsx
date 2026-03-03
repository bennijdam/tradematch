import styles from './CustomerMetricCard.module.css';

export default function CustomerMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </article>
  );
}
