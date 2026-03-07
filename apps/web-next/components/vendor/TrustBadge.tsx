import styles from './TrustBadge.module.css';

type TrustBadgeTone = 'green' | 'red' | 'amber';

export default function TrustBadge({
  label,
  tone = 'green',
}: {
  label: string;
  tone?: TrustBadgeTone;
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
