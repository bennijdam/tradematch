import type { CustomerJobRequest } from '@tradematch/types';

export default function StatsOverview({ jobs }: { jobs: CustomerJobRequest[] }) {
  const pending = jobs.filter((job) => job.status === 'Pending').length;
  const active = jobs.filter((job) => job.status === 'In Progress').length;
  const completed = jobs.filter((job) => job.status === 'Completed').length;

  return (
    <section className="grid grid-4">
      <article className="panel"><h3>Requests</h3><p>{jobs.length}</p></article>
      <article className="panel"><h3>Pending</h3><p>{pending}</p></article>
      <article className="panel"><h3>Active</h3><p>{active}</p></article>
      <article className="panel"><h3>Completed</h3><p>{completed}</p></article>
    </section>
  );
}
