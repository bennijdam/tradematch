'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Shield,
  Wallet,
  Settings,
  LogOut,
  ChevronRight,
  Briefcase,
  BarChart3,
  MapPin,
  Award,
  HelpCircle,
  Zap,
  AlertTriangle,
  CheckCircle,
  Users,
  Building2,
  Bell,
  FileCheck,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  tenantId?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number;
  badgeType?: 'neon' | 'amber' | 'danger';
  pulse?: boolean;
  section?: string;
}

// Determine role from pathname
const useDashboardRole = () => {
  const pathname = usePathname();
  if (pathname?.includes('/super-admin')) return 'super-admin';
  if (pathname?.includes('/vendor')) return 'vendor';
  return 'user';
};

// Navigation items by role
const getNavItems = (role: string): NavItem[] => {
  const baseItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: `/dashboards/${role}`, icon: LayoutDashboard },
  ];

  if (role === 'user') {
    return [
      ...baseItems,
      { id: 'projects', label: 'My Projects', href: '/dashboards/user/projects', icon: Briefcase, badge: 2, badgeType: 'neon' },
      { id: 'messages', label: 'Messages', href: '/dashboards/user/messages', icon: MessageSquare, badge: 3, badgeType: 'amber', pulse: true },
      { id: 'documents', label: 'Document Vault', href: '/dashboards/user/documents', icon: FileText },
      { id: 'escrow', label: 'Escrow', href: '/dashboards/user/escrow', icon: Wallet },
      { id: 'disputes', label: 'Disputes', href: '/dashboards/user/disputes', icon: Shield, badge: 'New', badgeType: 'danger' },
      { id: 'settings', label: 'Settings', href: '/dashboards/user/settings', icon: Settings, section: 'Account' },
    ];
  }

  if (role === 'vendor') {
    return [
      ...baseItems,
      { id: 'jobs', label: 'Active Jobs', href: '/dashboards/vendor/jobs', icon: Briefcase, badge: 5, badgeType: 'neon' },
      { id: 'leads', label: 'New Leads', href: '/dashboards/vendor/leads', icon: Zap, badge: 12, badgeType: 'amber', pulse: true },
      { id: 'analytics', label: 'Analytics', href: '/dashboards/vendor/analytics', icon: BarChart3 },
      { id: 'coverage', label: 'Coverage Map', href: '/dashboards/vendor/coverage', icon: MapPin },
      { id: 'messages', label: 'Messages', href: '/dashboards/vendor/messages', icon: MessageSquare, badge: 8, badgeType: 'neon' },
      { id: 'credentials', label: 'Credentials', href: '/dashboards/vendor/credentials', icon: Award, section: 'Profile' },
      { id: 'settings', label: 'Settings', href: '/dashboards/vendor/settings', icon: Settings },
    ];
  }

  // Super Admin
  return [
    { id: 'god', label: 'God View', href: '/dashboards/super-admin', icon: LayoutDashboard, active: true },
    { id: 'disputes', label: 'Dispute Centre', href: '/dashboards/super-admin/disputes', icon: AlertTriangle, badge: 3, badgeType: 'danger' },
    { id: 'verify', label: 'Verification', href: '/dashboards/super-admin/verify', icon: CheckCircle, badge: 7, badgeType: 'amber' },
    { id: 'escrow', label: 'Escrow Monitor', href: '/dashboards/super-admin/escrow', icon: Wallet },
    { id: 'users', label: 'Users', href: '/dashboards/super-admin/users', icon: Users, section: 'Management' },
    { id: 'vendors', label: 'Vendors', href: '/dashboards/super-admin/vendors', icon: Building2 },
    { id: 'reports', label: 'Reports', href: '/dashboards/super-admin/reports', icon: BarChart3 },
    { id: 'audit', label: 'Audit Trail', href: '/dashboards/super-admin/audit', icon: FileCheck },
  ];
};

