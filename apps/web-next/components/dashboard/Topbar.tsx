'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Command,
  Wallet,
  Shield,
  AlertTriangle,
} from 'lucide-react';

interface TopbarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  tenantId?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Mock search results for AEO
const MOCK_SEARCH_RESULTS = [
  { id: 1, name: 'Elite Electricians Ltd', trade: 'Electrical', score: 9.8, initials: 'EE' },
  { id: 2, name: 'Pro Plumbing Co', trade: 'Plumbing', score: 9.5, initials: 'PP' },
  { id: 3, name: 'BuildMaster Pro', trade: 'Construction', score: 9.2, initials: 'BM' },
];

export function Topbar({ isCollapsed, toggleSidebar, tenantId }: TopbarProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [escrowAmount] = useState('£2,450.00');
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Get breadcrumbs from pathname
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const parts = pathname?.split('/').filter(Boolean) || [];
    const items: BreadcrumbItem[] = [{ label: 'Dashboard' }];
    
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'dashboard') {
        items.push({
          label: lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' '),
        });
      }
    }
    
    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header
      className="fixed top-0 right-0 h-[72px] flex items-center px-[32px] z-[100] transition-all duration-300"
      style={{
        left: isCollapsed ? '72px' : '268px',
        background: '#0E1420',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Left Section: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-[16px]">
        {/* Hamburger Button */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center rounded-[8px] border transition-all duration-200"
          style={{
            width: '36px',
            height: '36px',
            borderColor: 'rgba(255,255,255,0.07)',
            background: 'transparent',
            color: '#8B95AA',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
            e.currentTarget.style.color = '#00E5A0';
            e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8B95AA';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          }}
        >
          <Menu size={16} strokeWidth={2} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-[8px] text-[14px]" style={{ color: '#8B95AA' }}>
          {breadcrumbs.map((item, index) => (
            <span key={index} className="flex items-center gap-[8px]">
              {index > 0 && (
                <span style={{ color: '#4A5568' }}>/</span>
              )}
              {index === breadcrumbs.length - 1 ? (
                <span 
                  className="font-sora font-bold text-[15px]"
                  style={{ color: '#F0F4FF' }}
                >
                  {item.label}
                </span>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Center: AEO Search Bar */}
      <div className="flex-1 max-w-[520px] mx-[16px]" ref={searchRef}>
        <div
          className="flex items-center gap-[10px] rounded-[12px] px-[14px] cursor-text transition-all duration-200"
          style={{
            height: '42px',
            background: '#141B28',
            border: searchOpen 
              ? '1px solid rgba(0,229,160,0.25)' 
              : '1px solid rgba(255,255,255,0.12)',
            boxShadow: searchOpen ? '0 0 14px rgba(0,229,160,0.22)' : 'none',
          }}
          onClick={() => {
            setSearchOpen(true);
            document.getElementById('aeo-input')?.focus();
          }}
        >
          <Search size={16} strokeWidth={2.2} style={{ color: '#00E5A0', flexShrink: 0 }} />
          <input
            id="aeo-input"
            type="text"
            placeholder="Ask TradeMatch AI or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 bg-transparent border-none outline-none text-[13.5px] min-w-0"
            style={{ 
              color: '#F0F4FF',
              fontFamily: 'var(--font-dm-sans)',
            }}
          />
          <kbd
            className="flex-shrink-0 font-mono text-[10px] px-[6px] py-[2px] rounded-[5px]"
            style={{
              color: '#4A5568',
              background: '#080C12',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (
          <div
            className="absolute top-[calc(100%+6px)] left-[calc(268px+32px+16px+36px+16px)] right-auto z-[500] overflow-hidden"
            style={{
              width: '520px',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center gap-[8px] px-[16px] py-[12px] pb-[8px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div 
                style={{ 
                  width: '14px', 
                  height: '1px', 
                  background: '#00E5A0',
                  opacity: 0.5,
                }} 
              />
              <span 
                className="font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: '#00E5A0', opacity: 0.8 }}
              >
                AI Suggested Vendors
              </span>
            </div>

            {/* Results */}
            {MOCK_SEARCH_RESULTS.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center gap-[14px] px-[16px] py-[12px] cursor-pointer transition-colors duration-150"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Vendor Avatar */}
                <div
                  className="flex items-center justify-center rounded-[10px] font-sora text-[14px] font-extrabold flex-shrink-0"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
                    color: '#fff',
                  }}
                >
                  {vendor.initials}
                </div>

                {/* Vendor Info */}
                <div className="flex-1">
                  <div className="font-sora text-[14px] font-bold" style={{ color: '#F0F4FF' }}>
                    {vendor.name}
                  </div>
                  <div className="text-[12px] mt-[2px]" style={{ color: '#8B95AA' }}>
                    {vendor.trade}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <div 
                    className="font-sora text-[16px] font-black tracking-[-0.04em]"
                    style={{ color: '#00E5A0' }}
                  >
                    {vendor.score}
                  </div>
                  <div 
                    className="font-mono text-[9px] uppercase tracking-[0.1em]"
                    style={{ color: '#4A5568' }}
                  >
                    Trust Score
                  </div>
                </div>
              </div>
            ))}

            {/* AI Badge */}
            <div className="flex items-center justify-center py-[8px]">
              <div 
                className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full font-mono text-[9px] uppercase tracking-[0.08em]"
                style={{
                  background: 'rgba(0,229,160,0.1)',
                  border: '1px solid rgba(0,229,160,0.2)',
                  color: '#00E5A0',
                }}
              >
                <div 
                  className="w-[5px] h-[5px] rounded-full animate-pulse"
                  style={{ background: '#00E5A0' }}
                />
                AI Powered
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-[10px] ml-auto">
        {/* Escrow Balance Pill */}
        <div
          className="flex items-center gap-[10px] px-[14px] py-[7px] rounded-[10px] cursor-pointer transition-all duration-200"
          style={{
            background: 'rgba(66,165,245,0.1)',
            border: '1px solid rgba(66,165,245,0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(66,165,245,0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(66,165,245,0.1)';
          }}
        >
          <span style={{ fontSize: '15px' }}>💰</span>
          <div>
            <div 
              className="font-mono text-[9px] uppercase tracking-[0.1em]"
              style={{ color: '#42A5F5', opacity: 0.8 }}
            >
              In Escrow
            </div>
            <div 
              className="font-sora text-[14px] font-extrabold tracking-[-0.03em]"
              style={{ color: '#42A5F5' }}
            >
              {escrowAmount}
            </div>
          </div>
        </div>

        {/* Notifications Pill */}
        <div
          className="relative flex items-center gap-[8px] px-[12px] py-[8px] rounded-[10px] cursor-pointer transition-all duration-200"
          style={{
            background: '#141B28',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
            e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#141B28';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <div className="relative">
            <Bell size={17} strokeWidth={1.8} style={{ color: '#8B95AA' }} />
            <div
              className="absolute -top-[5px] -right-[6px] flex items-center justify-center font-mono text-[9px] font-bold"
              style={{
                minWidth: '16px',
                height: '16px',
                borderRadius: '100px',
                background: '#FF4757',
                color: '#fff',
                border: '2px solid #0E1420',
              }}
            >
              3
            </div>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: '#8B95AA' }}>
            Alerts
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative flex items-center rounded-full transition-all duration-300"
          style={{
            width: '52px',
            height: '28px',
            background: theme === 'dark' ? '#1e293b' : '#e0f2fe',
            border: theme === 'dark' 
              ? '1px solid rgba(255,255,255,0.12)' 
              : '1px solid #bae6fd',
            padding: '0 4px',
          }}
        >
          {/* Toggle Knob */}
          <div
            className="absolute flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              width: '20px',
              height: '20px',
              left: theme === 'dark' ? '4px' : '26px',
              background: theme === 'dark' ? '#334155' : '#f59e0b',
              boxShadow: theme === 'dark' 
                ? '0 2px 8px rgba(0,0,0,0.3)' 
                : '0 0 10px rgba(245,158,11,0.5)',
            }}
          >
            {theme === 'dark' ? (
              <Moon size={11} strokeWidth={2.5} color="#fff" />
            ) : (
              <Sun size={11} strokeWidth={2.5} color="#fff" />
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
