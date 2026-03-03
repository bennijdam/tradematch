import type { CustomerJobRequest } from '@tradematch/types';

export default function JobStatusCard({ job }: { job: CustomerJobRequest }) {
  return (
    <article className="panel" style={{ marginBottom: '0.75rem' }}>
      <h3 style={{ marginTop: 0 }}>{job.title}</h3>
      <p style={{ margin: '0.25rem 0', color: '#a1a1aa' }}>{job.postcode}</p>
      <p style={{ margin: 0 }}>Budget: £{job.budget}</p>
      <span className="badge" style={{ marginTop: '0.5rem' }}>{job.status}</span>
    </article>
  );
}
