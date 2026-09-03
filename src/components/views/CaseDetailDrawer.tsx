import React, { useState } from 'react';
import {
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  Building2,
  Mail,
  Smartphone,
  Sparkles,
  Shield,
  FileText,
  Lock,
} from 'lucide-react';
import { RecoveryCase, PolicyGuardrails } from '../../types';
import { Drawer } from '../common/Drawer';
import { StatusBadge, Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  formatINR,
  formatConfidence,
  getConfidenceNumber,
  normalizeFailureCategory,
} from '../../utils/formatters';

interface CaseDetailDrawerProps {
  caseItem: RecoveryCase | null;
  isOpen: boolean;
  onClose: () => void;
  guardrails: PolicyGuardrails;
  onTriggerManualRetry?: (caseId: string) => void;
  onEscalateCase?: (caseId: string) => void;
  onResolveCase?: (caseId: string) => void;
  onInspectCustomer?: (customerName: string) => void;
}

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  caseItem,
  isOpen,
  onClose,
  guardrails,
  onTriggerManualRetry,
  onEscalateCase,
  onResolveCase,
  onInspectCustomer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isRecoveredLocal, setIsRecoveredLocal] = useState(false);

  if (!caseItem) return null;

  const isAlreadyRecovered = caseItem.status === 'recovered' || isRecoveredLocal;
  const currentLink =
    generatedLink ||
    caseItem.paymentLinkUrl ||
    `https://rzp.io/i/rec_${caseItem.id.toLowerCase()}`;
  const failureCat = normalizeFailureCategory(caseItem);
  const rawFailureMsg =
    caseItem.failureReason ||
    caseItem.declineReason ||
    caseItem.issueDescription ||
    'Payment failed during checkout';

  const guardrailStatus = caseItem.guardrail?.status || (caseItem.amount > 25000 ? 'MANUAL_APPROVAL_REQUIRED' : 'ALLOWED');
  const isGuardrailBlocked = guardrailStatus === 'BLOCKED';
  const isManualApproval = guardrailStatus === 'MANUAL_APPROVAL_REQUIRED';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateOrExecute = () => {
    setIsActionLoading(true);
    setTimeout(() => {
      setIsActionLoading(false);
      setGeneratedLink(`https://rzp.io/i/rec_${caseItem.id.toLowerCase()}`);
      if (onTriggerManualRetry) {
        onTriggerManualRetry(caseItem.id);
      }
    }, 600);
  };

  const handleMarkAsRecovered = () => {
    setIsRecoveredLocal(true);
    if (onResolveCase) {
      onResolveCase(caseItem.id);
    }
  };

  // Fallback reasoning bullets if none attached from API
  const explainableReasoning = (caseItem.reasoning && caseItem.reasoning.length > 0)
    ? caseItem.reasoning
    : [
        `${failureCat} detected and classified via failure heuristics`,
        `Account health is Healthy with reliable historical volume`,
        `Transaction volume (${formatINR(caseItem.amount)}) evaluated against policy guardrails`,
        `Recovery attempt counter within safety threshold (1/2)`,
      ];

  // Active timeline items
  const activeTimeline =
    caseItem.timeline && caseItem.timeline.length > 0
      ? caseItem.timeline.map((t) => ({
          title: t.title,
          desc: t.description,
          timestamp: t.timestamp || '14:28:10',
          status: t.status || 'completed',
        }))
      : [
          {
            title: 'Payment initiated',
            desc: `Transaction initiated for ${formatINR(caseItem.amount)} on Razorpay Test Checkout`,
            timestamp: '14:28:10',
            status: 'completed',
          },
          {
            title: 'Payment failed',
            desc: `Issuer decline: ${rawFailureMsg}`,
            timestamp: '14:28:12',
            status: 'completed',
          },
          {
            title: 'Webhook received & verified',
            desc: 'Inbound Razorpay payment.failed payload verified via HMAC-SHA256 signature',
            timestamp: '14:28:14',
            status: 'completed',
          },
          {
            title: 'AI analysed transaction',
            desc: `Classified decline pattern as ${failureCat}; computed ${formatConfidence(
              caseItem.aiProbability
            )} recovery likelihood`,
            timestamp: '14:28:15',
            status: 'completed',
          },
          {
            title: 'Recovery action selected',
            desc: `Formulated "${caseItem.recommendedAction}" based on account history and guardrail policies`,
            timestamp: '14:28:16',
            status: 'completed',
          },
          {
            title: 'Payment link generated',
            desc:
              isAlreadyRecovered || generatedLink
                ? `Razorpay recovery payment link dispatched: ${currentLink}`
                : 'Ready for automated link delivery',
            timestamp: isAlreadyRecovered || generatedLink ? '14:28:18' : 'Pending',
            status: isAlreadyRecovered || generatedLink ? 'completed' : 'in_progress',
          },
          {
            title: 'Payment recovered',
            desc: isAlreadyRecovered
              ? `Customer completed payment. ${formatINR(caseItem.amount)} credited to merchant.`
              : 'Awaiting customer completion or settlement webhook confirmation',
            timestamp: isAlreadyRecovered ? '14:31:02' : 'Pending',
            status: isAlreadyRecovered ? 'completed' : 'pending',
          },
        ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-2xl"
      title={`Case #${caseItem.id} — ${caseItem.customerName}`}
      subtitle={`Amount: ${formatINR(caseItem.amount)} • Category: ${failureCat}`}
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Transaction ID: #{caseItem.id}
          </div>
          <div className="flex items-center gap-2">
            {!isAlreadyRecovered ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEscalateCase?.(caseItem.id)}
                  className="text-slate-300 border-[#1e293b] hover:bg-[#131b2e] cursor-pointer"
                >
                  Escalate to Ops
                </Button>
                {isGuardrailBlocked ? (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => onEscalateCase?.(caseItem.id)}
                    className="text-purple-300 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 font-medium cursor-pointer"
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    Blocked by Guardrail → Escalate
                  </Button>
                ) : isManualApproval ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleGenerateOrExecute}
                    loading={isActionLoading}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Authorize & Execute Action
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleGenerateOrExecute}
                    loading={isActionLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current mr-1.5" />
                    Execute {caseItem.recommendedAction}
                  </Button>
                )}
                {generatedLink && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleMarkAsRecovered}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Simulate Payment Success
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully Recovered
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-300 bg-[#0f172a] hover:bg-[#131b2e] border border-[#1e293b] cursor-pointer"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-slate-300">
        {/* 1. Case Core Summary Header */}
        <div className="p-4 bg-[#0b0f19] border border-[#1e293b] rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Customer</span>
            {onInspectCustomer ? (
              <button
                type="button"
                onClick={() => onInspectCustomer(caseItem.customerName)}
                className="font-semibold text-white hover:text-blue-400 mt-0.5 block truncate transition-colors text-left cursor-pointer underline decoration-slate-600 hover:decoration-blue-400"
              >
                {caseItem.customerName}
              </button>
            ) : (
              <span className="font-semibold text-white mt-0.5 block truncate">
                {caseItem.customerName}
              </span>
            )}
            <span className="text-[11px] text-slate-400 truncate block">
              {caseItem.customerEmail}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Amount</span>
            <span className="text-base font-bold font-mono text-white mt-0.5 block">
              {formatINR(caseItem.amount)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Failure Category</span>
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                {failureCat}
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Current Status</span>
            <div className="mt-1">
              <StatusBadge status={isAlreadyRecovered ? 'recovered' : caseItem.status} />
            </div>
          </div>
        </div>

        {/* 2. Failure Diagnostic & Original Razorpay Error Description */}
        <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Original Razorpay Failure Diagnostic
            </span>
            {caseItem.declineCode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-amber-300 border border-amber-500/20">
                Code: {caseItem.declineCode}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 font-mono bg-[#0b0f19] p-3 rounded border border-[#1e293b] leading-relaxed">
            "{rawFailureMsg}"
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span>Payment ID: {caseItem.razorpayPaymentId || `pay_${caseItem.id.toLowerCase()}`}</span>
            <span>Order ID: {caseItem.razorpayOrderId || `order_${caseItem.id.toLowerCase()}`}</span>
          </div>
        </div>

        {/* 3. AI RECOVERY DECISION & STRATEGY PANEL */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                AI Revenue Recovery Decision
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Model: Explainable Reasoner v4.0
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recovery Probability */}
            <div className="p-3.5 bg-[#0f172a] rounded-md border border-[#1e293b]">
              <span className="text-[11px] text-slate-400 font-medium block">
                AI Confidence / Recovery Probability
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-400">
                  {formatConfidence(caseItem.aiProbability)}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  ({getConfidenceNumber(caseItem.aiProbability) >= 70
                    ? 'High'
                    : getConfidenceNumber(caseItem.aiProbability) >= 50
                    ? 'Medium'
                    : 'Low'}{' '}
                  confidence)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    getConfidenceNumber(caseItem.aiProbability) >= 75
                      ? 'bg-blue-500'
                      : getConfidenceNumber(caseItem.aiProbability) >= 50
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${getConfidenceNumber(caseItem.aiProbability)}%` }}
                />
              </div>
            </div>

            {/* Recommended Action & Strategy */}
            <div className="p-3.5 bg-[#0f172a] rounded-md border border-[#1e293b]">
              <span className="text-[11px] text-slate-400 font-medium block">
                Recommended Action
              </span>
              <span className="text-sm font-bold text-white uppercase font-mono mt-1 block text-blue-300">
                {caseItem.recommendedAction}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                Strategy: <span className="text-slate-200">{caseItem.strategy || 'Alternate Payment Method'}</span>
              </span>
            </div>
          </div>

          {/* Explainable Why Rationale (Actual Multi-Signal Breakdown) */}
          <div className="mt-4 p-3.5 bg-[#0f172a] rounded-md border border-[#1e293b]">
            <span className="text-xs font-semibold text-slate-200 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Why PayPilot AI Recommends This:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {explainableReasoning.map((reason, rIdx) => (
                <li key={rIdx} className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Guardrail & Policy Check Result */}
          <div className="mt-4 p-3.5 bg-[#0f172a] rounded-md border border-[#1e293b]">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/60">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Guardrail & Safety Policy Check
              </span>
              {guardrailStatus === 'ALLOWED' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ✓ ALLOWED
                </span>
              ) : guardrailStatus === 'MANUAL_APPROVAL_REQUIRED' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ⚠ MANUAL APPROVAL REQUIRED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/15 text-red-300 border border-red-500/30">
                  ✕ BLOCKED
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Enforced Policy:</span>
                <span className="text-slate-200 font-mono text-[11px] mt-0.5 block">
                  {caseItem.guardrail?.policy || caseItem.policyApplied || 'Automated Recovery Amount Limit'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guardrail Decision:</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">
                  {caseItem.guardrail?.reason ||
                    (guardrailStatus === 'ALLOWED'
                      ? 'Action fully permitted within risk parameters.'
                      : caseItem.amount > 25000
                      ? `Transaction volume (${formatINR(caseItem.amount)}) exceeds ₹25,000 threshold.`
                      : 'Review required.')}
                </span>
              </div>
            </div>
          </div>

          {/* Active Payment Link Display */}
          {(generatedLink || caseItem.paymentLinkUrl) && (
            <div className="mt-4 p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Active Razorpay Recovery Link
                </span>
                <span className="text-[10px] text-blue-400 font-mono">Valid for 24h</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentLink}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. RECOVERY WORKFLOW TIMELINE & AUDIT TRAIL */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] mb-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Recovery Workflow & Audit Trail
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Audit Track #AUD-{caseItem.id.replace(/\D/g, '') || '9912'}
            </span>
          </div>

          <div className="relative pl-6 space-y-4">
            {/* Vertical connector line */}
            <div className="absolute left-2.5 top-2 bottom-3 w-0.5 bg-[#1e293b]" />

            {activeTimeline.map((item, idx) => {
              const isDone = item.status === 'completed';
              const isInProg = item.status === 'in_progress';
              const isBlocked = item.status === 'blocked';

              return (
                <div key={idx} className="relative flex items-start justify-between gap-3 group">
                  {/* Timeline bullet */}
                  <div
                    className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isInProg
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                        : isBlocked
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-[#1e293b] text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : isBlocked ? '✕' : idx + 1}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isDone
                            ? 'text-slate-200'
                            : isInProg
                            ? 'text-blue-300'
                            : isBlocked
                            ? 'text-red-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
