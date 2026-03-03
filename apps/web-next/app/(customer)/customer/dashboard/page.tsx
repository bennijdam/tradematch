import '@/styles/variables.module.css';
import CustomerHeader from '@/components/customer/CustomerHeader';
import StatsOverview from '@/components/customer/StatsOverview';
import JobFeed from '@/components/customer/JobFeed';
import MessageInbox from '@/components/customer/MessageInbox';
import CustomerActions from '@/components/customer/CustomerActions';
import type { CustomerJobRequest, VendorLeadNotification } from '@tradematch/types';
import styles from './Dashboard.module.css';

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

type DashboardSearchParams = {
  mode?: string | string[];
};

function resolveMode(mode: string | string[] | undefined): 'full' | 'lite' {
  if (Array.isArray(mode)) {
    return mode.includes('lite') ? 'lite' : 'full';
  }

  return mode === 'lite' ? 'lite' : 'full';
}

export default async function CustomerDashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;
}) {
  const params = await Promise.resolve(searchParams);
  const uiMode = resolveMode(params?.mode);
  const unreadLeads = vendorLeadNotifications.filter((lead) => lead.unread).length;

  return (
    <section className={`${styles.container} container`} data-mode={uiMode}>
      <CustomerHeader linkedEvents={vendorLeadNotifications.length} unread={unreadLeads} />
      <StatsOverview jobs={jobRequests} />
      <div className={styles.contentGrid}>
        <JobFeed jobs={jobRequests} />
        <div className={styles.sidebarStack}>
          <CustomerActions />
          <MessageInbox />
        </div>
      </div>
    </section>
  );
}
