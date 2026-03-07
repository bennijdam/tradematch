import TrustBadge from './TrustBadge';
import styles from './DisputeCentrePreview.module.css';

export default function DisputeCentrePreview() {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Dispute Centre Preview</h2>
      <article className={styles.item}>
        <div className={styles.itemTop}>
          <span>Case TM-2204</span>
          <TrustBadge label='Open' tone='amber' />
        </div>
        <p className={styles.meta}>Customer raised timeline concern on Bathroom refit — last updated 2h ago.</p>
      </article>
      <article className={styles.item}>
        <div className={styles.itemTop}>
          <span>Case TM-2201</span>
          <TrustBadge label='Resolved' tone='green' />
        </div>
        <p className={styles.meta}>Material overrun reviewed and confirmed by both parties.</p>
      </article>
    </section>
  );
}