export function Sidebar({ isCollapsed, tenantId }: SidebarProps) {
  const pathname = usePathname();
  const role = useDashboardRole();
  const navItems = getNavItems(role);
  const [profileOpen, setProfileOpen] = useState(false);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setProfileOpen(false);
    if (profileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileOpen]);

  // Group items by section
  const groupedItems = navItems.reduce((acc, item) => {
    const section = item.section || 'Main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 flex flex-col overflow-hidden transition-all duration-300 z-[200]"
      style={{
        width: isCollapsed ? '72px' : '268px',
        background: '#0E1420',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Sidebar Header / Logo */}
      <div 
        className="flex items-center gap-[10px] px-[16px] pt-[20px] pb-[16px] flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo Mark */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
            boxShadow: '0 0 14px rgba(0,229,160,0.22)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        {/* Logo Text */}
        <div 
          className="overflow-hidden transition-opacity duration-200"
          style={{ opacity: isCollapsed ? 0 : 1 }}
        >
          <div 
            className="font-sora text-[15px] font-extrabold tracking-[-0.04em] whitespace-nowrap"
            style={{ color: '#F0F4FF' }}
          >
            TradeMatch
          </div>
          <div 
            className="font-mono text-[9px] uppercase tracking-[0.12em] whitespace-nowrap"
            style={{ color: '#00E5A0', opacity: 0.8 }}
          >
            {role === 'super-admin' ? 'Super Admin' : role === 'vendor' ? 'Pro' : 'Homeowner'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav 
        className="flex-1 overflow-y-auto overflow-x-hidden p-[8px]"
        style={{
          scrollbarWidth: '3px',
        }}
      >
        {Object.entries(groupedItems).map(([section, items], sectionIndex) => (
          <div key={section}>
            {/* Section Label */}
            {section !== 'Main' && (
              <div
                className="px-[16px] pb-[6px] pt-[16px] uppercase whitespace-nowrap overflow-hidden transition-opacity duration-200"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: '#4A5568',
                  opacity: isCollapsed ? 0 : 1,
                }}
              >
                {section}
              </div>
            )}

            {/* Nav Items */}
            {items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center relative rounded-[10px] transition-all duration-[180ms] whitespace-nowrap"
                  style={{
                    gap: '11px',
                    padding: '10px',
                    color: active ? '#00E5A0' : '#8B95AA',
                    fontSize: '13.5px',
                    fontWeight: active ? 600 : 500,
                    background: active || (item.id === 'dashboard' && pathname === item.href) 
                      ? 'rgba(0,229,160,0.1)' 
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                      e.currentTarget.style.color = '#F0F4FF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#8B95AA';
                    }
                  }}
                >
                  {/* Active Indicator */}
                  {active && (
                    <div
                      className="absolute left-[-8px] top-1/2 -translate-y-1/2"
                      style={{
                        width: '3px',
                        height: '20px',
                        background: '#00E5A0',
                        borderRadius: '0 3px 3px 0',
                        boxShadow: '0 0 14px rgba(0,229,160,0.22)',
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: '20px', height: '20px' }}>
                    <Icon size={18} strokeWidth={1.8} />
                  </div>

                  {/* Label */}
                  <span 
                    className="overflow-hidden transition-all duration-300"
                    style={{ 
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : 'auto',
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && !isCollapsed && (
                    <span
                      className="ml-auto flex-shrink-0 font-mono text-[10px] font-medium px-[7px] py-[2px] rounded-full transition-opacity duration-200"
                      style={{
                        background: item.badgeType === 'amber' ? '#FFA726' : 
                                   item.badgeType === 'danger' ? '#FF4757' : '#00E5A0',
                        color: item.badgeType === 'amber' ? '#000' : 
                               item.badgeType === 'danger' ? '#fff' : '#000',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Pulse Dot */}
                  {item.pulse && !isCollapsed && (
                    <div 
                      className="ml-auto flex-shrink-0 rounded-full animate-pulse"
                      style={{
                        width: '7px',
                        height: '7px',
                        background: '#00E5A0',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer - Profile */}
      <div 
        className="p-[12px] relative flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          className="flex items-center gap-[10px] w-full rounded-[10px] transition-colors duration-200 text-left"
          style={{ padding: '10px 8px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
          }}
          onMouseLeave={(e) => {
            if (!profileOpen) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            setProfileOpen(!profileOpen);
          }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-full font-sora text-[13px] font-bold"
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              color: '#fff',
            }}
          >
            {role === 'super-admin' ? 'SA' : role === 'vendor' ? 'VD' : 'US'}
          </div>

          {/* Avatar Info */}
          <div 
            className="flex-1 overflow-hidden transition-all duration-200"
            style={{ 
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
            }}
          >
            <div className="text-[13px] font-semibold whitespace-nowrap" style={{ color: '#F0F4FF' }}>
              {role === 'super-admin' ? 'James D.' : role === 'vendor' ? 'Mike Wilson' : 'Sarah Johnson'}
            </div>
            <div className="text-[11px] whitespace-nowrap" style={{ color: '#8B95AA' }}>
              {role === 'super-admin' ? 'Super Admin · L5' : role === 'vendor' ? 'Elite Vendor' : 'Homeowner'}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight 
            size={14} 
            strokeWidth={2}
            className="flex-shrink-0 transition-all duration-200"
            style={{ 
              color: '#4A5568',
              opacity: isCollapsed ? 0 : 1,
              transform: profileOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Profile Dropdown */}
        {profileOpen && !isCollapsed && (
          <div
            className="absolute left-[12px] right-[12px] z-[300] overflow-hidden"
            style={{
              bottom: 'calc(100% + 8px)',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'dropup 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Dropdown Header */}
            <div 
              className="flex items-center gap-[12px] p-[16px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center justify-center rounded-full font-sora text-[16px] font-bold"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {role === 'super-admin' ? 'SA' : role === 'vendor' ? 'VD' : 'US'}
              </div>
              <div>
                <div className="text-[14px] font-bold" style={{ color: '#F0F4FF' }}>
                  {role === 'super-admin' ? 'James D.' : role === 'vendor' ? 'Mike Wilson' : 'Sarah Johnson'}
                </div>
                <div 
                  className="flex items-center gap-[5px] font-mono text-[10px] mt-[2px]"
                  style={{ color: '#42A5F5' }}
                >
                  <span>{role === 'super-admin' ? 'Super Admin · L5' : role === 'vendor' ? 'Elite Vendor' : 'Verified Homeowner'}</span>
                </div>
              </div>
            </div>

            {/* Dropdown Items */}
            <button 
              className="flex items-center gap-[10px] w-full px-[16px] py-[11px] text-[13px] font-medium transition-colors duration-150"
              style={{ color: '#8B95AA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                e.currentTarget.style.color = '#F0F4FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8B95AA';
              }}
            >
              <Settings size={16} strokeWidth={1.8} />
              Account Settings
            </button>

            <button 
              className="flex items-center gap-[10px] w-full px-[16px] py-[11px] text-[13px] font-medium transition-colors duration-150"
              style={{ color: '#8B95AA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                e.currentTarget.style.color = '#F0F4FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8B95AA';
              }}
            >
              <Bell size={16} strokeWidth={1.8} />
              Notifications
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

            <button 
              className="flex items-center gap-[10px] w-full px-[16px] py-[11px] text-[13px] font-medium transition-colors duration-150"
              style={{ color: '#FF4757' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,71,87,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={16} strokeWidth={1.8} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
