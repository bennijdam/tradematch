'use client';

import { MetricCard } from '@/components/native/ui/card';
import { Button } from '@/components/native/ui/button';
import { Badge } from '@/components/native/ui/badge';
import { 
  Target,
  FileText,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

/**
 * Vendor Dashboard
 * 
 * Visual parity with: vendor-dashboard.html
 */

const metrics = [
  { label: 'Quotes Viewed', value: '42', delta: '+12% vs last week', variant: 'default' as const },
  { label: 'Bids Submitted', value: '18', delta: '+6% vs last week', variant: 'neon' as const },
  { label: 'Jobs Won', value: '7', delta: 'Strong performance', variant: 'neon' as const },
  { label: 'Win Rate', value: '39%', delta: 'Industry avg 25%', variant: 'blue' as const },
];

const leadQueue = [
  { title: 'Emergency Boiler Repair', location: 'Westminster SW1', time: '2h ago', urgent: true },
  { title: 'Blocked Drain', location: 'Camden NW1', time: '3h ago', urgent: false },
  { title: 'Fuse Box Check', location: 'Hackney E8', time: '5h ago', urgent: false },
];

const revenueData = [
  { month: 'Dec', amount: '£8,240', trend: 'up' },
  { month: 'Jan', amount: '£9,120', trend: 'up' },
  { month: 'Feb', amount: '£10,450', trend: 'up' },
];

export default function VendorDashboard() {
  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="section-title">
        Vendor Analytics
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-metrics-4 gap-2">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            variant={metric.variant}
          />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid-dashboard">
        {/* Left Column - Lead Queue */}
        <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Lead Queue</h3>
              <p className="text-[9.5px] text-t4 mt-0.5">Fresh inbound jobs to review</p>
            </div>
            <Badge variant="neon" dot dotColor="neon">
              12 New
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {leadQueue.map((lead, i) => (
              <div 
                key={i} 
                className="flex items-start gap-3 p-4 hover:bg-white/[0.015] transition-colors"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  lead.urgent ? 'bg-danger-dim text-danger' : 'bg-bg-4 text-t3'
                )}>
                  <Target className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[11.5px] font-semibold text-t1 truncate">{lead.title}</h4>
                    {lead.urgent && (
                      <Badge variant="danger" size="sm">URGENT</Badge>
                    )}
                  </div>
                  <p className="text-[10.5px] text-t3 mt-0.5">{lead.location}</p>
                </div>
                <span className="font-mono text-[10.5px] text-t4 flex-shrink-0">{lead.time}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Button variant="primary" className="w-full">
              View All Leads
            </Button>
          </div>
        </div>

        {/* Right Column - Side Panel */}
        <div className="space-y-3">
          {/* Revenue Trend */}
          <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Revenue Trend</h3>
            </div>
            <div className="divide-y divide-border">
              {revenueData.map((data, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[11.5px] text-t2">{data.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-syne text-[13px] font-bold text-t1">{data.amount}</span>
                    <TrendingUp className="w-4 h-4 text-neon" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Win Rate */}
          <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Service Win Rate</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { service: 'Plumbing', rate: '44%' },
                { service: 'Electrical', rate: '36%' },
                { service: 'Landscaping', rate: '31%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11.5px] text-t2">{item.service}</span>
                  <Badge variant="neon">{item.rate}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import cn utility
import { cn } from '@/lib/utils';
