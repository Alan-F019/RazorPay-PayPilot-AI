import React from 'react';
import {
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { CustomerProfile, RecoveryCase } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge, StatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatINR, formatPercentage } from '../../utils/formatters';

interface CustomerDetailDrawerProps {
  customer: CustomerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  cases: RecoveryCase[];
  onSelectCase: (c: RecoveryCase) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  cases,
  onSelectCase,
}) => {
  if (!customer) return null;

  const customerCases = cases.filter(
    (c) => c.customerId === customer.id || c.customerName === customer.name
  );

  const isContactQuotaExceeded = customer.contactCountLast7Days >= customer.contactLimit;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-xl"
      title={`Customer Profile — ${customer.name}`}
      subtitle={`Razorpay Account: ${customer.id} • Tier: ${customer.tier}`}
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Last active: {customer.lastActivity}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-slate-300">
        {/* Profile Card */}
        <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                {customer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{customer.name}</h3>
                <span className="text-xs text-slate-400">{customer.businessType}</span>
              </div>
            </div>
            <Badge
              variant={
                customer.healthScore === 'Healthy'
                  ? 'success'
                  : customer.healthScore === 'Needs Attention'
                  ? 'warning'
                  : 'danger'
              }
            >
              {customer.healthScore}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e293b] text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{customer.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{customer.phone}</span>
            </div>
          </div>
        </div>

        {/* Financial Yield & Recovery Metrics */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Financial & Recovery Metrics
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Total Volume
              </span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {formatINR(customer.totalVolume)}
              </span>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Total Recovered
              </span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                {formatINR(customer.totalRecovered)}
              </span>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Recovery Rate
              </span>
              <span className="text-base font-bold font-mono text-blue-400 mt-0.5 block">
                {formatPercentage(customer.recoveryRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Anti-Spam Circuit Breaker / Contact Limit Guard */}
        <div className="p-3.5 bg-[#0f172a] border border-[#1e293b] rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              {isContactQuotaExceeded ? (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              7-Day Dunning Quota: {customer.contactCountLast7Days} of {customer.contactLimit} Dispatched
            </span>
            <span
              className={`font-mono text-[11px] ${
                isContactQuotaExceeded ? 'text-amber-400 font-bold' : 'text-emerald-400'
              }`}
            >
              {isContactQuotaExceeded ? 'Quota Reached (Protected)' : 'Eligible for Retry'}
            </span>
          </div>
          <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isContactQuotaExceeded ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (customer.contactCountLast7Days / customer.contactLimit) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Policy protects customer relationship by capping automated recovery contacts to 2 per 7 days.
          </p>
        </div>

        {/* Associated Recovery Cases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Associated Recovery Transactions ({customerCases.length})
            </h4>
          </div>

          {customerCases.length === 0 ? (
            <div className="p-6 bg-[#0f172a] rounded-lg border border-[#1e293b] text-center text-xs text-slate-400">
              No recent payment failures recorded for this account.
            </div>
          ) : (
            <div className="space-y-2">
              {customerCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onClose();
                    onSelectCase(c);
                  }}
                  className="p-3 bg-[#0f172a] hover:bg-[#131b2e] border border-[#1e293b] hover:border-blue-500/40 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-semibold group-hover:underline">
                        #{c.id}
                      </span>
                      <span className="text-xs font-bold font-mono text-white">
                        {formatINR(c.amount)}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {c.failureReason} • Strategy: {c.strategy}
                    </div>
                  </div>
                  <span className="text-xs text-blue-400 group-hover:text-blue-300 font-medium">
                    Inspect →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
