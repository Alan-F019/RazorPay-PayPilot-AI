import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Clock,
  Lock,
} from 'lucide-react';
import { RecoveryCase, PolicyGuardrails } from '../../types';
import {
  formatINR,
  formatConfidence,
  getConfidenceNumber,
  normalizeFailureCategory,
} from '../../utils/formatters';
import { StatusBadge } from '../common/Badge';

interface AIRecoveryViewProps {
  cases: RecoveryCase[];
  guardrails: PolicyGuardrails;
  onSelectCase: (caseItem: RecoveryCase) => void;
  onExecuteAction: (caseId: string) => void;
  onEscalateCase: (caseId: string) => void;
}

export const AIRecoveryView: React.FC<AIRecoveryViewProps> = ({
  cases,
  guardrails,
  onSelectCase,
  onExecuteAction,
  onEscalateCase,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'high_prob' | 'needs_review' | 'in_progress'>('all');
  const [executingCases, setExecutingCases] = useState<Record<string, boolean>>({});

  const actionableCases = cases.filter((c) => {
    if (filterType === 'high_prob') return c.aiProbability >= 70;
    if (filterType === 'needs_review') return c.status === 'needs_review';
    if (filterType === 'in_progress') return c.status === 'in_progress';
    return true;
  });

  const handleExecute = async (e: React.MouseEvent, c: RecoveryCase) => {
    e.stopPropagation();
    setExecutingCases((prev) => ({ ...prev, [c.id]: true }));
    try {
      const isManual = c.amount > 25000 || c.status === 'needs_review';
      const res = await fetch(`/api/recovery-events/${c.id}/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionName: c.recommendedAction,
          isManualAuth: isManual,
          actor: isManual ? 'Merchant Operator' : 'Automated Policy Engine',
        }),
      }).then((r) => r.json());

      if (res.success) {
        onExecuteAction(c.id);
      } else if (res.blocked && onEscalateCase) {
        onEscalateCase(c.id);
      }
    } catch (err) {
      console.error('Execute action failed:', err);
    } finally {
      setExecutingCases((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  return (
    <div className="space-y-6 pb-12 text-slate-300">
      {/* Top Banner: AI Model and Safety Guardrails */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">
                  AI Revenue Recovery & Outcome Engine
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                  v5.0 Lifecycle Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Autonomous failure diagnosis, multi-signal predictive scoring, and policy-enforced execution with full financial outcome tracking.
              </p>
            </div>
          </div>


        </div>

        <div className="mt-4 pt-3.5 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Amount Cap: ₹25,000 max auto
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Attempt Limit: 2 attempts max
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-500">Guardrail Engine:</span>
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
            All Lifecycle Cases ({cases.length})
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
            onClick={() => setFilterType('in_progress')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'in_progress'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            Awaiting Payment ({cases.filter((c) => c.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilterType('needs_review')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'needs_review'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            Needs Merchant Review ({cases.filter((c) => c.status === 'needs_review').length})
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
          <h3 className="text-sm font-semibold text-white">No Cases in Queue</h3>
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
            const isRecovered = c.status === 'recovered';
            const isInProg = c.status === 'in_progress';
            const isEscalated = c.status === 'escalated';
            const isBlocked = c.status === 'blocked' || (c.retryAttempts || 0) >= 2;
            const isNeedsReview = c.status === 'needs_review' || c.amount > 25000;
            const isExecuting = executingCases[c.id];

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
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-white block">
                        {formatINR(c.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Attempt {c.retryAttempts || 0}/2
                      </span>
                    </div>
                    <StatusBadge status={c.status} />
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
                    <span className="text-[11px] text-slate-400 mt-0.5 block truncate font-mono">
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
                      {c.amount > 25000 || isNeedsReview ? (
                        <span className="text-amber-400 font-semibold">⚠ MANUAL APPROVAL (Cap ₹25k)</span>
                      ) : isBlocked ? (
                        <span className="text-red-400 font-semibold">✕ BLOCKED (Max Attempts 2/2)</span>
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

                    {isRecovered ? (
                      <span className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Recovered ✓
                      </span>
                    ) : isBlocked || isEscalated ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Escalated to Ops
                      </button>
                    ) : isInProg ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Awaiting Payment ({c.retryAttempts || 1}/2)
                      </button>
                    ) : isNeedsReview ? (
                      <button
                        type="button"
                        disabled={isExecuting}
                        onClick={(e) => handleExecute(e, c)}
                        className="px-3.5 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Authorize & Execute
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isExecuting}
                        onClick={(e) => handleExecute(e, c)}
                        className="px-3.5 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Execute {c.recommendedAction}
                      </button>
                    )}
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
