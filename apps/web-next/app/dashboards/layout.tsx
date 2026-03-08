'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

/**
 * Dashboard Layout
 * 
 * Multi-tenant dashboard shell with pixel-perfect parity to legacy HTML.
 * Provides role-based navigation and tenant isolation.
 * 
 * Routes:
 * /dashboards/user/* - User/Customer dashboard
 * /dashboards/vendor/* - Vendor dashboard
 * /dashboards/super-admin/* - Super Admin dashboard
 */

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardShell({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
      if (window.innerWidth < 900) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div 
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#080C12' }}
      data-theme="dark"
    >
      {/* Background Wallpaper - Exact from legacy */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 0%, rgba(0,229,160,0.035) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(66,165,245,0.025) 0%, transparent 60%)
          `,
        }}
      />

      {/* Sidebar Navigation */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleSidebar={toggleSidebar}
        tenantId={user?.tenantId}
      />

      {/* Main Content Area */}
      <div 
        className="relative z-[1] flex flex-col min-h-screen transition-[margin] duration-300"
        style={{
          marginLeft: isCollapsed ? '72px' : '268px',
          transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Topbar */}
        <Topbar 
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          tenantId={user?.tenantId}
        />

        {/* Content */}
        <main 
          className="flex-1 p-[32px] relative"
          style={{ 
            marginTop: '72px',
            minHeight: 'calc(100vh - 72px)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </AuthProvider>
  );
}
