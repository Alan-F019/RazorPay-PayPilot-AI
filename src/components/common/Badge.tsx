import React from 'react';
import { CaseStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    danger: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
    purple: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] border whitespace-nowrap shadow-2xs ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: CaseStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'recovered':
      return (
        <Badge variant="success" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
          Recovered
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Pending
        </Badge>
      );
    case 'needs_review':
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Needs Review
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="blue" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          In Progress
        </Badge>
      );
    case 'blocked':
      return (
        <Badge variant="danger" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Blocked by Policy
        </Badge>
      );
    case 'escalated':
      return (
        <Badge variant="danger" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Escalated
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
