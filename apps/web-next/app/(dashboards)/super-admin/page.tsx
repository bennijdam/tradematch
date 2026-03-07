'use client';

import { MetricCard } from '@/components/native/ui/card';
import { Badge, StatusBadge } from '@/components/native/ui/badge';
import { Button } from '@/components/native/ui/button';
import { 
  Users, 
  Store, 
  DollarSign, 
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

/**
 * Super Admin Dashboard
 * Command Centre Overview
 * 
 * Visual parity with: super-admin-dashboard.html
 */

const metrics = [
  { label: 'Total Users', value: '12,847', delta: '+234 this week', variant: 'default' as const },
  { label: 'Active Vendors', value: '3,421', delta: '+89 this week', variant: 'neon' as const },
  { label: 'Platform Revenue', value: '£847K', delta: '+12% vs last month', variant: 'neon' as const },
  { label: 'Open Disputes', value: '8', delta: '3 urgent', variant: 'danger' as const },
  { label: 'Avg Response', value: '42m', delta: '-8% vs last week', variant: 'blue' as const },
  { label: 'Uptime', value: '99.98%', delta: 'All systems operational', variant: 'neon' as const },
];

const recentActivity = [
  { event: 'New vendor registration', status: 'Pending', time: '2m ago', type: 'vendor' },
  { event: 'Dispute escalated', status: 'Urgent', time: '12m ago', type: 'dispute' },
  { event: 'Payment processed', status: 'Completed', time: '1h ago', type: 'payment' },
  { event: 'User reported issue', status: 'Open', time: '2h ago', type: 'support' },
];

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="section-title">
        System Overview
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-metrics-6 gap-2">
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
              <p className="text-[9.5px] text-t4 mt-0.5">Platform events and alerts</p>
            </div>
            <Button variant="panel" size="panel">View All</Button>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="font-mono text-[7.5px] uppercase tracking-wider text-t4 text-left pb-2">Event</th>
                  <th className="font-mono text-[7.5px] uppercase tracking-wider text-t4 text-left pb-2">Status</th>
                  <th className="font-mono text-[7.5px] uppercase tracking-wider text-t4 text-right pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0 hover:bg-white/[0.015]">
                    <td className="py-3 text-[11.5px] text-t2">{activity.event}</td>
                    <td className="py-3">
                      <StatusBadge status={activity.status.toLowerCase() as any} />
                    </td>
                    <td className="py-3 text-right font-mono text-[10.5px] text-t3">{activity.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="bg-bg-2 border border-border rounded-[11px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-syne text-[11.5px] font-bold text-t1">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            <Button variant="primary" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="neon" className="w-full justify-start">
              <Store className="w-4 h-4 mr-2" />
              Vendor Approvals
            </Button>
            <Button variant="danger" className="w-full justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Review Disputes
            </Button>
            <Button variant="default" className="w-full justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              Financial Reports
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
