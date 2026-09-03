import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
} from 'lucide-react';
import { RecoveryCase, PolicyGuardrails } from '../../types';
import {
  formatINR,
  formatConfidence,
  getConfidenceNumber,
  normalizeFailureCategory,
} from '../../utils/formatters';
import { StatusBadge } from '../common/Badge';
import { Button } from '../common/Button';

interface AIRecoveryViewProps {
  cases: RecoveryCase[];
  guardrails: PolicyGuardrails;
  onSelectCase: (caseItem: RecoveryCase) => void;
  onExecuteAction: (caseId: string) => void;
  onEscalateCase: (caseId: string) => void;
  onOpenSimulation: () => void;
}

export const AIRecoveryView: React.FC<AIRecoveryViewProps> = ({
  cases,
  guardrails,
  onSelectCase,
  onExecuteAction,
  onEscalateCase,
  onOpenSimulation,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'high_prob' | 'needs_review'>('all');
  const [executedCases, setExecutedCases] = useState<Record<string, boolean>>({});

  const actionableCases = cases.filter((c) => {
    if (filterType === 'high_prob') return c.aiProbability >= 70;
    if (filterType === 'needs_review') return c.status === 'needs_review';
    return true;
  });

  const handleExecute = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExecutedCases((prev) => ({ ...prev, [id]: true }));
    onExecuteAction(id);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-300">
      {/* Top Banner: AI Model and Safety Guardrails */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Decision & Recovery Engine
                </h2>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Active Guardrails
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Autonomous policy reasoning engine for Razorpay merchants. Intercepts payment failures, evaluates customer transaction history, scores recoverability, and initiates compliant recovery channels.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={onOpenSimulation}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Run Live Simulation</span>
            </Button>
          </div>
        </div>

        {/* Guardrail Status Strip */}
        <div className="mt-4 pt-4 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-[#0f172a] rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[10px]">MAX AUTOMATED CAP</span>
            <span className="text-white font-semibold">₹{(guardrails.maxAutomatedRecoveryAmount ?? guardrails.maxSingleRecoveryAmount ?? 25000).toLocaleString()} per txn</span>
          </div>
          <div className="p-2.5 bg-[#0f172a] rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[10px]">RETRY RATE LIMIT</span>
            <span className="text-white font-semibold">{guardrails.maxRetryAttempts ?? guardrails.maxRetriesPerInvoice ?? 2} attempts per failure</span>
          </div>
          <div className="p-2.5 bg-[#0f172a] rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[10px]">SAFETY CIRCUIT BREAKER</span>
            <span className="text-emerald-400 font-semibold">Armed (100% Policy Enforced)</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#1e293b] text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            All Pending Decisions ({cases.length})
          </button>
          <button
            onClick={() => setFilterType('high_prob')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'high_prob'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            High Probability (≥70%)
          </button>
          <button
            onClick={() => setFilterType('needs_review')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'needs_review'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            Needs Merchant Review
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {actionableCases.length} prioritized cases
        </span>
      </div>

      {/* Case Queue Cards or Empty State */}
      {actionableCases.length === 0 ? (
        <div className="p-12 text-center bg-[#0b0f19] border border-[#1e293b] rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Pending Cases in Queue</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            All cases matching this filter have been processed or resolved.
          </p>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className="mt-4 px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-xs font-medium text-white rounded-md transition-colors cursor-pointer"
          >
            Show All Decisions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
        {actionableCases.map((c) => {
          const isExecuted = executedCases[c.id];
          return (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className="p-5 bg-[#0b0f19] border border-[#1e293b] hover:border-blue-500/40 rounded-lg transition-colors cursor-pointer space-y-3.5 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {c.id}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {c.customerName}
                  </span>
                  <span className="text-xs text-slate-400 truncate">
                    ({c.customerEmail})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-bold font-mono text-white">
                    {formatINR(c.amount)}
                  </span>
                  <StatusBadge status={isExecuted ? 'recovered' : c.status} />
                </div>
              </div>

              {/* AI Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-[#0f172a] p-3.5 rounded border border-[#1e293b]">
                <div>
                  <span className="text-slate-500 block text-[11px]">Failure Diagnostic</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">
                    {normalizeFailureCategory(c)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-mono truncate" title={c.failureReason || c.declineReason}>
                    Raw: {c.failureReason || c.declineReason || 'Gateway Error'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Recovery Probability</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold font-mono text-sm text-blue-400">
                      {formatConfidence(c.aiProbability)}
                    </span>
                    <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${getConfidenceNumber(c.aiProbability)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {c.customerHistoryText || 'Good payment history'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Recommended Strategy</span>
                  <span className="font-bold font-mono text-white mt-0.5 block uppercase text-blue-300">
                    {c.recommendedAction}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
                    Strategy: {c.strategy || 'Alternate Payment Method'}
                  </span>
                </div>
              </div>

              {/* Rationale & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-1 max-w-xl">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong className="text-slate-300">Why?</strong> {c.whyExplanation}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-500">Guardrail:</span>
                    {c.amount > 25000 || c.guardrail?.status === 'MANUAL_APPROVAL_REQUIRED' ? (
                      <span className="text-amber-400 font-semibold">⚠ MANUAL APPROVAL (Cap ₹25k)</span>
                    ) : c.guardrail?.status === 'BLOCKED' ? (
                      <span className="text-red-400 font-semibold">✕ BLOCKED</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">✓ ALLOWED (Within limits)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCase(c);
                    }}
                    className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Review Case
                  </button>

                  <button
                    type="button"
                    disabled={isExecuted}
                    onClick={(e) => handleExecute(e, c.id)}
                    className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isExecuted
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : c.amount > 25000 || c.guardrail?.status === 'MANUAL_APPROVAL_REQUIRED'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isExecuted ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Action Dispatched</span>
                      </>
                    ) : c.amount > 25000 || c.guardrail?.status === 'MANUAL_APPROVAL_REQUIRED' ? (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Authorize & Execute</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Execute {c.recommendedAction}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
