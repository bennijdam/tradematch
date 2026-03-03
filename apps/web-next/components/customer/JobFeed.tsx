import type { CustomerJobRequest } from '@tradematch/types';
import JobStatusCard from './JobStatusCard';

export default function JobFeed({ jobs }: { jobs: CustomerJobRequest[] }) {
  return (
    <section id="jobs">
      <h2>My Job Requests</h2>
      {jobs.map((job) => (
        <JobStatusCard key={job.id} job={job} />
      ))}
    </section>
  );
}
