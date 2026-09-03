import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Building2,
  CreditCard,
  Send,
  ExternalLink,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatINR } from '../../utils/formatters';
import { SimulationResult } from '../../types';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySimulation: (result: SimulationResult) => void;
}

interface WorkflowStep {
  id: number;
  label: string;
  detail: string;
  tag: string;
  durationMs: number;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onApplySimulation,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const workflowSteps: WorkflowStep[] = [
    {
      id: 1,
      label: 'Payment detected',
      detail: 'Customer Rahul Sharma initiated checkout for ₹4,999 (Order #order_Nx88172901)',
      tag: 'Razorpay Checkout',
      durationMs: 650,
    },
    {
      id: 2,
      label: 'Payment failed',
      detail: 'Issuer declined authorization with decline code INSUFFICIENT_FUNDS (HDFC Bank)',
      tag: 'Gateway Decline',
      durationMs: 700,
    },
    {
      id: 3,
      label: 'Razorpay webhook received',
      detail: 'Inbound webhook event payment.failed validated with HMAC-SHA256 signature in 18ms',
      tag: 'Webhook Ingested',
      durationMs: 650,
    },
    {
      id: 4,
      label: 'AI analyses transaction',
      detail: 'Evaluated customer history: 8 successful payments, 0 chargebacks, low risk index',
      tag: 'Intelligence Layer',
      durationMs: 750,
    },
    {
      id: 5,
      label: 'AI calculates recovery probability',
      detail: 'Recovery probability scored at 84% based on personal account failure pattern',
      tag: 'Scored 84%',
      durationMs: 700,
    },
    {
      id: 6,
      label: 'AI selects recovery strategy',
      detail: 'Strategy chosen: "Create Payment Link" with instant UPI deep-link & WhatsApp delivery',
      tag: 'Strategy Selected',
      durationMs: 650,
    },
    {
      id: 7,
      label: 'Recovery payment link generated',
      detail: 'Dispatched dynamic link https://rzp.io/i/rec_rp10482 to customer billing contact',
      tag: 'Link Dispatched',
      durationMs: 800,
    },
    {
      id: 8,
      label: 'Payment recovered',
      detail: 'Customer completed transaction via UPI (Google Pay). ₹4,999 captured into merchant settlement.',
      tag: '₹4,999 Captured',
      durationMs: 800,
    },
  ];

  const startSimulation = () => {
    setIsRunning(true);
    setIsCompleted(false);
    setCurrentStepIndex(0);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      setIsCompleted(false);
      setCurrentStepIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isRunning || currentStepIndex < 0) return;

    if (currentStepIndex < workflowSteps.length) {
      const step = workflowSteps[currentStepIndex];
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, step.durationMs);
      return () => clearTimeout(timer);
    } else {
      setIsRunning(false);
      setIsCompleted(true);
    }
  }, [isRunning, currentStepIndex]);

  const handleApply = () => {
    onApplySimulation({
      transactionsAnalyzed: 1,
      recoveryOpportunitiesClassified: 1,
      recoveryActionsExecuted: 1,
      revenueRecovered: 4999,
      recoveryRate: 41.2,
      blockedActionsCount: 0,
      casesUpdated: 1,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Run Recovery Demo"
      subtitle="Simulate the end-to-end payment failure to revenue recovery workflow"
      maxWidth="max-w-2xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Razorpay Sandbox Environment
          </div>
          <div className="flex items-center gap-2">
            {!isRunning && !isCompleted && (
              <Button
                variant="primary"
                size="md"
                onClick={startSimulation}
                className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-medium px-4 py-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Start Recovery Workflow</span>
              </Button>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                Processing Step {Math.min(currentStepIndex + 1, workflowSteps.length)} of {workflowSteps.length}...
              </div>
            )}

            {isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startSimulation}
                  className="text-slate-300 border-[#1e293b] hover:bg-[#131b2e] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Re-run
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApply}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold px-4 py-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to Live Dashboard</span>
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Transaction Under Recovery</div>
            <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-2">
              <span>Rahul Sharma</span>
              <span className="text-xs text-slate-400 font-mono">#RP10482</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Payment Value</div>
            <div className="text-lg font-bold font-mono text-white">₹4,999</div>
          </div>
        </div>

        {/* 8-Step Vertical Workflow Timeline */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recovery Workflow Pipeline
          </div>

          <div className="space-y-3">
            {workflowSteps.map((step, idx) => {
              const isPast = currentStepIndex > idx || isCompleted;
              const isCurrent = currentStepIndex === idx && isRunning;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3.5 p-2.5 rounded-md transition-all duration-300 border ${
                    isCurrent
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-xs'
                      : isPast
                      ? 'bg-[#0f172a] border-[#1e293b]'
                      : 'border-transparent opacity-45'
                  }`}
                >
                  {/* Step Status Indicator */}
                  <div className="mt-0.5 shrink-0">
                    {isPast ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-mono">
                        {step.id}
                      </div>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isCurrent ? 'text-blue-300' : isPast ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isCurrent
                            ? 'bg-blue-500/20 text-blue-300'
                            : isPast
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* End Outcome Celebration State */}
        {isCompleted && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-emerald-400 font-mono">₹4,999 RECOVERED</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-medium">
                    100% Captured
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Razorpay webhook <span className="font-mono text-emerald-300">payment.captured</span> confirmed settlement.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-mono">Recovery Time</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">1m 18s total</span>
            </div>
          </div>
        )}

        {!isRunning && !isCompleted && (
          <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-lg text-center">
            <p className="text-xs text-slate-400">
              Click <span className="text-blue-400 font-medium">Start Recovery Workflow</span> to observe how the AI agent autonomously intercepts payment declines and generates real-time Razorpay recovery tokens.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
