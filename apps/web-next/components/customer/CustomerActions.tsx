import Link from 'next/link';
import styles from './CustomerActions.module.css';

export default function CustomerActions() {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Actions</h2>
      <p className={styles.copy}>Find a trusted pro and post a new request.</p>
      <Link href="/vendor/leads" className={styles.button}>Find a Pro</Link>
    </section>
  );
}
