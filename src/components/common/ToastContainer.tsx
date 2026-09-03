import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
      {toasts.map((t) => {
        const getStyles = () => {
          switch (t.type) {
            case 'success':
              return {
                bg: 'bg-[#0f172a] border-emerald-500/40',
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
                titleColor: 'text-emerald-300',
              };
            case 'warning':
              return {
                bg: 'bg-[#0f172a] border-amber-500/40',
                icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
                titleColor: 'text-amber-300',
              };
            case 'error':
              return {
                bg: 'bg-[#0f172a] border-rose-500/40',
                icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
                titleColor: 'text-rose-300',
              };
            case 'info':
            default:
              return {
                bg: 'bg-[#0f172a] border-blue-500/40',
                icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
                titleColor: 'text-blue-300',
              };
          }
        };

        const { bg, icon, titleColor } = getStyles();

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-3 ${bg}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${titleColor}`}>{t.title}</div>
              <div className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                {t.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
