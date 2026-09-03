import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  RotateCw,
  ChevronRight,
  Shield,
  Zap,
  FilterX,
  FileSpreadsheet,
} from 'lucide-react';
import { RecoveryCase, CaseStatus } from '../../types';
import {
  formatINR,
  formatConfidence,
  getConfidenceNumber,
  normalizeFailureCategory,
} from '../../utils/formatters';
import { StatusBadge } from '../common/Badge';

interface RecoveryCasesViewProps {
  cases: RecoveryCase[];
  onSelectCase: (caseItem: RecoveryCase) => void;
  onRefreshCases?: () => void;
  onSelectCustomer?: (customerName: string) => void;
}

export const RecoveryCasesView: React.FC<RecoveryCasesViewProps> = ({
  cases,
  onSelectCase,
  onRefreshCases,
  onSelectCustomer,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const statusCounts = {
    all: cases.length,
    recovered: cases.filter((c) => c.status === 'recovered').length,
    pending: cases.filter((c) => c.status === 'pending').length,
    needs_review: cases.filter((c) => c.status === 'needs_review').length,
    escalated: cases.filter((c) => c.status === 'escalated').length,
  };

  const filteredCases = cases.filter((c) => {
    const matchesStatus =
      activeStatusTab === 'all' || c.status === activeStatusTab;
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.failureReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recommendedAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Aggregates for active view
  const totalVolumeInView = filteredCases.reduce((acc, c) => acc + c.amount, 0);
  const avgConfidenceInView = filteredCases.length
    ? Math.round(
        filteredCases.reduce((acc, c) => acc + getConfidenceNumber(c.aiProbability), 0) /
          filteredCases.length
      )
    : 0;

  const exportCSV = () => {
    const headers = [
      'Transaction',
      'Customer',
      'Amount',
      'Failure',
      'AI Probability',
      'Recommended Action',
      'Status',
    ];
    const rows = filteredCases.map((c) => [
      c.id,
      `"${c.customerName}"`,
      c.amount,
      `"${c.failureReason}"`,
      `${c.aiProbability}%`,
      `"${c.recommendedAction}"`,
      c.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `recover_cases_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setActiveStatusTab('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5 pb-12 text-slate-300 max-w-[1440px] mx-auto w-full">
      {/* Top Filter and Search Controls */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4 space-y-3">
        {/* Status Tab Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                activeStatusTab === 'all'
                  ? 'bg-[#1e293b] text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
              }`}
            >
              All Cases ({statusCounts.all})
            </button>
            <button
              onClick={() => setActiveStatusTab('needs_review')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'needs_review'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
              }`}
            >
              <span>Needs Review</span>
              <span className="font-mono text-[11px]">({statusCounts.needs_review})</span>
            </button>
            <button
              onClick={() => setActiveStatusTab('pending')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'pending'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
              }`}
            >
              <span>Pending</span>
              <span className="font-mono text-[11px]">({statusCounts.pending})</span>
            </button>
            <button
              onClick={() => setActiveStatusTab('recovered')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'recovered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
              }`}
            >
              <span>Recovered</span>
              <span className="font-mono text-[11px]">({statusCounts.recovered})</span>
            </button>
            <button
              onClick={() => setActiveStatusTab('escalated')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeStatusTab === 'escalated'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
              }`}
            >
              <span>Escalated to Ops</span>
              <span className="font-mono text-[11px]">({statusCounts.escalated})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#131b2e] border border-[#1e293b] rounded-md text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search Field + Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction ID (e.g. RP10482), customer name, decline reason, or action..."
              className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 px-1 shrink-0 font-mono">
            <span>
              Volume: <strong className="text-white">{formatINR(totalVolumeInView)}</strong>
            </span>
            <span>•</span>
            <span>
              Avg AI Conf:{' '}
              <strong className="text-blue-400">{avgConfidenceInView}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Recovery Cases Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredCases.length} of {cases.length} total recovery items
            </p>
          </div>
          {(activeStatusTab !== 'all' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset active filters</span>
            </button>
          )}
        </div>

        {/* Empty State vs Data Table */}
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center bg-[#0b0f19]">
            <FilterX className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">
              No matching recovery cases
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              No cases match the status filter "{activeStatusTab}"
              {searchQuery && ` and search term "${searchQuery}"`}.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-xs font-medium text-white rounded-md transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f172a] text-slate-400 font-mono text-[11px] border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4 font-medium">Transaction</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">Failure Reason</th>
                  <th className="py-3 px-4 font-medium">AI Confidence</th>
                  <th className="py-3 px-4 font-medium">Recommended Action</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 text-right font-medium">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-[#131b2e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-400">
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
                        className="font-medium text-white hover:text-blue-400 transition-colors text-left group-hover:underline"
                      >
                        {c.customerName}
                      </button>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {c.customerEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {formatINR(c.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#1e293b] text-slate-300 border border-slate-700/50">
                        {normalizeFailureCategory(c)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-blue-400">
                          {formatConfidence(c.aiProbability)}
                        </span>
                        <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              getConfidenceNumber(c.aiProbability) >= 75
                                ? 'bg-blue-500'
                                : getConfidenceNumber(c.aiProbability) >= 50
                                ? 'bg-amber-500'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${getConfidenceNumber(c.aiProbability)}%` }}
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
        )}
      </div>
    </div>
  );
};
