import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';
import { formatINR, formatPercentage } from '../../utils/formatters';

export const AnalyticsView: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | 'YTD'>('30D');

  const channelPerformance = [
    {
      channel: 'Direct Payment API Retries',
      volume: 148,
      recoveredAmount: 48200,
      successRate: 74.2,
      avgTime: '18 mins',
      costPerRecovery: '₹0.00',
    },
    {
      channel: 'Recurring Subscription Resubmissions',
      volume: 54,
      recoveredAmount: 18400,
      successRate: 88.5,
      avgTime: '3.8 hours',
      costPerRecovery: '₹0.00',
    },
    {
      channel: '1-Click Checkout WhatsApp Reminders',
      volume: 89,
      recoveredAmount: 14600,
      successRate: 41.8,
      avgTime: '1.2 hours',
      costPerRecovery: '₹0.45',
    },
    {
      channel: 'Receivables Dunning & Invoices',
      volume: 36,
      recoveredAmount: 11200,
      successRate: 51.4,
      avgTime: '36 hours',
      costPerRecovery: '₹0.10',
    },
  ];

  const timeDistribution = [
    { label: '< 15 mins (Immediate)', percentage: 42, count: 138, color: '#3B82F6' },
    { label: '15 mins – 4 hours', percentage: 31, count: 102, color: '#60A5FA' },
    { label: '4 – 24 hours (Next clearing)', percentage: 19, count: 62, color: '#818CF8' },
    { label: '> 24 hours (Multi-day dunning)', percentage: 8, count: 25, color: '#A5B4FC' },
  ];

  return (
    <div className="space-y-6 pb-12 text-slate-300">
      {/* Top Header */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Recovery Performance & Economics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quantitative analysis of automated dunning yields and merchant ROI
          </p>
        </div>

        <div className="inline-flex rounded-md border border-[#1e293b] bg-[#0f172a] p-0.5">
          {(['30D', '90D', 'YTD'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                timeRange === r
                  ? 'bg-[#1e293b] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Financial ROI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">Gross Recovered (30D)</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            ₹72,400
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+39.2% of at-risk cashflow captured</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">Average Time-to-Resolution</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            4h 18m
          </div>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            18% faster than manual collections
          </div>
        </div>

        <div className="bg-[#0b0f19] p-5 rounded-lg border border-[#1e293b]">
          <span className="text-xs font-medium text-slate-400">Policy Adherence Rate</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            100.0%
          </div>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            0 unpermitted or out-of-policy retries
          </div>
        </div>
      </div>

      {/* Channel Efficiency Table */}
      <div className="bg-[#0b0f19] rounded-lg border border-[#1e293b] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Recovery Channel Efficiency Breakdown
          </h3>
          <span className="text-[11px] font-mono text-slate-400 bg-[#0f172a] px-2 py-0.5 rounded border border-[#1e293b]">
            Active Conduits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1e293b] bg-[#0f172a] text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-5 text-slate-300 font-medium">Channel</th>
                <th className="py-3 px-5 text-right font-medium">Attempted Vol</th>
                <th className="py-3 px-5 text-right font-medium">Recovered Amount</th>
                <th className="py-3 px-5 text-right font-medium">Success Rate</th>
                <th className="py-3 px-5 text-right font-medium">Avg Time</th>
                <th className="py-3 px-5 text-right font-medium">Channel Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {channelPerformance.map((ch, idx) => (
                <tr key={idx} className="hover:bg-[#131b2e] transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-white">
                    {ch.channel}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-300">
                    {ch.volume}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                    {formatINR(ch.recoveredAmount)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-blue-400">
                    {formatPercentage(ch.successRate)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-400">
                    {ch.avgTime}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-500">
                    {ch.costPerRecovery}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time to Recovery Breakdown */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white tracking-tight mb-1">
          Time-to-Recovery Latency Distribution
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Percentage of recovered revenue relative to elapsed time after initial Razorpay failure event.
        </p>

        <div className="space-y-3">
          {timeDistribution.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">{item.label}</span>
                <span className="font-mono text-slate-400">
                  {item.percentage}% ({item.count} cases)
                </span>
              </div>
              <div className="w-full bg-[#0f172a] h-2 rounded-full overflow-hidden border border-[#1e293b]">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
