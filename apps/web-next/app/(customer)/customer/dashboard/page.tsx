import Topbar from '@/components/layout/Topbar';
import StatsOverview from '@/components/customer/StatsOverview';
import JobFeed from '@/components/customer/JobFeed';
import MessageInbox from '@/components/customer/MessageInbox';
import CustomerActions from '@/components/customer/CustomerActions';
import type { CustomerJobRequest, VendorLeadNotification } from '@tradematch/types';

const jobRequests: CustomerJobRequest[] = [
  { id: 'jr-101', title: 'Kitchen rewiring', postcode: 'E14', status: 'In Progress', budget: 1800 },
  { id: 'jr-102', title: 'Bathroom tiling', postcode: 'SW1', status: 'Pending', budget: 2400 },
  { id: 'jr-103', title: 'Boiler service', postcode: 'M4', status: 'Completed', budget: 220 },
];

const vendorLeadNotifications: VendorLeadNotification[] = jobRequests.map((job) => ({
  leadId: `lead-${job.id}`,
  jobRequestId: job.id,
  title: job.title,
  budget: job.budget,
  unread: job.status === 'Pending',
}));

export default function CustomerDashboardPage() {
  const unreadLeads = vendorLeadNotifications.filter((lead) => lead.unread).length;

  return (
    <section className="container">
      <Topbar title="Customer Dashboard" />
      <p style={{ color: '#a1a1aa' }}>
        Shared Type Integration active: {vendorLeadNotifications.length} linked lead events, {unreadLeads} unread.
      </p>
      <StatsOverview jobs={jobRequests} />
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: '1rem' }}>
        <JobFeed jobs={jobRequests} />
        <div className="grid">
          <CustomerActions />
          <MessageInbox />
        </div>
      </div>
    </section>
  );
}
