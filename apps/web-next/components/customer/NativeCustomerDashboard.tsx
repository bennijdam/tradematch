import CustomerHeader from './CustomerHeader';
import StatsOverview from './StatsOverview';
import JobFeed from './JobFeed';
import CustomerActions from './CustomerActions';
import MessageInbox from './MessageInbox';
import type { CustomerJobRequest, VendorLeadNotification } from '@tradematch/types';
import styles from './NativeCustomerDashboard.module.css';

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

export default function NativeCustomerDashboard() {
  const unreadLeads = vendorLeadNotifications.filter((lead) => lead.unread).length;

  return (
    <section className={styles.container}>
      <div className={styles.topbar}>
        <button type="button" className={styles.hamburger} aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className={styles.breadcrumb}>TradeMatch › <span>My Projects</span></div>
        <div className={styles.topbarCenter}>
          <div className={styles.searchStub}>Find me a certified electrician…</div>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.pill}>In Escrow £4,250</span>
          <span className={styles.pillAlert}>Alerts 3</span>
          <button type="button" className={styles.postJob}>Post a Job</button>
        </div>
      </div>
      <CustomerHeader linkedEvents={vendorLeadNotifications.length} unread={unreadLeads} />
      <StatsOverview jobs={jobRequests} />
      <div className={styles.contentGrid}>
        <JobFeed jobs={jobRequests} />
        <div className={styles.stack}>
          <CustomerActions />
          <MessageInbox />
        </div>
      </div>
    </section>
  );
}
