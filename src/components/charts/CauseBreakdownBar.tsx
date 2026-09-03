import React from 'react';
import { CauseBreakdown } from '../../types';
import { formatINR, formatPercentage } from '../../utils/formatters';

interface CauseBreakdownBarProps {
  causes: CauseBreakdown[];
  totalAtRisk: number;
  onSelectCause?: (causeId: string) => void;
}

export const CauseBreakdownBar: React.FC<CauseBreakdownBarProps> = ({
  causes,
  totalAtRisk,
  onSelectCause,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Revenue at Risk by Cause
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Root failure categorization across payment channels
            </p>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            Total: {formatINR(totalAtRisk)}
          </span>
        </div>

        {/* Stacked Proportional Bar */}
        <div className="mt-4 h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex shadow-2xs">
          {causes.map((cause) => (
            <div
              key={cause.id}
              style={{
                width: `${cause.percentage}%`,
                backgroundColor: cause.color,
              }}
              className="h-full transition-all duration-300 hover:opacity-90 cursor-pointer"
              title={`${cause.title}: ${formatINR(cause.amount)} (${cause.percentage}%)`}
              onClick={() => onSelectCause?.(cause.id)}
            />
          ))}
        </div>

        {/* List Breakdown with progress bars */}
        <div className="mt-5 space-y-3">
          {causes.map((cause) => (
            <div
              key={cause.id}
              onClick={() => onSelectCause?.(cause.id)}
              className="group flex flex-col gap-1.5 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: cause.color }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cause.title}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({cause.count} cases)
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums text-[13px]">
                    {formatINR(cause.amount)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs w-12 text-right tabular-nums">
                    {formatPercentage(cause.percentage)}
                  </span>
                </div>
              </div>

              {/* Individual horizontal line indicator */}
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${cause.percentage}%`,
                    backgroundColor: cause.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>Updated real-time via Razorpay Webhooks</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          Failure taxonomy & policies →
        </span>
      </div>
    </div>
  );
};
