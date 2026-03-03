import type { CustomerJobRequest } from '@tradematch/types';
import JobStatusCard from './JobStatusCard';
import styles from './JobFeed.module.css';

export default function JobFeed({ jobs }: { jobs: CustomerJobRequest[] }) {
  return (
    <section id="jobs" className={styles.wrap}>
      <h2 className={styles.title}>My Job Requests</h2>
      {jobs.map((job) => (
        <JobStatusCard key={job.id} job={job} />
      ))}
    </section>
  );
}
