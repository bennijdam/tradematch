import type { CustomerJobRequest, VendorLeadNotification } from '@tradematch/types';
import CustomerHeader from './CustomerHeader';
import VendorProfileBlock from './VendorProfileBlock';
import CopilotBlock from './CopilotBlock';
import AlertsBlock from './AlertsBlock';
import styles from './CustomerLiteralSkeleton.module.css';
import activeStyles from './ActiveProjectBlock.module.css';
import milestoneStyles from './MilestoneFeedBlock.module.css';
import completedStyles from './CompletedProjectsBlock.module.css';

function ActiveProjectBlockLiteral() {
  return (
    <section>
      <div className={activeStyles.sectionHeader}>
        <div>
          <div className={activeStyles.sectionTitle}>🏗️ Kitchen Extension — Active Project</div>
          <div className={activeStyles.sectionSub}>147 Abingdon Road, London SW1A · Started 14 Feb 2026</div>
        </div>
        <button type="button" className={activeStyles.trackBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>Track Arrival</span>
        </button>
      </div>

      <div className={activeStyles.activeJobCard}>
        <div className={activeStyles.activeJobHeader}>
          <div>
            <div className={activeStyles.activeJobTitle}>Jake Donovan · Electrician</div>
            <div className={activeStyles.activeJobMeta}>En Route · 28 min ETA · Show-Up Score 97%</div>
          </div>
          <span className={activeStyles.liveBadge}>
            <span className={activeStyles.liveBadgeDot} />
            Live · En Route
          </span>
        </div>

        <div className={activeStyles.enRouteMapPanel}>
          <div className={activeStyles.mapPanelInner}>
            <div>
              <div className={activeStyles.mapPanelTitle}>Jake is on his way 📍</div>
              <div className={activeStyles.mapPanelSub}>GPS active · ETA <strong>~28 minutes</strong> · 147 Abingdon Road</div>
            </div>
            <button type="button" className={activeStyles.viewMapBtn}>View Live Map</button>
          </div>
        </div>

        <div className={activeStyles.gpsMapArea}>
          <div className={activeStyles.mapGrid} />
          <div className={activeStyles.mapRoadH} style={{ top: '35%' }} />
          <div className={activeStyles.mapRoadH} style={{ top: '65%' }} />
          <div className={activeStyles.mapRoadV} style={{ left: '30%' }} />
          <div className={activeStyles.mapRoadV} style={{ left: '70%' }} />

          <div className={activeStyles.vendorPin} style={{ left: '40%', top: '45%', display: 'none' }}>
            <div className={activeStyles.vendorPinDot}>JD</div>
            <div className={activeStyles.vendorPinLabel}>Jake · En Route</div>
          </div>

          <div className={activeStyles.homePin}>
            <div className={activeStyles.homePinDot}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div className={activeStyles.homePinLabel}>Your Home</div>
          </div>

          <div className={activeStyles.etaChip} style={{ display: 'none' }}>
            <div className={activeStyles.etaChipLabel}>ETA</div>
            <div className={activeStyles.etaChipTime}>28 min</div>
          </div>

          <div className={activeStyles.gpsOffline}>
            <div className={activeStyles.gpsOfflineIcon}>📍</div>
            <div className={activeStyles.gpsOfflineText}>GPS tracking offline<br /><small>Enable to see real-time arrival</small></div>
          </div>
        </div>

        <div className={activeStyles.activeJobFooter}>
          <div className={activeStyles.jobProgressWrap}>
            <div className={activeStyles.jobProgressLabel}>
              <span>Project Progress</span>
              <span>45% complete</span>
            </div>
            <div className={activeStyles.jobProgressTrack}>
              <div className={activeStyles.jobProgressFill} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MilestoneFeedBlockLiteral() {
  return (
    <section>
      <div className={milestoneStyles.sectionHeader}>
        <div>
          <div className={milestoneStyles.sectionTitle}>📋 Milestone Feed</div>
          <div className={milestoneStyles.sectionSub}>Approve or reject each stage to control escrow releases</div>
        </div>
      </div>

      <div className={milestoneStyles.feed}>
        <article className={milestoneStyles.card}>
          <div className={milestoneStyles.cardHeader}>
            <div className={`${milestoneStyles.milestoneNum} ${milestoneStyles.done}`}>✓</div>
            <div>
              <div className={milestoneStyles.cardTitle}>Milestone 1 — Site Preparation &amp; Materials</div>
              <div className={milestoneStyles.cardSub}>Approved 22 Feb 2026 · £1,250 released</div>
            </div>
            <div className={`${milestoneStyles.statusChip} ${milestoneStyles.doneChip}`}>Approved</div>
          </div>
          <div className={milestoneStyles.photos3}>
            <div className={milestoneStyles.photo}>🏗️<div className={milestoneStyles.photoLabel}>Before</div></div>
            <div className={milestoneStyles.photo}>📦<div className={milestoneStyles.photoLabel}>Materials</div></div>
            <div className={milestoneStyles.photo}>✅<div className={milestoneStyles.photoLabel}>Site Ready</div></div>
          </div>
        </article>

        <article className={`${milestoneStyles.card} ${milestoneStyles.awaitingReview}`}>
          <div className={milestoneStyles.cardHeader}>
            <div className={`${milestoneStyles.milestoneNum} ${milestoneStyles.review}`}>2</div>
            <div>
              <div className={milestoneStyles.cardTitle}>Milestone 2 — First Fix &amp; Framework</div>
              <div className={milestoneStyles.cardSub}>Submitted today · £1,500 awaiting your approval</div>
            </div>
            <div className={`${milestoneStyles.statusChip} ${milestoneStyles.reviewChip}`}>⏳ Review Required</div>
          </div>
          <div className={milestoneStyles.photos4}>
            <div className={milestoneStyles.photo}>🔧<div className={milestoneStyles.photoLabel}>Tap to view</div><div className={milestoneStyles.signoffCheck}>✓</div></div>
            <div className={milestoneStyles.photo}>⚡<div className={milestoneStyles.photoLabel}>Tap to view</div><div className={milestoneStyles.signoffCheck}>✓</div></div>
            <div className={milestoneStyles.photo}>🏗️<div className={milestoneStyles.photoLabel}>Tap to view</div><div className={milestoneStyles.signoffCheck}>✓</div></div>
            <div className={milestoneStyles.photo}>📐<div className={milestoneStyles.photoLabel}>Tap to view</div><div className={milestoneStyles.signoffCheck}>✓</div></div>
          </div>

          <div className={milestoneStyles.qualityAuditArea}>
            <div className={milestoneStyles.qualityAuditLabel}>Quality Audit — Compare Evidence</div>
            <div className={milestoneStyles.qualityAuditGrid}>
              <div className={milestoneStyles.auditPanel}>
                <div className={milestoneStyles.auditPanelLabel}>Vendor Photos</div>
                <div className={milestoneStyles.auditPanelIcon}>📸</div>
                <div className={milestoneStyles.auditPanelAction}>4 photos submitted by Jake</div>
              </div>
              <div className={`${milestoneStyles.auditPanel} ${milestoneStyles.uploadZone}`}>
                <div className={milestoneStyles.auditPanelLabel}>Your Evidence</div>
                <div className={milestoneStyles.auditPanelIcon}>📷</div>
                <div className={milestoneStyles.auditPanelAction}>Tap to upload your own site photo for comparison</div>
              </div>
            </div>
          </div>

          <div className={milestoneStyles.actions}>
            <button type="button" className={milestoneStyles.rejectBtn}>✗ Reject Milestone</button>
            <button type="button" className={milestoneStyles.approveBtn}>✓ Approve &amp; Release £1,500</button>
            <button type="button" className={milestoneStyles.reportBtn}>⚠ Report Issue</button>
            <span className={milestoneStyles.hint}>View all 4 photos to approve</span>
          </div>
        </article>

        <article className={`${milestoneStyles.card} ${milestoneStyles.lockedCard}`}>
          <div className={milestoneStyles.cardHeader}>
            <div className={`${milestoneStyles.milestoneNum} ${milestoneStyles.locked}`}>3</div>
            <div>
              <div className={milestoneStyles.cardTitle}>Milestone 3 — Second Fix &amp; Finishing</div>
              <div className={milestoneStyles.cardSub}>Unlocks after Milestone 2 is approved · £1,000</div>
            </div>
            <div className={`${milestoneStyles.statusChip} ${milestoneStyles.lockedChip}`}>Locked</div>
          </div>
        </article>

        <article className={`${milestoneStyles.card} ${milestoneStyles.lockedCard}`}>
          <div className={milestoneStyles.cardHeader}>
            <div className={`${milestoneStyles.milestoneNum} ${milestoneStyles.locked}`}>4</div>
            <div>
              <div className={milestoneStyles.cardTitle}>Milestone 4 — Final Sign-off</div>
              <div className={milestoneStyles.cardSub}>Final 20% · Requires Completion Certificate preview · £500</div>
            </div>
            <div className={`${milestoneStyles.statusChip} ${milestoneStyles.certChip}`}>Cert Required</div>
          </div>
        </article>
      </div>
    </section>
  );
}

function CompletedProjectsBlockLiteral() {
  return (
    <section>
      <div className={completedStyles.sectionHeader}>
        <div>
          <div className={completedStyles.sectionTitle}>✅ Completed Projects</div>
          <div className={completedStyles.sectionSub}>All milestones paid · Home Passport certificates available</div>
        </div>
      </div>

      <article className={completedStyles.card}>
        <div className={completedStyles.cardHeader}>
          <div>
            <div className={completedStyles.titleRow}>
              <div className={completedStyles.cardTitle}>Fuse Box Replacement</div>
              <span className={completedStyles.completeChip}>Complete</span>
            </div>
            <div className={completedStyles.cardMeta}>Marcus Reed · NICEIC Electrician · Jan 2026 · £1,240</div>
          </div>
          <div className={completedStyles.amountCol}>
            <div className={completedStyles.amount}>£1,240</div>
            <div className={completedStyles.amountSub}>Fully Released</div>
          </div>
        </div>

        <div className={completedStyles.body}>
          <div className={completedStyles.badge}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            All 3 milestones approved · NICEIC certified
          </div>

          <div className={completedStyles.milestonesGrid}>
            <div className={completedStyles.milestoneCell}><div>✓</div><span>M1 Done</span></div>
            <div className={completedStyles.milestoneCell}><div>✓</div><span>M2 Done</span></div>
            <div className={completedStyles.milestoneCell}><div>✓</div><span>M3 Done</span></div>
          </div>
        </div>

        <div className={completedStyles.certSection}>
          <button type="button" className={completedStyles.downloadBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Home Passport (PDF)
          </button>
          <div className={completedStyles.certStamp}>Cert ID: TM-CERT-2026-0112 · NICEIC · Issued 28 Jan 2026</div>
        </div>
      </article>
    </section>
  );
}

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

export default function CustomerLiteralSkeleton() {
  const unreadLeads = vendorLeadNotifications.filter((lead) => lead.unread).length;

  return (
    <section className={styles.container}>
      <header className={styles.topnav}>
        <button type="button" className={styles.hamburger} aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className={styles.breadcrumb}>
          <span>TradeMatch</span>
          <span className={styles.sep}>›</span>
          <span className={styles.current}>My Projects</span>
        </div>
        <div className={styles.aeoBar}>
          <div className={styles.aeoInput}>Find me a certified electrician for a consumer unit upgrade in NW1…</div>
        </div>
        <div className={styles.topnavRight}>
          <span className={styles.pill}>In Escrow £4,250</span>
          <span className={styles.alert}>Alerts 3</span>
          <button type="button" className={styles.postJob}>Post a Job</button>
        </div>
      </header>

      <div className={styles.aeoOverlay} aria-hidden="true" />

      <main className={styles.main}>
        <CustomerHeader linkedEvents={vendorLeadNotifications.length} unread={unreadLeads} />

        <section className={styles.escrowCustodyCard}>
          <div className={styles.escrowCustodyBanner}>
            <div className={styles.stripeBadge}>
              <div className={styles.stripeBadgeDot} />
              Stripe Custody
            </div>
            <div className={styles.escrowCustodyMessage}>
              <strong>Funds held in secure Stripe Escrow</strong> — TradeMatch cannot move these funds without your explicit milestone approval.
            </div>
            <button type="button" className={styles.ghostBtn}>View Details</button>
          </div>

          <div className={styles.threeStateWrap}>
            <div className={styles.escrowThreeState}>
              <div className={`${styles.estCell} ${styles.estCellFunded}`}>
                <div className={styles.estLabel}>Funded</div>
                <div className={styles.estAmount}>£4,250</div>
                <div className={styles.estSub}>Your bank</div>
              </div>
              <div className={`${styles.estCell} ${styles.estCellEscrow}`}>
                <div className={styles.estLabel}>In Escrow</div>
                <div className={styles.estAmount}>£3,000</div>
                <div className={styles.estSub}>TM custody</div>
              </div>
              <div className={`${styles.estCell} ${styles.estCellReleased}`}>
                <div className={styles.estLabel}>Released</div>
                <div className={styles.estAmount}>£1,250</div>
                <div className={styles.estSub}>To vendor</div>
              </div>
            </div>
          </div>

          <div className={`${styles.releaseAlert} ${styles.visible}`}>
            <div className={styles.releaseAlertIcon}>🔔</div>
            <div className={styles.releaseAlertText}>
              Milestone 2 Review Requested by Jake Donovan
              <span>Jake has uploaded 4 progress photos. Review them to approve or reject the £1,500 release.</span>
            </div>
            <button type="button" className={styles.amberBtn}>Review &amp; Release →</button>
          </div>

          <div className={styles.escrowMilestones}>
            <div className={styles.escrowMilestoneRow}>
              <div className={`${styles.milestoneStepBadge} ${styles.done}`}>✓</div>
              <div className={styles.milestoneRowName}>Milestone 1 — Site Preparation &amp; Materials</div>
              <div className={styles.milestoneRowAmount}>£1,250</div>
              <div className={`${styles.milestoneRowStatus} ${styles.doneStatus}`}>Released</div>
            </div>
            <div className={styles.escrowMilestoneRow}>
              <div className={`${styles.milestoneStepBadge} ${styles.active}`}>2</div>
              <div className={styles.milestoneRowName}>Milestone 2 — First Fix &amp; Framework</div>
              <div className={styles.milestoneRowAmount}>£1,500</div>
              <div className={`${styles.milestoneRowStatus} ${styles.pendingStatus}`}>Awaiting Review</div>
            </div>
            <div className={styles.escrowMilestoneRow}>
              <div className={`${styles.milestoneStepBadge} ${styles.locked}`}>3</div>
              <div className={styles.milestoneRowName}>Milestone 3 — Second Fix &amp; Finishing</div>
              <div className={styles.milestoneRowAmount}>£1,000</div>
              <div className={`${styles.milestoneRowStatus} ${styles.lockedStatus}`}>Locked</div>
            </div>
            <div className={styles.escrowMilestoneRow}>
              <div className={`${styles.milestoneStepBadge} ${styles.locked}`}>4</div>
              <div className={styles.milestoneRowName}>Milestone 4 — Final Sign-off &amp; Certificate</div>
              <div className={styles.milestoneRowAmount}>£500</div>
              <div className={`${styles.milestoneRowStatus} ${styles.lockedStatus}`}>Final 20%</div>
            </div>
          </div>
        </section>

        <div className={styles.dashboardGrid}>
          <div className={styles.dashboardLeft}>
            <ActiveProjectBlockLiteral />
            <MilestoneFeedBlockLiteral />
            <CompletedProjectsBlockLiteral />
          </div>
          <div className={styles.dashboardRight}>
            <VendorProfileBlock />
            <CopilotBlock />
            <AlertsBlock />
          </div>
        </div>
      </main>
    </section>
  );
}
