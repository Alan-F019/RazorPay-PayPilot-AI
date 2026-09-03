import React, { useState } from 'react';
import {
  Webhook,
  Copy,
  Check,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTestMode: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isTestMode,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const webhookEndpoint = 'https://api.recover.fintech.io/v1/razorpay/webhook';
  const webhookSecret = 'whsec_981273901a892b110948ac';

  const subscribedEvents = [
    'payment.authorized',
    'payment.failed',
    'subscription.charged',
    'subscription.halted',
    'order.abandoned',
    'invoice.expired',
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merchant Settings & Razorpay Integration"
      subtitle="Manage your Razorpay webhook connection and environment"
      maxWidth="max-w-xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              {isTestMode ? 'Test Mode (Sandbox)' : 'Live Production Mode'}
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={onClose} className="px-4 cursor-pointer">
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-300">
        {/* 1. Merchant Identity Card */}
        <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white tracking-tight">
              PayPilot Demo Merchant
            </span>
            <Badge variant="success" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Razorpay Connected
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[#1e293b]/60">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Merchant ID</span>
              <span className="text-slate-200 font-mono text-xs font-medium mt-0.5 block">
                Razorpay Test Merchant
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Currency Base</span>
              <span className="text-slate-200 font-mono text-xs font-medium mt-0.5 block">
                INR (₹)
              </span>
            </div>
          </div>
        </div>

        {/* 2. Webhook Endpoint & Secret Configuration */}
        <div className="border border-[#1e293b] rounded-lg p-4 bg-[#0f172a] space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-blue-400" />
              Razorpay Inbound Webhook URL
            </h4>
            <span className="text-[11px] text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Endpoint Active
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookEndpoint}
                className="flex-1 text-xs font-mono py-2 px-3 border border-[#1e293b] rounded-md bg-[#0b0f19] text-slate-200 focus:outline-hidden select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookEndpoint, 'url')}
                className="px-2.5 py-2 bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#1e293b] rounded-md transition-colors cursor-pointer shrink-0"
                title="Copy webhook URL"
              >
                {copiedKey === 'url' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-[11px] text-slate-400 block mb-1 font-medium">
              Webhook Secret
            </span>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={webhookSecret}
                className="flex-1 text-xs font-mono py-2 px-3 border border-[#1e293b] rounded-md bg-[#0b0f19] text-slate-200 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                className="px-2.5 py-2 bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#1e293b] rounded-md transition-colors cursor-pointer shrink-0"
                title="Copy webhook secret"
              >
                {copiedKey === 'secret' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Subscribed Razorpay Events */}
        <div className="border border-[#1e293b] rounded-lg p-4 bg-[#0f172a] space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Subscribed Razorpay Webhook Events
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              {subscribedEvents.length} Events Active
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {subscribedEvents.map((ev) => (
              <span
                key={ev}
                className="px-2.5 py-1 rounded-md bg-[#0b0f19] text-slate-300 border border-[#1e293b] hover:border-slate-700 transition-colors"
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

