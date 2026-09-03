import React from 'react';
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';
import { RevenueChart } from '../charts/RevenueChart';
import { StatusBadge } from '../common/Badge';
import { formatINR, formatPercentage } from '../../utils/formatters';
import { RecoveryCase, CauseBreakdown, DashboardMetrics } from '../../types';
import { ChartDataPoint } from '../../data/mockData';

interface OverviewViewProps {
  cases: RecoveryCase[];
  causes: CauseBreakdown[];
  chartData: ChartDataPoint[];
  activePeriod: '7D' | '30D' | '90D';
  onPeriodChange: (period: '7D' | '30D' | '90D') => void;
  onSelectCase: (caseItem: RecoveryCase) => void;
  onViewAllCases: () => void;
  metrics: DashboardMetrics;
  isLoading?: boolean;
  onSelectCustomer?: (customerName: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  cases,
  causes,
  chartData,
  activePeriod,
  onPeriodChange,
  onSelectCase,
  onViewAllCases,
  metrics,
  isLoading = false,
  onSelectCustomer,
}) => {
  // 3 prominent spotlight cases needing immediate action
  const queueCases = cases.filter((c) => c.status !== 'recovered').slice(0, 3);

  return (
    <div className="space-y-6 pb-12 text-slate-300 max-w-[1440px] mx-auto w-full">
      {/* 1. TOP DUAL HERO PANEL: REVENUE AT RISK CONVERSION + AI RECOVERY QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dominant Revenue Conversion Hero (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e293b] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gross Revenue at Risk
              </span>
              <span className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded font-mono">
                +{metrics.trendVsPrevious}% vs prior {activePeriod}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold font-mono text-white tracking-tight">
                {formatINR(metrics.revenueAtRisk)}
              </span>
              <span className="text-xs text-slate-400">
                across {metrics.affectedTransactionsCount} transactions
              </span>
            </div>

            {/* Visual Conversion Funnel: At Risk -> Recovered */}
            <div className="mt-6 p-4 bg-[#0f172a] rounded-lg border border-[#1e293b]">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2.5">
                <span className="font-semibold text-slate-300">AI CONVERSION FUNNEL</span>
                <span className="text-emerald-400 font-medium">
                  {formatPercentage(metrics.recoveryRate)} Net Salvage Yield
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3">
                {/* Left: Identified At Risk */}
                <div className="sm:col-span-5 p-3.5 bg-[#0b0f19] rounded-md border border-[#1e293b]">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Gross Failed Checkout
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-slate-200">
                      {formatINR(metrics.revenueAtRisk)}
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">
                      Lost: {formatINR(metrics.revenueLost)}
                    </span>
                  </div>
                </div>

                {/* Center Arrow */}
                <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase">
                    AI Recov
                  </span>
                </div>

                {/* Right: Revenue Recovered */}
                <div className="sm:col-span-5 p-3.5 bg-emerald-950/20 rounded-md border border-emerald-500/30">
                  <span className="text-[11px] text-emerald-400 font-medium block">
                    Direct Cashflow Recovered
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-emerald-300">
                      {formatINR(metrics.revenueRecovered)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      {formatPercentage(metrics.recoveryRate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-slate-400">
                  <span className="font-semibold text-emerald-400 font-mono">
                    {formatINR(metrics.revenueRecovered)}
                  </span>{' '}
                  cleared and credited to merchant account
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  Pending active queue:{' '}
                  <span className="text-blue-400 font-semibold">
                    {formatINR(metrics.inProgressVolume)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Status Footer */}
          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Razorpay Settlement Bridge: Connected & Verified
            </span>
            <span className="font-mono text-[11px]">Last sync: Just now</span>
          </div>
        </div>

        {/* AI Recovery Priority Queue Panel (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e293b] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div>
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                  AI Recovery Queue
                </h2>
                <span className="text-xs text-blue-400 font-medium">
                  {metrics.casesRequiringAction} transactions require review or execution
                </span>
              </div>
              <button
                type="button"
                onClick={onViewAllCases}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Prominent Queue Cards */}
            <div className="mt-3.5 space-y-3">
              {queueCases.length === 0 ? (
                <div className="p-8 text-center bg-[#0f172a] rounded-lg border border-[#1e293b]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">All Cases Addressed</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    No urgent recovery actions pending merchant approval.
                  </p>
                </div>
              ) : (
                queueCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="p-3 bg-[#0f172a] border border-[#1e293b] hover:border-blue-500/40 rounded-lg transition-all cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white group-hover:text-blue-400 transition-colors">
                          {formatINR(c.amount)}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          • {c.customerName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-blue-400 font-mono font-medium">
                          {c.aiProbability}% confidence
                        </span>
                        <span className="text-slate-400 truncate">
                          Action: <strong className="text-slate-200 font-medium">{c.recommendedAction}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCase(c);
                      }}
                      className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              Safety rules active: Max retry cap 2
            </span>
            <button
              onClick={onViewAllCases}
              className="text-slate-400 hover:text-slate-200 text-[11px] font-mono hover:underline cursor-pointer"
            >
              Pipeline queue ({cases.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. REVENUE RECOVERY TRAJECTORY & COMPREHENSIVE VISUALIZATION */}
      <RevenueChart
        data={chartData}
        activePeriod={activePeriod}
        onPeriodChange={onPeriodChange}
        metrics={metrics}
        isLoading={isLoading}
      />

      {/* 3. RECOVERY CASES DATA TABLE (PRODUCTION-READY FINTECH TABLE) */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Recent Recovery Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live transaction stream with real-time decline classification, AI confidence, and recovery trigger.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllCases}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer self-start sm:self-auto"
          >
            View all {cases.length} cases →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f172a] text-slate-400 font-mono text-[11px] border-b border-[#1e293b]">
              <tr>
                <th className="py-3 px-4 font-medium">Transaction</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Failure Reason</th>
                <th className="py-3 px-4 font-medium">AI Confidence</th>
                <th className="py-3 px-4 font-medium">Recommended Strategy</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {cases.slice(0, 6).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="hover:bg-[#131b2e] transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono text-blue-400 font-medium">
                    #{c.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectCustomer) {
                          onSelectCustomer(c.customerName);
                        } else {
                          onSelectCase(c);
                        }
                      }}
                      className="text-white font-medium hover:text-blue-400 transition-colors text-left"
                    >
                      {c.customerName}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                    {formatINR(c.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate">
                    {c.failureReason}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-blue-400">
                        {c.aiProbability}%
                      </span>
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${c.aiProbability}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {c.recommendedAction}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-blue-400 group-hover:text-blue-300 font-medium text-xs">
                      Inspect →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
