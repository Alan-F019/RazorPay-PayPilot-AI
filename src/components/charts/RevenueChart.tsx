import React, { useState, useMemo } from 'react';
import { formatINR, formatCompactINR, formatPercentage } from '../../utils/formatters';
import { ChartDataPoint } from '../../data/mockData';
import { DashboardMetrics } from '../../types';
import { TrendingUp, ShieldCheck, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';

interface RevenueChartProps {
  data: ChartDataPoint[];
  activePeriod: '7D' | '30D' | '90D';
  onPeriodChange: (period: '7D' | '30D' | '90D') => void;
  metrics?: DashboardMetrics;
  isLoading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  activePeriod,
  onPeriodChange,
  metrics,
  isLoading = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Normalize data points and calculate bounds defensively
  const { maxVal, points } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { maxVal: 1, points: [] };
    }

    const normalized: ChartDataPoint[] = data.map((d, index) => {
      const revenueAtRisk =
        typeof d?.revenueAtRisk === 'number' && Number.isFinite(d.revenueAtRisk)
          ? d.revenueAtRisk
          : typeof (d as any)?.atRisk === 'number' && Number.isFinite((d as any).atRisk)
          ? (d as any).atRisk
          : 0;

      const revenueRecovered =
        typeof d?.revenueRecovered === 'number' && Number.isFinite(d.revenueRecovered)
          ? d.revenueRecovered
          : typeof (d as any)?.recovered === 'number' && Number.isFinite((d as any).recovered)
          ? (d as any).recovered
          : 0;

      const recoveryRate =
        typeof d?.recoveryRate === 'number' && Number.isFinite(d.recoveryRate)
          ? d.recoveryRate
          : revenueAtRisk > 0
          ? Number(((revenueRecovered / revenueAtRisk) * 100).toFixed(1))
          : 0;

      return {
        date: d?.date || `P${index + 1}`,
        revenueAtRisk,
        revenueRecovered,
        recoveryRate,
      };
    });

    const calculatedMax = Math.max(
      1000,
      ...normalized.map((d) => Math.max(d.revenueAtRisk, d.revenueRecovered))
    );

    return {
      maxVal: calculatedMax * 1.15,
      points: normalized,
    };
  }, [data]);

  const height = 240;
  const width = 740;
  const padding = { top: 20, right: 24, bottom: 35, left: 68 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (points.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (points.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const safeVal = typeof val === 'number' && Number.isFinite(val) ? val : 0;
    return padding.top + innerHeight - (safeVal / maxVal) * innerHeight;
  };

  // Generate SVG path commands
  const riskPath = useMemo(() => {
    if (!points.length) return '';
    return points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.revenueAtRisk).toFixed(1)}`
      )
      .join(' ');
  }, [points, maxVal]);

  const recoveredPath = useMemo(() => {
    if (!points.length) return '';
    return points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.revenueRecovered).toFixed(1)}`
      )
      .join(' ');
  }, [points, maxVal]);

  const recoveredArea = useMemo(() => {
    if (!points.length) return '';
    const baseLine = (padding.top + innerHeight).toFixed(1);
    return `${recoveredPath} L ${getX(points.length - 1).toFixed(1)} ${baseLine} L ${getX(
      0
    ).toFixed(1)} ${baseLine} Z`;
  }, [recoveredPath, points]);

  // Y-axis grid intervals
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  // Active hover point data (safely bounded)
  const activeDataPoint =
    points.length > 0
      ? hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length
        ? points[hoverIndex]
        : points[points.length - 1]
      : null;

  return (
    <div className="bg-[#0b0f19] rounded-lg border border-[#1e293b] p-6 transition-all duration-200">
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Revenue Recovery Trajectory
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              — At-Risk vs. Recovered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time visual comparison of failed checkout volume captured by AI recovery
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-500"></span>
              <span>Revenue at Risk</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-blue-500"></span>
              <span>Revenue Recovered</span>
            </div>
          </div>

          {/* Time Filter */}
          <div className="inline-flex rounded-md border border-[#1e293b] bg-[#0f172a] p-0.5">
            {(['7D', '30D', '90D'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => onPeriodChange(period)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                  activePeriod === period
                    ? 'bg-[#1e293b] text-white font-semibold border border-[#334155]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Crucial Business Metrics Visual Strip */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Revenue Recovered */}
        <div className="p-3 bg-[#0f172a] rounded-lg border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase text-emerald-400">
              Revenue Recovered
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
              Saved
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
            {metrics ? formatINR(metrics.revenueRecovered) : '₹72,400'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Returned to merchant account
          </span>
        </div>

        {/* Metric 2: Revenue at Risk / Lost */}
        <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
              Revenue at Risk
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              Lost: {metrics ? formatINR(metrics.revenueLost) : '₹24,800'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {metrics ? formatINR(metrics.revenueAtRisk) : '₹1,84,500'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Gross decline/abandonment volume
          </span>
        </div>

        {/* Metric 3: Recovery Rate */}
        <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase text-blue-400">
              Recovery Rate
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              +{metrics ? metrics.trendVsPrevious : '12.4'}% vs prior
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">
            {metrics ? formatPercentage(metrics.recoveryRate) : '39.2%'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Industry avg: 24.8% (Benchmark)
          </span>
        </div>

        {/* Metric 4: Affected Volume */}
        <div className="p-3 bg-[#0f172a] rounded-lg border border-[#1e293b]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
              Affected Volume
            </span>
            <span className="text-[10px] text-blue-400 font-mono">
              {metrics ? metrics.successfulRecoveriesCount : '31'} Recovered
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            {metrics ? `${metrics.affectedTransactionsCount} Txns` : '17 Txns'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {metrics ? metrics.affectedCustomersCount : '12'} merchant customers
          </span>
        </div>
      </div>

      {/* Snapshot hover values bar */}
      {activeDataPoint && !isLoading && (
        <div className="mt-4 mb-2 flex items-center gap-6 px-1 flex-wrap text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {hoverIndex !== null ? `Date (${activeDataPoint.date})` : 'Latest Trajectory Point'}
            </span>
            <span className="text-sm font-semibold text-slate-200 tabular-nums">
              {activeDataPoint.date}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-[#1e293b]" />
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">At Risk That Day</span>
            <span className="text-sm font-semibold text-slate-300 tabular-nums">
              {formatINR(activeDataPoint.revenueAtRisk)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Recovered Amount</span>
            <span className="text-sm font-semibold text-blue-400 tabular-nums">
              {formatINR(activeDataPoint.revenueRecovered)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Day's Recovery Rate</span>
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {formatPercentage(activeDataPoint.recoveryRate)}
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart Area or Loading State */}
      <div className="relative w-full h-[240px] select-none mt-2">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#090d16]/60 rounded border border-[#1e293b] animate-pulse">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Fetching trajectory data for {activePeriod}...</span>
            </div>
            <div className="mt-3 w-48 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#090d16]/30 rounded border border-[#1e293b] text-xs text-slate-500">
            <span>No trajectory data recorded for this period.</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="recoveredGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid lines and Y-axis labels */}
            {yTicks.map((val, idx) => {
              const y = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {formatCompactINR(val)}
                  </text>
                </g>
              );
            })}

            {/* Area fill for recovered */}
            <path d={recoveredArea} fill="url(#recoveredGradient)" />

            {/* Line for Revenue at Risk */}
            <path
              d={riskPath}
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line for Revenue Recovered */}
            <path
              d={recoveredPath}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis labels and interaction targets */}
            {points.map((p, idx) => {
              const x = getX(idx);
              const isHovered = hoverIndex === idx;

              return (
                <g key={idx}>
                  {/* X-axis label */}
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-medium transition-colors ${
                      isHovered ? 'fill-slate-100 font-semibold' : 'fill-slate-500'
                    }`}
                  >
                    {p.date}
                  </text>

                  {/* Vertical hover crosshair line */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + innerHeight}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Circles on line */}
                  {isHovered && (
                    <>
                      <circle
                        cx={x}
                        cy={getY(p.revenueAtRisk)}
                        r="4"
                        className="fill-slate-900 stroke-slate-400 stroke-2"
                      />
                      <circle
                        cx={x}
                        cy={getY(p.revenueRecovered)}
                        r="4.5"
                        className="fill-blue-400 stroke-slate-900 stroke-2"
                      />
                    </>
                  )}

                  {/* Invisible hover capture rect */}
                  <rect
                    x={x - innerWidth / (Math.max(1, points.length) * 2)}
                    y={padding.top}
                    width={innerWidth / Math.max(1, points.length)}
                    height={innerHeight + padding.bottom}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Footer Impact Summary Note */}
      <div className="mt-4 pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-emerald-300 font-mono">
              {metrics ? formatINR(metrics.revenueRecovered) : '₹72,400'}
            </strong>{' '}
            captured via Razorpay 1-click links & automated retry schedules.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Source: Razorpay Webhook Ingest Layer (payment.failed, order.paid)
        </div>
      </div>
    </div>
  );
};
