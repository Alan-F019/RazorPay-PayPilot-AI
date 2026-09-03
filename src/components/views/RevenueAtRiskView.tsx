import React, { useState } from 'react';
import {
  AlertOctagon,
  TrendingDown,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { CauseBreakdown, RecoveryCase } from '../../types';
import { formatINR, formatPercentage } from '../../utils/formatters';
import { StatusBadge, Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface RevenueAtRiskViewProps {
  causes: CauseBreakdown[];
  cases: RecoveryCase[];
  totalAtRisk: number;
  onSelectCase: (caseItem: RecoveryCase) => void;
}

export const RevenueAtRiskView: React.FC<RevenueAtRiskViewProps> = ({
  causes,
  cases,
  totalAtRisk,
  onSelectCase,
}) => {
  const [selectedCauseId, setSelectedCauseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const declineCodeTaxonomy = [
    {
      code: 'GATEWAY_ERROR_TIMEOUT',
      category: 'Bank Gateway Downtime',
      atRisk: 42100,
      cases: 68,
      recoverability: 'High (85%)',
      recommendedAction: 'Automated Immediate / +15m Retry',
    },
    {
      code: 'CUSTOMER_DROPOFF_UPI',
      category: 'UPI Verification Abandonment',
      atRisk: 46200,
      cases: 89,
      recoverability: 'Medium (42%)',
      recommendedAction: '1-Click WhatsApp Instant Link',
    },
    {
      code: 'MANDATE_EXECUTION_FAILED',
      category: 'Recurring e-Mandate Delays',
      atRisk: 31800,
      cases: 54,
      recoverability: 'Very High (92%)',
      recommendedAction: 'Smart Backoff Banking Window Retry',
    },
    {
      code: 'INSUFFICIENT_FUNDS_OR_LIMIT',
      category: 'Card Limit / Insufficient Funds',
      atRisk: 39600,
      cases: 42,
      recoverability: 'Low (18%)',
      recommendedAction: 'Manual Executive Escalate / Alternate Route',
    },
    {
      code: 'INVOICE_TERMS_EXCEEDED',
      category: 'Overdue Net-30 Invoices',
      atRisk: 24100,
      cases: 36,
      recoverability: 'Medium (55%)',
      recommendedAction: 'Receivables Dunning & Collections',
    },
  ];

  const filteredCases = cases.filter((c) => {
    const matchesCause = selectedCauseId === 'all' || c.cause === selectedCauseId;
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.declineCode && c.declineCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCause && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Total Revenue at Risk
            </h2>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {formatINR(totalAtRisk)}
            </span>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
              327 at-risk transactions
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Categorized across Razorpay Card, UPI, NetBanking, and Subscription auto-debit conduits
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Recoverable via Retries</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              ₹1,14,200
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">61.9% of total risk</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Requires Manual Review</span>
            <span className="text-base font-bold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
              ₹70,300
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">38.1% of total risk</span>
          </div>
        </div>
      </div>

      {/* Failure Taxonomy Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Failure Taxonomy & Gateway Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Decline reasons mapped to automated recovery protocols
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            Razorpay Integration
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-medium">
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold">Decline Code</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Category</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Amount at Risk</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Case Volume</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Estimated Yield</th>
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold">Automated Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {declineCodeTaxonomy.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-6 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {row.code}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{row.category}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatINR(row.atRisk)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">{row.cases} txns</td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                      {row.recoverability}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-slate-600 dark:text-slate-400 font-medium">
                    {row.recommendedAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Cases Queue */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Cause Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCauseId('all')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                selectedCauseId === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Causes ({cases.length})
            </button>
            {causes.map((cause) => (
              <button
                key={cause.id}
                onClick={() => setSelectedCauseId(cause.id)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedCauseId === cause.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cause.title}</span>
                <span className="opacity-70 text-[11px]">({formatINR(cause.amount)})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, case, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Case Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-medium">
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold">Case & Customer</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Issue Details</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Amount</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Decline Code</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Strategy</th>
                <th className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">Status</th>
                <th className="py-3 px-6 text-slate-700 dark:text-slate-300 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {c.customerName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{c.id}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[240px] truncate" title={c.issueDescription}>
                    {c.issueDescription}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatINR(c.amount)}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {c.declineCode || 'N/A'}
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge variant="neutral">{c.strategy}</Badge>
                  </td>

                  <td className="py-3.5 px-4">
                    <StatusBadge status={c.status} />
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <span className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs">
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
