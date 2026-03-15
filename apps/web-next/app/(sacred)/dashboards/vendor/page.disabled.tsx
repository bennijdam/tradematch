/**
 * Vendor Dashboard - SACRED ROUTE
 * 
 * This route bypasses the standard Next.js layout.
 * The SacredVendorDashboard has 100% control over the viewport.
 */

import { SacredVendorDashboardWrapper } from './SacredVendorDashboardWrapper';

export default function VendorDashboardPage() {
  return <SacredVendorDashboardWrapper />;
}
