'use client';

import { useState } from 'react';
import {
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  FileText,
  Upload,
  Play,
  User,
  Star,
  Shield,
  Zap,
  MoreHorizontal,
  Send,
  Bot,
} from 'lucide-react';

interface UserDashboardProps {
  tenantId?: string;
}

// Mock data for active job
const ACTIVE_JOB = {
  id: 'TM-4821',
  title: 'Kitchen Renovation',
  trade: 'Plumbing & Heating',
  vendor: 'Elite Plumbers Ltd',
  vendorInitials: 'EP',
  status: 'in_progress',
  progress: 65,
  startDate: '2024-03-01',
  eta: '2 days',
  amount: 4250,
  escrowStatus: 'funded',
};

// Mock milestones
const MILESTONES = [
  { id: 1, name: 'Site Survey', status: 'completed', amount: 0, completedAt: '2024-03-01' },
  { id: 2, name: 'Materials Delivery', status: 'completed', amount: 1200, completedAt: '2024-03-03' },
  { id: 3, name: 'Plumbing Installation', status: 'in_progress', amount: 1800, dueDate: '2024-03-08' },
  { id: 4, name: 'Final Inspection', status: 'pending', amount: 1250, dueDate: '2024-03-10' },
];

// Mock documents
const DOCUMENTS = [
  { id: 1, name: 'Quote #4821', type: 'quote', status: 'ready', date: '2024-02-28' },
  { id: 2, name: 'Escrow Agreement', type: 'contract', status: 'ready', date: '2024-02-28' },
  { id: 3, name: 'Completion Certificate', type: 'certificate', status: 'generating', date: '-' },
];

// Mock vendor profile
const VENDOR_PROFILE = {
  name: 'Elite Plumbers Ltd',
  trade: 'Plumbing & Heating',
  score: 9.8,
  rating: 4.9,
  reviews: 127,
  verified: true,
  dbsChecked: true,
  insured: true,
  memberSince: '2021',
};

// Mock AI copilot messages
const COPILOT_MESSAGES = [
  { id: 1, type: 'ai', text: 'Milestone 3 is due in 2 days. Want me to send a reminder to your vendor?', time: '10m ago' },
  { id: 2, type: 'alert', text: 'Materials have been delivered and signed off.', time: '2h ago' },
];

// Mock notifications
const NOTIFICATIONS = [
  { id: 1, text: 'Vendor has uploaded completion photos', type: 'success', time: '5m ago' },
  { id: 2, text: 'Escrow milestone funded: £1,800', type: 'info', time: '2h ago' },
  { id: 3, text: 'Reminder: Site visit tomorrow at 9am', type: 'warning', time: '4h ago' },
];

