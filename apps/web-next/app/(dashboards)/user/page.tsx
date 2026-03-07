'use client';

import { MetricCard } from '@/components/native/ui/card';
import { Button } from '@/components/native/ui/button';
import { Badge } from '@/components/native/ui/badge';
import { StatusBadge } from '@/components/native/ui/badge';
import { 
  Briefcase,
  FileText,
  MessageSquare,
  Star,
} from 'lucide-react';

/**
 * User/Customer Dashboard
 * 
 * Visual parity with: customer-dashboard.html
 */

const metrics = [
  { label: 'Active Jobs', value: '3', delta: '+1 this week', variant: 'neon' as const },
  { label: 'Quotes Received', value: '5', delta: '+2 today', variant: 'neon' as const },
  { label: 'Unread Messages', value: '2', delta: 'Needs response', variant: 'amber' as const },
  { label: 'Pending Reviews', value: '1', delta: 'Due this week', variant: 'blue' as const },
];

const recentActivity = [
  { event: 'Kitchen quote received', status: 'New', time: '2h ago', type: 'quote' },
  { event: 'Message from Green Gardens Ltd', status: 'Unread', time: '5h ago', type: 'message' },
  { event: 'Electrical job completed', status: 'Review due', time: '1d ago', type: 'job' },
];

const savedTrades = [
  { name: 'Elite Builders', rating: '4.9 ★', saved: '2w ago' },
  { name: 'Quick Fix Plumbing', rating: '4.7 ★', saved: '9d ago' },
  { name: 'PowerPro Electricians', rating: '4.8 ★', saved: '3d ago' },
];

export default function UserDashboard() {
  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="section-title">
        Dashboard
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
        {/* Left Column - Recent Activity */}
        <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Recent Activity</h3>
              <p className="text-[9.5px] text-t4 mt-0.5">Your latest events and updates</p>
            </div>
            <Button variant="panel" size="panel">View All</Button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((activity, i) => (
              <div 
                key={i} 
                className="flex items-start gap-3 p-4 hover:bg-white/[0.015] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-bg-4 flex items-center justify-center flex-shrink-0">
                  {activity.type === 'quote' && <FileText className="w-4 h-4 text-t3" />}
                  {activity.type === 'message' && <MessageSquare className="w-4 h-4 text-t3" />}
                  {activity.type === 'job' && <Briefcase className="w-4 h-4 text-t3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11.5px] font-semibold text-t1">{activity.event}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={activity.status.toLowerCase() as any} />
                  </div>
                </div>
                <span className="font-mono text-[10.5px] text-t4 flex-shrink-0">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Saved Trades */}
          <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Saved Tradespeople</h3>
              <Badge variant="grey" size="sm">12</Badge>
            </div>
            <div className="divide-y divide-border">
              {savedTrades.map((trade, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.015]">
                  <div>
                    <h4 className="text-[11.5px] font-semibold text-t1">{trade.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-gold fill-gold" />
                      <span className="text-[10.5px] text-t3">{trade.rating}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[9.5px] text-t4">{trade.saved}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Button variant="neon" size="sm" className="w-full">
                View All Saved
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-syne text-[11.5px] font-bold text-t1">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <Button variant="primary" className="w-full justify-start">
                <Briefcase className="w-4 h-4 mr-2" />
                Post a Job
              </Button>
              <Button variant="neon" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Compare Quotes
              </Button>
              <Button variant="default" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
