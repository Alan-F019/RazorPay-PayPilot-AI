import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sliders,
  Bell,
  Key,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Radio,
} from 'lucide-react';
import { PolicyGuardrails } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatINR } from '../../utils/formatters';

interface StrategiesViewProps {
  guardrails: PolicyGuardrails;
  onUpdateGuardrails: (updated: PolicyGuardrails) => void;
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({
  guardrails,
  onUpdateGuardrails,
}) => {
  const [formData, setFormData] = useState<PolicyGuardrails>({ ...guardrails });
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGuardrails(formData);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  const handleReset = () => {
    setFormData({ ...guardrails });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Lock className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Recovery Strategies & Safety Guardrails
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure bounded financial automation rules. Strict mathematical constraints guarantee that customer fatigue is prevented and retry actions never execute beyond merchant-approved boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button type="button" variant="secondary" size="md" onClick={handleReset} className="text-slate-700 dark:text-slate-200">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <Button type="submit" variant="primary" size="md">
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Guardrails
          </Button>
        </div>
      </div>

      {savedNotification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Guardrail policies updated successfully. Live webhook listeners refreshed.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Core Financial Constraints */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5 transition-colors duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Bounded Financial Caps
            </h3>
            <Badge variant="blue" size="sm">
              Hard Constraint
            </Badge>
          </div>

          {/* Max Retry Attempts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Maximum Retry Attempts per Failure
              </label>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                {formData.maxRetryAttempts} retries
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={formData.maxRetryAttempts}
              onChange={(e) =>
                setFormData({ ...formData, maxRetryAttempts: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Default is 2 attempts. Exceeding 2 retries on Indian banking switches may trigger bank rate-limits.
            </p>
          </div>

          {/* Max Automated Recovery Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Maximum Automated Recovery Cap
              </label>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                {formatINR(formData.maxAutomatedRecoveryAmount)}
              </span>
            </div>
            <select
              value={formData.maxAutomatedRecoveryAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxAutomatedRecoveryAmount: Number(e.target.value),
                  requireManualApprovalAboveAmount: Number(e.target.value),
                })
              }
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="10000">₹10,000 (Conservative)</option>
              <option value="25000">₹25,000 (Standard Enterprise Default)</option>
              <option value="50000">₹50,000 (High Volume B2B)</option>
              <option value="100000">₹1,00,000 (Custom Enterprise)</option>
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Transactions exceeding this amount will be blocked by automated policies and routed to ops review.
            </p>
          </div>

          {/* Customer Contact Limit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Customer Contact Frequency Limit
              </label>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                {formData.customerContactLimit} messages / {formData.contactLimitDays} days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1 font-medium">Max Messages</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.customerContactLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, customerContactLimit: Number(e.target.value) })
                  }
                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1 font-medium">Rolling Window (Days)</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.contactLimitDays}
                  onChange={(e) =>
                    setFormData({ ...formData, contactLimitDays: Number(e.target.value) })
                  }
                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Prevents spamming customers who already received checkout reminders.
            </p>
          </div>
        </div>

        {/* Card 2: Smart Backoff & Escalation Routing */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5 transition-colors duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Smart Backoff & Escalation
            </h3>
            <Badge variant="neutral" size="sm">
              Banking Hours Optimized
            </Badge>
          </div>

          {/* Auto-escalation threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Auto-Escalate to Ops Queue After
            </label>
            <select
              value={formData.escalationAfterFailedAttempts}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  escalationAfterFailedAttempts: Number(e.target.value),
                })
              }
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="1">1 failed attempt (Immediate human attention)</option>
              <option value="2">2 failed attempts (Standard Protocol)</option>
              <option value="3">3 failed attempts (High Tolerance)</option>
            </select>
          </div>

          {/* Smart Banking Retry Windows */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Smart Retry Interval Schedule (IST Banking Windows)
            </label>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2 font-mono text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>1st Attempt:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">+15 minutes (Transient test)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2nd Attempt:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">+4 hours (Next clearing cycle)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3rd Attempt (if permitted):</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">+24 hours (09:30 AM IST next day)</span>
              </div>
            </div>
          </div>

          {/* Safety Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoBlockHighRiskGatewayErrors}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoBlockHighRiskGatewayErrors: e.target.checked,
                  })
                }
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Safety Circuit Breaker for Fraud / Stolen Card Flags
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Immediately block retries if Razorpay returns DO_NOT_HONOR or FRAUD_SUSPECTED.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};
