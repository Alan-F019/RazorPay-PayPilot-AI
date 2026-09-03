import React from 'react';
import {
  RotateCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../common/Button';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSimulation: () => void;
  dateRange: '7D' | '30D' | '90D' | 'Custom';
  onSelectDateRange: (range: '7D' | '30D' | '90D' | 'Custom') => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Revenue Recovery',
  subtitle = 'Monitor failed payments, identify revenue at risk, and let AI determine the best recovery action.',
  isTestMode,
  onRefresh,
  isRefreshing,
  onOpenSimulation,
  dateRange,
  onSelectDateRange,
}) => {
  return (
    <header className="bg-[#0b0f19] border-b border-[#1e293b] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-20">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
          {/* Razorpay Test Mode indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#131b2e] border border-[#1e293b]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTestMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span className="text-[11px] font-mono text-slate-300">
              {isTestMode ? 'Razorpay Test Mode' : 'Razorpay Live'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Date range picker: 7D 30D 90D */}
        <div className="inline-flex rounded-md border border-[#1e293b] bg-[#0f172a] p-0.5">
          {(['7D', '30D', '90D'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onSelectDateRange(range)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                dateRange === range
                  ? 'bg-[#1e293b] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-white bg-[#0f172a] hover:bg-[#131b2e] border border-[#1e293b] rounded-md transition-colors cursor-pointer"
          title="Refresh transaction data"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Main CTA: Run Recovery Demo */}
        <Button
          variant="primary"
          size="md"
          onClick={onOpenSimulation}
          className="cursor-pointer gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-md border border-blue-500/30 text-xs shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-white" />
          <span>Run Recovery Demo</span>
        </Button>
      </div>
    </header>
  );
};
