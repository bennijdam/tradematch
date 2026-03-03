import type { CustomerJobRequest } from '@tradematch/types';
import CustomerMetricCard from './CustomerMetricCard';
import styles from './StatsOverview.module.css';

export default function StatsOverview({ jobs }: { jobs: CustomerJobRequest[] }) {
  const pending = jobs.filter((job) => job.status === 'Pending').length;
  const active = jobs.filter((job) => job.status === 'In Progress').length;
  const completed = jobs.filter((job) => job.status === 'Completed').length;

  return (
    <section className={styles.grid}>
      <CustomerMetricCard label="Requests" value={`${jobs.length}`} />
      <CustomerMetricCard label="Pending" value={`${pending}`} />
      <CustomerMetricCard label="Active" value={`${active}`} />
      <CustomerMetricCard label="Completed" value={`${completed}`} />
    </section>
  );
}
