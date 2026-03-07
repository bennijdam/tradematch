import Header from './Header';
import MetricCard from './MetricCard';
import ReliabilityCard from './ReliabilityCard';
import DisputeCentrePreview from './DisputeCentrePreview';
import styles from './NativeVendorDashboard.module.css';

export default function NativeVendorDashboard() {
  return (
    <section className={styles.container}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>TradeMatch › Dashboard</div>
        <div className={styles.topbarCenter}>
          <div className={styles.searchStub}>Search leads, messages, jobs…</div>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.pill}>Balance £47.50</span>
          <span className={styles.pillAlert}>Alerts 3</span>
        </div>
      </div>
      <Header />
      <div className={styles.statsGrid}>
        <MetricCard icon="leaf" label="Leads Received" value="24" sub="This month · 8 new this week" trend="+12%" />
        <MetricCard icon="shield" label="Jobs Won" value="7" sub="29% win rate · Above average" trend="+5%" />
        <MetricCard icon="pound" label="Revenue Earned" value="£6,200" sub="Via TradeMatch this month" trend="+£840" />
        <MetricCard
          icon="eye"
          label="Profile Views"
          value="150"
          sub="850 / 1,000 impressions used"
          trend="-15%"
          trendTone="red"
          progress={{ label: 'Monthly Impressions', value: '85%', percent: 85 }}
        />
      </div>
      <div className={styles.lowerGrid}>
        <ReliabilityCard showUpScore={100} />
        <DisputeCentrePreview />
      </div>
    </section>
  );
}
