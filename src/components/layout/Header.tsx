import React from 'react';
import {
  RotateCw,
  FlaskConical,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenPlayground?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Revenue Recovery',
  subtitle = 'Monitor failed payments, identify revenue at risk, and let AI determine the best recovery action.',
  isTestMode,
  onRefresh,
  isRefreshing,
  onOpenPlayground,
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

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-white bg-[#0f172a] hover:bg-[#131b2e] border border-[#1e293b] rounded-md transition-colors cursor-pointer"
          title="Refresh transaction data"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Dedicated Test Payment Playground Button */}
        {onOpenPlayground && (
          <button
            type="button"
            onClick={onOpenPlayground}
            className="cursor-pointer gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 font-medium px-3 py-1.5 rounded-md border border-amber-500/30 text-xs shadow-xs transition-colors flex items-center"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span>🧪 Test Mode Playground</span>
          </button>
        )}


      </div>
    </header>
  );
};
