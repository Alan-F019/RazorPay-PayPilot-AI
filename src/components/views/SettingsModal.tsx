import React, { useState } from 'react';
import {
  Key,
  Webhook,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
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
      subtitle="Configure webhook endpoints, API credentials, and environment mode"
      maxWidth="max-w-xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Environment: {isTestMode ? 'Test Mode (Sandbox)' : 'Live Mode'}
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Merchant Account info */}
        <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              Acme Technologies Pvt Ltd
            </span>
            <Badge variant="success" size="sm">
              Razorpay Verified
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block text-[11px]">Merchant ID</span>
              <span className="text-slate-200 font-medium">acc_Nz88192301</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Currency Base</span>
              <span className="text-slate-200 font-medium">INR (₹)</span>
            </div>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="border border-[#1e293b] rounded-lg p-4 bg-[#0f172a] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-blue-400" />
              Razorpay Inbound Webhook URL
            </h4>
            <span className="text-[11px] text-emerald-400 font-semibold">Listening</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookEndpoint}
              className="flex-1 text-xs font-mono p-2 border border-[#1e293b] rounded bg-[#0b0f19] text-slate-300"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(webhookEndpoint, 'url')}
              className="text-slate-200 border-[#1e293b]"
            >
              {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block mb-1 font-medium">Webhook Secret</span>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={webhookSecret}
                className="flex-1 text-xs font-mono p-2 border border-[#1e293b] rounded bg-[#0b0f19] text-slate-300"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                className="text-slate-200 border-[#1e293b]"
              >
                {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Subscribed Razorpay Events */}
        <div className="border border-[#1e293b] rounded-lg p-4 bg-[#0f172a] space-y-2">
          <h4 className="text-xs font-bold text-white">
            Subscribed Razorpay Webhook Events
          </h4>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {['payment.failed', 'payment.authorized', 'subscription.halted', 'subscription.charged', 'order.abandoned', 'invoice.expired'].map((ev) => (
              <span key={ev} className="px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#1e293b]">
                {ev}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
