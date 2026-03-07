'use client';

import { ReactNode } from 'react';
import { Sidebar, Topbar } from '@/components/dashboard/Navigation';
import { AuthProvider } from '@/hooks/useAuth';
import { TenantProvider } from '@/providers/TenantProvider';
import { Toaster } from '@/components/native/ui/toaster';

/**
 * Dashboard Layout
 * 
 * This is the master shell for all dashboard routes.
 * It provides:
 * - Authentication protection
 * - Role-based sidebar navigation
 * - Tenant isolation
 * - Consistent layout structure
 * 
 * Routes:
 * /dashboards/super-admin/* - Super Admin dashboard
 * /dashboards/vendor/* - Vendor dashboard
 * /dashboards/user/* - User/Customer dashboard
 */

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <div className="shell">
          {/* Sidebar Navigation */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Topbar */}
            <Topbar />

            {/* Content */}
            <main className="content">
              {children}
            </main>
          </div>
        </div>

        {/* Toast Notifications */}
        <Toaster />
      </TenantProvider>
    </AuthProvider>
  );
}
