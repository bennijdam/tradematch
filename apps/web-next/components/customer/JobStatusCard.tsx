import type { CustomerJobRequest } from '@tradematch/types';
import styles from './JobStatusCard.module.css';

function getStatusClass(status: CustomerJobRequest['status']) {
  if (status === 'In Progress') {
    return styles.inProgress;
  }

  if (status === 'Completed') {
    return styles.completed;
  }

  return styles.pending;
}

export default function JobStatusCard({ job }: { job: CustomerJobRequest }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{job.title}</h3>
      <p className={styles.meta}>{job.postcode}</p>
      <p className={styles.budget}>Budget: £{job.budget}</p>
      <span className={`${styles.badge} ${getStatusClass(job.status)}`}>{job.status}</span>
    </article>
  );
}
