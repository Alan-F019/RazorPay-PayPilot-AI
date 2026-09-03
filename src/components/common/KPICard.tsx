import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  metric: string;
  subtext: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  secondaryMetric?: string;
  tooltipText?: string;
  icon?: React.ReactNode;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  metric,
  subtext,
  trend,
  secondaryMetric,
  icon,
  accentColor = 'blue',
}) => {
  const accentBorder = {
    blue: 'hover:border-blue-300 dark:hover:border-blue-700/80',
    emerald: 'hover:border-emerald-300 dark:hover:border-emerald-700/80',
    amber: 'hover:border-amber-300 dark:hover:border-amber-700/80',
    indigo: 'hover:border-indigo-300 dark:hover:border-indigo-700/80',
    rose: 'hover:border-rose-300 dark:hover:border-rose-700/80',
  }[accentColor];

  const glowBg = {
    blue: 'from-blue-500/5 via-transparent to-transparent',
    emerald: 'from-emerald-500/5 via-transparent to-transparent',
    amber: 'from-amber-500/5 via-transparent to-transparent',
    indigo: 'from-indigo-500/5 via-transparent to-transparent',
    rose: 'from-rose-500/5 via-transparent to-transparent',
  }[accentColor];

  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs ${accentBorder} transition-all duration-200 group`}
    >
      {/* Subtle background ambient gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${glowBg} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1.5">
            {title}
          </h3>
          {icon && (
            <span className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {icon}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <div className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {metric}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[12px] flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                  trend.isNeutral
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    : trend.isPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                }`}
              >
                {trend.isNeutral ? (
                  <Minus className="w-3 h-3" />
                ) : trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value}
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">{subtext}</span>
          </div>

          {secondaryMetric && (
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
              {secondaryMetric}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
