'use client';

import { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  MapPin,
  Award,
  MessageSquare,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Star,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Wallet,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// Mock stats data
const STATS = [
  {
    id: 1,
    label: 'Active Jobs',
    value: '5',
    sub: '2 pending milestones',
    icon: Briefcase,
    trend: 'up',
    trendValue: '+12%',
    color: 'neon',
  },
  {
    id: 2,
    label: 'New Leads',
    value: '12',
    sub: '3 expiring today',
    icon: Zap,
    trend: 'up',
    trendValue: '+5',
    color: 'amber',
    pulse: true,
  },
  {
    id: 3,
    label: 'Escrow Balance',
    value: '£8,450',
    sub: 'Available to withdraw',
    icon: Wallet,
    trend: 'up',
    trendValue: '+£2,100',
    color: 'blue',
  },
  {
    id: 4,
    label: 'Reliability Score',
    value: '94.2%',
    sub: 'Elite tier maintained',
    icon: Award,
    trend: 'up',
    trendValue: '+1.2%',
    color: 'purple',
  },
];

// Mock recent jobs
const RECENT_JOBS = [
  {
    id: 'TM-4821',
    title: 'Kitchen Renovation',
    category: 'Plumbing',
    status: 'in_progress',
    amount: '£4,250',
    date: 'Today',
    verified: true,
  },
  {
    id: 'TM-4819',
    title: 'Bathroom Suite Install',
    category: 'Bathroom',
    status: 'quoted',
    amount: '£3,800',
    date: 'Yesterday',
    verified: true,
  },
  {
    id: 'TM-4815',
    title: 'Central Heating Repair',
    category: 'Heating',
    status: 'open',
    amount: '£1,200',
    date: '2 days ago',
    verified: false,
  },
  {
    id: 'TM-4812',
    title: 'Leak Detection',
    category: 'Emergency',
    status: 'completed',
    amount: '£450',
    date: '3 days ago',
    verified: true,
  },
];

// Mock activity feed
const ACTIVITY_FEED = [
  { id: 1, text: 'New lead received from Sarah Johnson', type: 'success', time: '2m ago' },
  { id: 2, text: 'Milestone approved: £1,800 released', type: 'info', time: '15m ago' },
  { id: 3, text: 'Quote accepted: Kitchen Renovation', type: 'success', time: '1h ago' },
  { id: 4, text: 'Reminder: Complete site survey', type: 'warning', time: '2h ago' },
  { id: 5, text: 'New review: 5 stars from Mike P.', type: 'success', time: '3h ago' },
];

// Mock quick actions
const QUICK_ACTIONS = [
  { id: 1, icon: Briefcase, label: 'Find Jobs', sub: 'Browse new leads' },
  { id: 2, icon: Zap, label: 'Quick Quote', sub: 'Send instant quote' },
  { id: 3, icon: MessageSquare, label: 'Messages', sub: '3 unread' },
  { id: 4, icon: Wallet, label: 'Withdraw', sub: 'Balance: £8,450' },
];

// Mock weekly chart data
const WEEKLY_DATA = [
  { day: 'Mon', value: 65 },
  { day: 'Tue', value: 85 },
  { day: 'Wed', value: 45 },
  { day: 'Thu', value: 90 },
  { day: 'Fri', value: 75 },
  { day: 'Sat', value: 55 },
  { day: 'Sun', value: 40 },
];

export default function VendorDashboard() {
  const [filterTab, setFilterTab] = useState('week');

  const renderStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; border: string; color: string }> = {
      in_progress: { bg: 'rgba(0,229,160,0.1)', border: 'rgba(0,229,160,0.25)', color: '#00E5A0' },
      quoted: { bg: 'rgba(66,165,245,0.1)', border: 'rgba(66,165,245,0.25)', color: '#42A5F5' },
      open: { bg: 'rgba(156,95,233,0.1)', border: 'rgba(156,95,233,0.25)', color: '#9C5FE9' },
      completed: { bg: 'rgba(0,229,160,0.1)', border: 'rgba(0,229,160,0.25)', color: '#00E5A0' },
    };
    
    const style = styles[status] || styles.open;
    const label = status.replace('_', ' ').toUpperCase();
    
    return (
      <span
        className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full font-mono text-[10px] font-medium uppercase tracking-[0.06em]"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-[28px] gap-[20px]">
        <div className="flex-1">
          <div 
            className="flex items-center gap-[8px] font-mono text-[10px] uppercase tracking-[0.2em] mb-[6px]"
            style={{ color: '#00E5A0', opacity: 0.8 }}
          >
            <div style={{ width: '18px', height: '1px', background: '#00E5A0', opacity: 0.5 }} />
            Welcome Back
          </div>
          <h1 
            className="font-sora text-[1.9rem] font-extrabold tracking-[-0.04em] leading-[1.1]"
            style={{ color: '#F0F4FF' }}
          >
            Vendor Dashboard
          </h1>
          <p className="text-[14px] mt-[6px]" style={{ color: '#8B95AA' }}>
            Manage your jobs, leads, and payments in one place.
          </p>
        </div>
        <div className="flex items-center gap-[10px] flex-shrink-0">
          <button
            className="flex items-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[18px] py-[9px] transition-all duration-[220ms] whitespace-nowrap"
            style={{
              background: '#141B28',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#8B95AA',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
              e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
              e.currentTarget.style.color = '#F0F4FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#141B28';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#8B95AA';
            }}
          >
            <Filter size={15} strokeWidth={2} />
            Filter
          </button>
          <button
            className="flex items-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[18px] py-[9px] text-white transition-all duration-[220ms] whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
              boxShadow: '0 0 14px rgba(0,229,160,0.22)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,160,0.22)';
            }}
          >
            <Plus size={15} strokeWidth={2} />
            New Quote
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div 
        className="grid gap-[20px] mb-[28px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {STATS.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <div
              key={stat.id}
              className="rounded-[16px] p-[22px] relative overflow-hidden cursor-default transition-all duration-[250ms]"
              style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top Gradient Line on Hover */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 transition-opacity duration-[250ms]"
                style={{
                  background: 'linear-gradient(90deg, #00E5A0, #42A5F5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
              />

              <div className="flex justify-between items-start mb-[16px]">
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-[12px]"
                  style={{
                    width: '44px',
                    height: '44px',
                    background: stat.color === 'neon' ? 'rgba(0,229,160,0.1)' :
                               stat.color === 'amber' ? 'rgba(255,167,38,0.1)' :
                               stat.color === 'blue' ? 'rgba(66,165,245,0.1)' :
                               'rgba(156,95,233,0.1)',
                    border: `1px solid ${stat.color === 'neon' ? 'rgba(0,229,160,0.25)' :
                                      stat.color === 'amber' ? 'rgba(255,167,38,0.25)' :
                                      stat.color === 'blue' ? 'rgba(66,165,245,0.25)' :
                                      'rgba(156,95,233,0.25)'}`,
                  }}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={1.8}
                    style={{
                      color: stat.color === 'neon' ? '#00E5A0' :
                             stat.color === 'amber' ? '#FFA726' :
                             stat.color === 'blue' ? '#42A5F5' :
                             '#9C5FE9',
                    }}
                  />
                </div>

                {/* Trend Badge */}
                <div
                  className="flex items-center gap-[3px] px-[8px] py-[3px] rounded-full font-mono text-[10px] font-medium"
                  style={{
                    background: stat.trend === 'up' ? 'rgba(0,229,160,0.1)' : 'rgba(255,71,87,0.1)',
                    border: `1px solid ${stat.trend === 'up' ? 'rgba(0,229,160,0.25)' : 'rgba(255,71,87,0.25)'}`,
                    color: stat.trend === 'up' ? '#00E5A0' : '#FF4757',
                  }}
                >
                  <TrendIcon size={10} strokeWidth={2.5} />
                  {stat.trendValue}
                </div>
              </div>

              {/* Label */}
              <div 
                className="text-[12px] uppercase tracking-[0.08em] font-mono mb-[6px]"
                style={{ color: '#4A5568' }}
              >
                {stat.label}
              </div>

              {/* Value */}
              <div 
                className="font-sora text-[2rem] font-black tracking-[-0.04em] leading-none"
                style={{ color: '#F0F4FF' }}
              >
                {stat.value}
              </div>

              {/* Sub */}
              <div className="text-[12px] mt-[5px]" style={{ color: '#8B95AA' }}>
                {stat.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div 
        className="grid gap-[20px] mb-[20px]"
        style={{ gridTemplateColumns: '2fr 1fr' }}
      >
        {/* Left Column */}
        <div className="flex flex-col gap-[20px]">
          
          {/* Chart Card */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Card Header */}
            <div 
              className="flex items-center justify-between px-[24px] py-[20px] pb-[16px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[15px] font-bold"
                style={{ color: '#F0F4FF' }}
              >
                Weekly Performance
              </h2>
              <div className="flex gap-[4px]">
                {['day', 'week', 'month'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className="px-[12px] py-[5px] rounded-[7px] font-sora text-[12px] font-semibold transition-all duration-[150ms]"
                    style={{
                      background: filterTab === tab ? 'rgba(0,229,160,0.1)' : 'transparent',
                      border: `1px solid ${filterTab === tab ? 'rgba(0,229,160,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      color: filterTab === tab ? '#00E5A0' : '#8B95AA',
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="px-[24px] py-[8px] pb-[20px]">
              <div 
                className="flex items-end gap-[8px] h-[140px] pb-[8px]"
              >
                {WEEKLY_DATA.map((data, index) => (
                  <div
                    key={data.day}
                    className="flex-1 rounded-t-[6px] relative cursor-pointer transition-all duration-200"
                    style={{
                      height: `${data.value}%`,
                      background: 'linear-gradient(to top, #00E5A0, rgba(0,229,160,0.3))',
                      opacity: 0.7,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scaleY(1.02)';
                      e.currentTarget.style.transformOrigin = 'bottom';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.transform = 'none';
                    }}
                  />
                ))}
              </div>
              
              {/* Labels */}
              <div className="flex gap-[8px] px-[24px] pb-[20px]">
                {WEEKLY_DATA.map((data) => (
                  <div
                    key={data.day}
                    className="flex-1 text-center font-mono text-[10px]"
                    style={{ color: '#4A5568' }}
                  >
                    {data.day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Jobs Table */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Card Header */}
            <div 
              className="flex items-center justify-between px-[24px] py-[20px] pb-[16px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[15px] font-bold"
                style={{ color: '#F0F4FF' }}
              >
                Recent Jobs
              </h2>
              <button 
                className="flex items-center gap-[5px] text-[12px] transition-colors duration-150"
                style={{ color: '#8B95AA' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#00E5A0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8B95AA';
                }}
              >
                View All
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Job', 'Status', 'Amount', 'Date'].map((header) => (
                      <th
                        key={header}
                        className="text-left px-[16px] py-[12px] pb-[7px] font-mono text-[10px] uppercase tracking-[0.12em]"
                        style={{ 
                          color: '#4A5568',
                          borderBottom: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_JOBS.map((job, index) => (
                    <tr
                      key={job.id}
                      className="transition-colors duration-150 cursor-pointer"
                      style={{
                        borderBottom: index < RECENT_JOBS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className="px-[16px] py-[14px]">
                        <div className="flex items-center gap-[3px]">
                          <div 
                            className="text-[14px] font-semibold mb-[2px]"
                            style={{ color: '#F0F4FF' }}
                          >
                            {job.title}
                          </div>
                          {job.verified && (
                            <div
                              className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full font-mono text-[9px] font-medium uppercase tracking-[0.06em]"
                              style={{
                                background: 'rgba(66,165,245,0.1)',
                                border: '1px solid rgba(66,165,245,0.25)',
                                color: '#42A5F5',
                              }}
                            >
                              <CheckCircle size={9} strokeWidth={2.5} />
                              Verified
                            </div>
                          )}
                        </div>
                        <div 
                          className="font-mono text-[11px]"
                          style={{ color: '#4A5568' }}
                        >
                          {job.category}
                        </div>
                      </td>
                      <td className="px-[16px] py-[14px]">
                        {renderStatusBadge(job.status)}
                      </td>
                      <td className="px-[16px] py-[14px] text-[13px]" style={{ color: '#8B95AA' }}>
                        {job.amount}
                      </td>
                      <td className="px-[16px] py-[14px] text-[13px]" style={{ color: '#8B95AA' }}>
                        {job.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[20px]">
          
          {/* Quick Actions */}
          <div
            className="rounded-[16px] overflow-hidden p-[16px] px-[20px]"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2 
              className="font-sora text-[15px] font-bold mb-[16px]"
              style={{ color: '#F0F4FF' }}
            >
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-[10px]">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    className="flex flex-col items-start gap-[6px] p-[14px] rounded-[12px] text-left transition-all duration-200 cursor-pointer"
                    style={{
                      background: '#141B28',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#141B28';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    }}
                  >
                    <div className="text-[20px]">
                      <Icon size={20} strokeWidth={2} style={{ color: '#00E5A0' }} />
                    </div>
                    <div className="font-sora text-[12px] font-bold" style={{ color: '#F0F4FF' }}>
                      {action.label}
                    </div>
                    <div className="text-[11px]" style={{ color: '#4A5568' }}>
                      {action.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reliability Score */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Card Header */}
            <div 
              className="flex items-center justify-between px-[24px] py-[20px] pb-[16px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[15px] font-bold"
                style={{ color: '#F0F4FF' }}
              >
                Reliability Score
              </h2>
              <ChevronRight size={16} strokeWidth={2} style={{ color: '#4A5568' }} />
            </div>

            {/* Gauge */}
            <div className="flex items-center justify-center p-[20px] px-[24px] pb-[8px]">
              <div
                className="flex flex-col items-center justify-center rounded-full"
                style={{
                  width: '100px',
                  height: '100px',
                  border: '4px solid #00E5A0',
                  background: 'rgba(0,229,160,0.1)',
                  boxShadow: '0 0 14px rgba(0,229,160,0.22)',
                }}
              >
                <div 
                  className="font-sora text-[1.6rem] font-black tracking-[-0.04em]"
                  style={{ color: '#00E5A0' }}
                >
                  94%
                </div>
                <div 
                  className="font-mono text-[9px]"
                  style={{ color: '#00E5A0', opacity: 0.7 }}
                >
                  Elite Tier
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-col gap-[10px] px-[24px] py-[12px] pb-[20px]">
              {[
                { key: 'Completion Rate', value: '98.5%' },
                { key: 'On-Time Delivery', value: '96.2%' },
                { key: 'Response Time', value: '< 2h' },
                { key: 'Client Rating', value: '4.9/5' },
              ].map((metric) => (
                <div key={metric.key} className="flex justify-between items-center">
                  <div className="text-[12px]" style={{ color: '#8B95AA' }}>
                    {metric.key}
                  </div>
                  <div 
                    className="font-mono text-[12px] font-medium"
                    style={{ color: '#00E5A0' }}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Card Header */}
            <div 
              className="flex items-center justify-between px-[24px] py-[20px] pb-[16px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[15px] font-bold"
                style={{ color: '#F0F4FF' }}
              >
                Recent Activity
              </h2>
              <ChevronRight size={16} strokeWidth={2} style={{ color: '#4A5568' }} />
            </div>

            {/* Activity List */}
            <div className="flex flex-col">
              {ACTIVITY_FEED.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-[12px] px-[20px] py-[12px] transition-colors duration-150 cursor-pointer"
                  style={{
                    borderBottom: index < ACTIVITY_FEED.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Dot */}
                  <div
                    className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[5px]"
                    style={{
                      background: activity.type === 'success' ? '#00E5A0' :
                                 activity.type === 'info' ? '#42A5F5' :
                                 activity.type === 'warning' ? '#FFA726' : '#9C5FE9',
                      boxShadow: activity.type === 'success' ? '0 0 8px rgba(0,229,160,0.5)' :
                                activity.type === 'info' ? '0 0 8px rgba(66,165,245,0.5)' :
                                activity.type === 'warning' ? '0 0 8px rgba(255,167,38,0.5)' :
                                '0 0 8px rgba(156,95,233,0.5)',
                    }}
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div 
                      className="text-[13px] font-medium leading-[1.4]"
                      style={{ color: '#F0F4FF' }}
                    >
                      {activity.text}
                    </div>
                    <div 
                      className="font-mono text-[10px] mt-[2px]"
                      style={{ color: '#4A5568' }}
                    >
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
