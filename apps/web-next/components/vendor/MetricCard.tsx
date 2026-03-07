import TrustBadge from './TrustBadge';
import styles from './MetricCard.module.css';

function MetricGlyph({ icon }: { icon: string }) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
  };

  if (icon === 'shield') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 5-3.2 7.8-7 9-3.8-1.2-7-4-7-9V6l7-3z" />
      </svg>
    );
  }

  if (icon === 'pound') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 6.5a2.5 2.5 0 00-5 0V11h4.5M7 14h9M8.5 14c0 2.2-1.2 3.8-3 4h10" />
      </svg>
    );
  }

  if (icon === 'eye') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 15c0-3 2-5 5-5s5 2 5 5M12 4v6M9 7h6" />
    </svg>
  );
}

export default function MetricCard({
  icon,
  label,
  value,
  sub,
  trend,
  trendTone = 'green',
  progress,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendTone?: 'green' | 'red' | 'amber';
  progress?: { label: string; value: string; percent: number };
}) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.iconWrap}><MetricGlyph icon={icon} /></div>
        <TrustBadge label={trend} tone={trendTone} />
      </div>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.sub}>{sub}</div>
      {progress ? (
        <>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{progress.label}</span>
            <span>{progress.value}</span>
          </div>
        </>
      ) : null}
    </article>
  );
}