export default function UserDashboard({ tenantId }: UserDashboardProps) {
  const [sidebarCollapsed] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const renderStatusChip = (status: string) => {
    const styles: Record<string, { bg: string; border: string; color: string }> = {
      completed: { bg: 'rgba(0,229,160,0.12)', border: 'rgba(0,229,160,0.2)', color: '#00E5A0' },
      in_progress: { bg: 'rgba(255,167,38,0.12)', border: 'rgba(255,167,38,0.2)', color: '#FFA726' },
      pending: { bg: '#141B28', border: 'rgba(255,255,255,0.07)', color: '#4A5568' },
      ready: { bg: 'rgba(0,229,160,0.12)', border: 'rgba(0,229,160,0.2)', color: '#00E5A0' },
      generating: { bg: 'rgba(66,165,245,0.1)', border: 'rgba(66,165,245,0.2)', color: '#42A5F5' },
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <span
        className="font-mono text-[10px] uppercase tracking-[0.08em] px-[10px] py-[3px] rounded-full"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
        }}
      >
        {status.replace('_', ' ')}
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
            My Dashboard
          </div>
          <h1 
            className="font-sora text-[1.9rem] font-extrabold tracking-[-0.04em] leading-[1.1]"
            style={{ color: '#F0F4FF' }}
          >
            My Projects
          </h1>
          <p className="text-[14px] mt-[6px]" style={{ color: '#8B95AA' }}>
            Track your jobs, milestones, and escrow in one place.
          </p>
        </div>
        <div className="flex items-center gap-[10px] flex-shrink-0">
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
            <Briefcase size={15} strokeWidth={2} />
            Post New Job
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div 
        className="grid gap-[20px] items-start"
        style={{ gridTemplateColumns: '1fr 360px' }}
      >
        {/* Left Column */}
        <div className="flex flex-col gap-[20px]">
          
          {/* Active Job Card */}
          <div
            className="rounded-[18px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {/* Card Header */}
            <div 
              className="flex items-center justify-between px-[20px] py-[16px] pb-[14px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div>
                <div 
                  className="font-sora text-[15px] font-extrabold tracking-[-0.03em]"
                  style={{ color: '#F0F4FF' }}
                >
                  {ACTIVE_JOB.title}
                </div>
                <div className="text-[12px] mt-[2px]" style={{ color: '#8B95AA' }}>
                  {ACTIVE_JOB.trade} · #{ACTIVE_JOB.id}
                </div>
              </div>
              <div
                className="flex items-center gap-[6px] px-[12px] py-[4px] rounded-full font-mono text-[10px] uppercase tracking-[0.1em]"
                style={{
                  background: 'rgba(0,229,160,0.12)',
                  border: '1px solid rgba(0,229,160,0.25)',
                  color: '#00E5A0',
                }}
              >
                <div 
                  className="w-[6px] h-[6px] rounded-full animate-pulse"
                  style={{ background: '#00E5A0' }}
                />
                Live
              </div>
            </div>

            {/* GPS Map Area (Placeholder) */}
            <div
              className="relative overflow-hidden flex items-center justify-center"
              style={{
                height: '200px',
                background: '#141B28',
              }}
            >
              {/* Grid Pattern */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,229,160,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,229,160,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '28px 28px',
                }}
              />
              
              {/* Vendor Pin */}
              <div 
                className="absolute flex flex-col items-center gap-[4px]"
                style={{
                  animation: 'vendorMove 4s infinite alternate ease-in-out',
                  right: '80px',
                  top: '60px',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full font-sora text-[11px] font-extrabold relative"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: '#111827',
                    border: '3px solid #00E5A0',
                    color: '#00E5A0',
                    boxShadow: '0 0 20px rgba(0,229,160,0.4)',
                  }}
                >
                  EP
                  <div
                    className="absolute rounded-full border animate-ping"
                    style={{
                      inset: '-8px',
                      border: '1px solid rgba(0,229,160,0.25)',
                    }}
                  />
                </div>
                <div
                  className="font-mono text-[9px] px-[8px] py-[3px] rounded-[6px] whitespace-nowrap"
                  style={{
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#F0F4FF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  On Site
                </div>
              </div>

              {/* ETA Chip */}
              <div
                className="absolute top-[12px] right-[12px] px-[12px] py-[8px] rounded-[8px]"
                style={{
                  background: '#111827',
                  border: '1px solid rgba(0,229,160,0.25)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <div 
                  className="font-mono text-[9px] uppercase tracking-[0.1em]"
                  style={{ color: '#4A5568' }}
                >
                  ETA
                </div>
                <div 
                  className="font-sora text-[16px] font-black tracking-[-0.04em] mt-[1px]"
                  style={{ color: '#00E5A0' }}
                >
                  {ACTIVE_JOB.eta}
                </div>
              </div>
            </div>

            {/* Progress Footer */}
            <div 
              className="flex items-center gap-[12px] px-[20px] py-[14px]"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex-1">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] mb-[6px]" style={{ color: '#4A5568' }}>
                  <span>Progress</span>
                  <span style={{ color: '#00E5A0' }}>{ACTIVE_JOB.progress}%</span>
                </div>
                <div 
                  className="h-[6px] rounded-full overflow-hidden"
                  style={{ background: '#141B28' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-[600ms]"
                    style={{
                      width: `${ACTIVE_JOB.progress}%`,
                      background: 'linear-gradient(90deg, #007a3d, #00E5A0)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-[14px]">
              <h2 
                className="font-sora text-[16px] font-extrabold tracking-[-0.03em]"
                style={{ color: '#F0F4FF' }}
              >
                Milestones
              </h2>
              <span className="text-[12px]" style={{ color: '#8B95AA' }}>
                Escrow Protected
              </span>
            </div>

            <div className="flex flex-col gap-[12px]">
              {MILESTONES.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="rounded-[16px] overflow-hidden"
                  style={{
                    background: '#111827',
                    border: milestone.status === 'in_progress' 
                      ? '1px solid rgba(255,167,38,0.4)' 
                      : '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {/* Milestone Header */}
                  <div 
                    className="flex items-center gap-[12px] px-[16px] py-[14px] pb-[12px]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {/* Step Number */}
                    <div
                      className="flex items-center justify-center rounded-full font-mono text-[11px] font-bold flex-shrink-0"
                      style={{
                        width: '26px',
                        height: '26px',
                        background: milestone.status === 'completed' 
                          ? 'rgba(0,229,160,0.15)' 
                          : milestone.status === 'in_progress'
                          ? 'rgba(255,167,38,0.15)'
                          : '#141B28',
                        color: milestone.status === 'completed' 
                          ? '#00E5A0' 
                          : milestone.status === 'in_progress'
                          ? '#FFA726'
                          : '#4A5568',
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Title */}
                    <div className="flex-1">
                      <div 
                        className="font-sora text-[14px] font-bold"
                        style={{ color: '#F0F4FF' }}
                      >
                        {milestone.name}
                      </div>
                      <div className="text-[12px] mt-[1px]" style={{ color: '#8B95AA' }}>
                        {milestone.status === 'completed' 
                          ? `Completed ${milestone.completedAt}`
                          : `Due ${milestone.dueDate}`
                        }
                      </div>
                    </div>

                    {/* Status */}
                    {renderStatusChip(milestone.status)}
                  </div>

                  {/* Photo Evidence (for in-progress) */}
                  {milestone.status === 'in_progress' && (
                    <div className="grid grid-cols-3 gap-[8px] p-[12px] px-[16px]">
                      {[1, 2, 3].map((photoIndex) => (
                        <div
                          key={photoIndex}
                          className="aspect-square rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-[180ms] relative overflow-hidden"
                          style={{
                            background: '#141B28',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                            e.currentTarget.style.transform = 'none';
                          }}
                          onClick={() => setSelectedPhoto(photoIndex)}
                        >
                          <div className="text-[22px]">📷</div>
                          <div
                            className="absolute bottom-[4px] left-[4px] right-[4px] font-mono text-[8px] uppercase tracking-[0.1em] text-center rounded-[4px] py-[2px]"
                            style={{
                              background: 'rgba(0,0,0,0.5)',
                              color: 'rgba(255,255,255,0.7)',
                            }}
                          >
                            Photo {photoIndex}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {milestone.status === 'in_progress' && (
                    <div 
                      className="flex gap-[8px] p-[12px] px-[16px]"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <button
                        className="flex-1 flex items-center justify-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[18px] py-[9px] text-white transition-all duration-[220ms]"
                        style={{
                          background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
                          boxShadow: '0 0 14px rgba(0,229,160,0.22)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,160,0.22)';
                        }}
                      >
                        <CheckCircle size={15} strokeWidth={2} />
                        Approve & Release
                      </button>
                      <button
                        className="flex items-center justify-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[14px] py-[9px] transition-all duration-[220ms]"
                        style={{
                          background: '#141B28',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#8B95AA',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                          e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
                          e.currentTarget.style.color = '#00E5A0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#141B28';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.currentTarget.style.color = '#8B95AA';
                        }}
                      >
                        <AlertCircle size={15} strokeWidth={2} />
                        Dispute
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Document Vault */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div 
              className="flex items-center justify-between px-[16px] py-[14px] pb-[12px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[16px] font-extrabold tracking-[-0.03em]"
                style={{ color: '#F0F4FF' }}
              >
                Document Vault
              </h2>
              <ChevronRight size={16} strokeWidth={2} style={{ color: '#4A5568' }} />
            </div>

            <div className="flex flex-col">
              {DOCUMENTS.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-[12px] px-[12px] py-[10px] mx-[12px] my-[3px] rounded-[10px] cursor-pointer transition-all duration-[180ms]"
                  style={{
                    background: '#141B28',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
                    e.currentTarget.style.background = 'rgba(0,229,160,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = '#141B28';
                  }}
                >
                  <div className="text-[20px] flex-shrink-0">📄</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: '#F0F4FF' }}>
                      {doc.name}
                    </div>
                    <div className="text-[11px] mt-[1px]" style={{ color: '#8B95AA' }}>
                      {doc.type} · {doc.date}
                    </div>
                  </div>
                  {renderStatusChip(doc.status)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[20px]">
          
          {/* Vendor Profile Card */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {/* Header */}
            <div 
              className="px-[16px] py-[20px] text-center"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'linear-gradient(135deg, rgba(0,229,160,0.04), rgba(66,165,245,0.03))',
              }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center rounded-full font-sora text-[20px] font-black mx-auto mb-[12px]"
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
                  color: '#fff',
                  border: '3px solid rgba(0,229,160,0.3)',
                  boxShadow: '0 0 20px rgba(0,229,160,0.2)',
                }}
              >
                {VENDOR_PROFILE.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              <div 
                className="font-sora text-[16px] font-extrabold tracking-[-0.03em]"
                style={{ color: '#F0F4FF' }}
              >
                {VENDOR_PROFILE.name}
              </div>
              <div className="text-[13px] mt-[3px]" style={{ color: '#8B95AA' }}>
                {VENDOR_PROFILE.trade}
              </div>

              {/* Score */}
              <div className="flex items-center justify-center gap-[6px] mt-[10px]">
                <div 
                  className="font-sora text-[22px] font-black tracking-[-0.04em]"
                  style={{ color: '#00E5A0' }}
                >
                  {VENDOR_PROFILE.score}
                </div>
                <div className="text-[13px]" style={{ color: '#FFA726' }}>
                  {'★'.repeat(Math.floor(VENDOR_PROFILE.rating))}
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex justify-center gap-[6px] mt-[10px] flex-wrap">
                {VENDOR_PROFILE.verified && (
                  <div
                    className="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] font-mono text-[9px]"
                    style={{
                      background: 'rgba(0,229,160,0.08)',
                      border: '1px solid rgba(0,229,160,0.25)',
                      color: '#00E5A0',
                    }}
                  >
                    <div className="w-[5px] h-[5px] rounded-full" style={{ background: '#00E5A0' }} />
                    Verified
                  </div>
                )}
                {VENDOR_PROFILE.dbsChecked && (
                  <div
                    className="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] font-mono text-[9px]"
                    style={{
                      background: '#141B28',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#8B95AA',
                    }}
                  >
                    <Shield size={9} strokeWidth={2} />
                    DBS Checked
                  </div>
                )}
              </div>
            </div>

            {/* Credentials */}
            <div 
              className="flex flex-col gap-[8px] px-[16px] py-[14px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              {[
                { icon: Shield, label: 'Insurance', value: 'Valid', color: '#00E5A0' },
                { icon: Award, label: 'Member Since', value: VENDOR_PROFILE.memberSince, color: '#8B95AA' },
                { icon: Star, label: 'Reviews', value: `${VENDOR_PROFILE.reviews} reviews`, color: '#8B95AA' },
              ].map((cred, index) => (
                <div key={index} className="flex items-center gap-[10px]">
                  <div
                    className="flex items-center justify-center rounded-[7px]"
                    style={{
                      width: '28px',
                      height: '28px',
                      background: 'rgba(0,229,160,0.1)',
                    }}
                  >
                    <cred.icon size={14} strokeWidth={2} style={{ color: '#00E5A0' }} />
                  </div>
                  <div className="text-[12px] font-semibold flex-1" style={{ color: '#F0F4FF' }}>
                    {cred.label}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: cred.color }}>
                    {cred.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-[8px] p-[12px] px-[16px]">
              <button
                className="flex items-center justify-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[18px] py-[9px] text-white transition-all duration-[220ms] whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #007a3d, #00E5A0)',
                  boxShadow: '0 0 14px rgba(0,229,160,0.22)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,160,0.22)';
                }}
              >
                <MessageSquare size={15} strokeWidth={2} />
                Message Vendor
              </button>
              <button
                className="flex items-center justify-center gap-[7px] font-sora text-[13px] font-bold tracking-[-0.02em] rounded-[10px] px-[18px] py-[9px] transition-all duration-[220ms] whitespace-nowrap"
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
                <User size={15} strokeWidth={2} />
                View Profile
              </button>
            </div>
          </div>

          {/* AI Copilot Card */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center gap-[10px] px-[16px] py-[14px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center justify-center rounded-[9px] flex-shrink-0"
                style={{
                  width: '34px',
                  height: '34px',
                  background: 'linear-gradient(135deg, #7C3AED, #42A5F5)',
                }}
              >
                <Bot size={16} color="#fff" />
              </div>
              <div>
                <div 
                  className="font-sora text-[14px] font-bold"
                  style={{ color: '#F0F4FF' }}
                >
                  TradeMatch AI
                </div>
                <div className="text-[11px]" style={{ color: '#8B95AA' }}>
                  Your project assistant
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex flex-col gap-[10px] px-[16px] py-[12px] max-h-[200px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              {COPILOT_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className="px-[12px] py-[10px] rounded-[10px] text-[13px] leading-[1.5]"
                  style={{
                    background: msg.type === 'ai' 
                      ? 'rgba(124,58,237,0.08)' 
                      : 'rgba(255,167,38,0.08)',
                    border: msg.type === 'ai'
                      ? '1px solid rgba(124,58,237,0.15)'
                      : '1px solid rgba(255,167,38,0.2)',
                    color: msg.type === 'ai' ? '#F0F4FF' : '#FFA726',
                    alignSelf: 'flex-start',
                  }}
                >
                  {msg.text}
                  <div 
                    className="font-mono text-[9px] mt-[4px]"
                    style={{ color: '#4A5568' }}
                  >
                    {msg.time}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div 
              className="flex gap-[8px] px-[16px] py-[12px]"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <input
                type="text"
                placeholder="Ask about your project..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[13px] rounded-[8px] px-[12px] py-[9px]"
                style={{
                  background: '#141B28',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F0F4FF',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              />
              <button
                className="flex items-center justify-center rounded-[8px] transition-all duration-200 flex-shrink-0"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #7C3AED, #42A5F5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Send size={15} strokeWidth={2.5} color="#fff" />
              </button>
            </div>
          </div>

          {/* Notifications Card */}
          <div
            className="rounded-[16px] overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div 
              className="flex items-center justify-between px-[16px] py-[14px]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 
                className="font-sora text-[16px] font-extrabold tracking-[-0.03em]"
                style={{ color: '#F0F4FF' }}
              >
                Notifications
              </h2>
              <span 
                className="font-mono text-[10px] px-[7px] py-[2px] rounded-full"
                style={{
                  background: '#00E5A0',
                  color: '#000',
                }}
              >
                {NOTIFICATIONS.length}
              </span>
            </div>

            <div className="flex flex-col p-[8px]">
              {NOTIFICATIONS.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-[10px] px-[10px] py-[10px] rounded-[10px] cursor-pointer transition-colors duration-150"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#141B28';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[5px]"
                    style={{
                      background: notif.type === 'success' ? '#00E5A0' : 
                                 notif.type === 'warning' ? '#FFA726' : '#42A5F5',
                      boxShadow: notif.type === 'success' 
                        ? '0 0 8px rgba(0,229,160,0.5)' 
                        : notif.type === 'warning'
                        ? '0 0 8px rgba(255,167,38,0.5)'
                        : '0 0 8px rgba(66,165,245,0.5)',
                      animation: notif.type === 'warning' ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-[12.5px] leading-[1.4]" style={{ color: '#F0F4FF' }}>
                      {notif.text}
                    </div>
                    <div 
                      className="font-mono text-[9px] mt-[3px] uppercase tracking-[0.08em]"
                      style={{ color: '#4A5568' }}
                    >
                      {notif.time}
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
