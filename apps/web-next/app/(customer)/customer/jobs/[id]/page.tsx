import type { CustomerJobRequest } from '@tradematch/types';

const jobs: CustomerJobRequest[] = [
  { id: 'jr-101', title: 'Kitchen rewiring', postcode: 'E14', status: 'In Progress', budget: 1800 },
  { id: 'jr-102', title: 'Bathroom tiling', postcode: 'SW1', status: 'Pending', budget: 2400 },
  { id: 'jr-103', title: 'Boiler service', postcode: 'M4', status: 'Completed', budget: 220 },
];

export default async function CustomerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = jobs.find((entry) => entry.id === id);

  if (!job) {
    return (
      <section className="container">
        <h1>Job Not Found</h1>
      </section>
    );
  }

  return (
    <section className="container panel">
      <h1>{job.title}</h1>
      <p>Postcode: {job.postcode}</p>
      <p>Status: {job.status}</p>
      <p>Budget: £{job.budget}</p>
    </section>
  );
}
