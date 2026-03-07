'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Store,
  MessageSquare,
  Bell,
  Settings,
  CreditCard,
  FileText,
  BarChart3,
  Briefcase,
  Heart,
  Target,
  DollarSign,
  Star,
  User,
  AlertTriangle,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

// ========================================
// NAVIGATION CONFIGURATION
// ========================================

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: 'neon' | 'danger' | 'amber';
}

const NAVIGATION_CONFIG: Record<UserRole, NavItem[]> = {
  super_admin: [
    { id: 'overview', label: 'Overview', href: '/dashboards/super-admin', icon: LayoutDashboard },
    { id: 'users', label: 'Users', href: '/dashboards/super-admin/users', icon: Users, badge: 1247 },
    { id: 'vendors', label: 'Vendors', href: '/dashboards/super-admin/vendors', icon: Store, badge: 342 },
    { id: 'finance', label: 'Finance', href: '/dashboards/super-admin/finance', icon: DollarSign },
    { id: 'disputes', label: 'Disputes', href: '/dashboards/super-admin/disputes', icon: AlertTriangle, badge: 8, badgeVariant: 'danger' },
    { id: 'analytics', label: 'Analytics', href: '/dashboards/super-admin/analytics', icon: BarChart3 },
    { id: 'trust', label: 'Trust & Safety', href: '/dashboards/super-admin/trust-safety', icon: Shield },
    { id: 'audit', label: 'Audit Log', href: '/dashboards/super-admin/audit', icon: FileText },
    { id: 'settings', label: 'Settings', href: '/dashboards/super-admin/settings', icon: Settings },
  ],
  
  vendor: [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboards/vendor', icon: LayoutDashboard },
    { id: 'leads', label: 'New Leads', href: '/dashboards/vendor/leads', icon: Target, badge: 12 },
    { id: 'quotes', label: 'Quotes', href: '/dashboards/vendor/quotes', icon: FileText, badge: 7 },
    { id: 'messages', label: 'Messages', href: '/dashboards/vendor/messages', icon: MessageSquare, badge: 3, badgeVariant: 'neon' },
    { id: 'earnings', label: 'Earnings', href: '/dashboards/vendor/earnings', icon: DollarSign },
    { id: 'reviews', label: 'Reviews', href: '/dashboards/vendor/reviews', icon: Star },
    { id: 'profile', label: 'Profile', href: '/dashboards/vendor/profile', icon: User },
    { id: 'billing', label: 'Billing', href: '/dashboards/vendor/billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', href: '/dashboards/vendor/settings', icon: Settings },
  ],
  
  customer: [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboards/user', icon: LayoutDashboard },
    { id: 'jobs', label: 'My Jobs', href: '/dashboards/user/jobs', icon: Briefcase, badge: 3 },
    { id: 'quotes', label: 'Quotes', href: '/dashboards/user/quotes', icon: FileText, badge: 5 },
    { id: 'messages', label: 'Messages', href: '/dashboards/user/messages', icon: MessageSquare, badge: 2, badgeVariant: 'neon' },
    { id: 'saved', label: 'Saved Trades', href: '/dashboards/user/saved', icon: Heart },
    { id: 'notifications', label: 'Notifications', href: '/dashboards/user/notifications', icon: Bell, badge: 4 },
    { id: 'billing', label: 'Billing', href: '/dashboards/user/billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', href: '/dashboards/user/settings', icon: Settings },
  ],
  
  // Admin roles inherit from super_admin but with limited access
  admin: [],
  finance_admin: [],
  trust_safety_admin: [],
  support_admin: [],
  read_only_admin: [],
};

// ========================================
// NAVIGATION ITEM COMPONENT
// ========================================

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

function NavigationItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-[14px] py-[7px] cursor-pointer',
        'text-[12px] font-medium transition-all duration-150',
        'border-l-2 border-transparent',
        'hover:bg-neon-dim hover:text-t2',
        isActive && 'bg-neon-dim text-neon border-l-neon'
      )}
    >
      <Icon className="w-[13px] h-[13px] flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'ml-auto font-mono text-[8.5px] font-bold px-[6px] py-[1px] rounded-full',
            item.badgeVariant === 'danger' && 'bg-danger text-white',
            item.badgeVariant === 'amber' && 'bg-amber text-black',
            (!item.badgeVariant || item.badgeVariant === 'neon') && 'bg-bg-5 text-t4 border border-border'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ========================================
// SIDEBAR COMPONENT
// ========================================

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const role = user?.role || 'customer';
  const navItems = NAVIGATION_CONFIG[role] || NAVIGATION_CONFIG.customer;
  
  // Group nav items
  const mainItems = navItems.slice(0, -1);
  const settingsItem = navItems[navItems.length - 1];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[200] p-2 bg-bg-2 border border-border rounded-md"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-[100] w-[218px] bg-bg-1 border-r border-border',
          'flex flex-col flex-shrink-0 transition-transform duration-300',
          'lg:translate-x-0',
          !isMobileMenuOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="px-[14px] py-4 border-b border-border flex items-center gap-[10px]">
          <div className="w-7 h-7 rounded-[7px] bg-neon flex items-center justify-center font-syne text-[12px] font-extrabold text-black flex-shrink-0">
            TM
          </div>
          <div>
            <div className="font-syne text-[13px] font-bold text-t1">TradeMatch</div>
            <div className="font-mono text-[7.5px] text-neon uppercase tracking-[0.14em]">
              {role.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto sidebar-scroll py-2">
          {/* Main Navigation */}
          <div className="space-y-[2px]">
            {mainItems.map((item) => (
              <NavigationItem
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </div>

          {/* Settings Section */}
          <div className="mt-6 pt-4 border-t border-border">
            <NavigationItem
              item={settingsItem}
              isActive={pathname === settingsItem.href}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>

        {/* User Section */}
        <div className="mt-auto px-[14px] py-[10px] border-t border-border">
          <div className="flex items-center gap-2 px-[10px] py-2 bg-bg-3 rounded-lg border border-border">
            <div className="w-[26px] h-[26px] rounded-md bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center font-syne text-[10px] font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-t1 truncate">
                {user?.name || 'User'}
              </div>
              <div className="font-mono text-[7.5px] text-neon tracking-wide">
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center gap-2 px-[14px] py-2 text-t3 text-[12px] hover:text-danger transition-colors"
          >
            <LogOut className="w-[13px] h-[13px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

// ========================================
// TOPBAR COMPONENT
// ========================================

export function Topbar() {
  const { user } = useAuth();
  const { time } = useClock();

  return (
    <header className="h-[54px] bg-bg-1 border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
      {/* Title */}
      <div>
        <h1 className="font-syne text-[14px] font-bold text-t1">
          {user?.role === 'super_admin' ? 'Command Centre' : 'Dashboard'}
        </h1>
        <div className="font-mono text-[7.5px] text-t4 tracking-wide uppercase">
          TradeMatch Platform
        </div>
      </div>

      {/* Right Section */}
      <div className="ml-auto flex items-center gap-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 font-mono text-[8.5px] text-neon">
          <span className="w-[6px] h-[6px] rounded-full bg-neon shadow-neon animate-pulse" />
          <span>LIVE</span>
        </div>

        {/* Clock */}
        <div className="font-mono text-[13px] font-semibold text-neon tracking-tight">
          {time}
        </div>
      </div>
    </header>
  );
}

// Import useClock
import { useClock } from '@/hooks/useClock';

export default Navigation;
