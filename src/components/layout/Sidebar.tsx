import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Cpu,
  Users,
  BarChart3,
  Settings,
  Shield,
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  onOpenSettings: () => void;
  onOpenPlayground?: () => void;
  activeCaseCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isTestMode,
  onToggleTestMode,
  onOpenSettings,
  onOpenPlayground,
  activeCaseCount,
}) => {
  const navItems = [
    { 
      id: 'overview' as NavigationTab, 
      label: 'Overview', 
      icon: LayoutDashboard 
    },
    {
      id: 'cases' as NavigationTab,
      label: 'Recovery Cases',
      icon: FileSpreadsheet,
      badge: activeCaseCount ? String(activeCaseCount) : '17',
    },
    { 
      id: 'ai_recovery' as NavigationTab, 
      label: 'AI Recovery', 
      icon: Cpu,
      badge: '17 queue'
    },
    { 
      id: 'customers' as NavigationTab, 
      label: 'Customers', 
      icon: Users 
    },
    { 
      id: 'analytics' as NavigationTab, 
      label: 'Analytics', 
      icon: BarChart3 
    },
  ];

  return (
    <aside className="w-60 bg-[#0b0f19] border-r border-[#1e293b] flex flex-col h-screen shrink-0 select-none text-slate-300">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs tracking-tight">
            R
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-sm tracking-tight">Recover</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-medium">
                Razorpay
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal leading-tight">Revenue Recovery</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#131b2e] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-[#131b2e] text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Recovery Engine Status Panel */}
        <div className="pt-4 px-1">
          <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Recovery Engine
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Automated policy pipeline with ₹25k cap &amp; 2-retry safety limit.
            </p>
          </div>
        </div>
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-[#1e293b] bg-[#090d16] space-y-2">
        {/* Test Mode Playground Launcher */}
        {onOpenPlayground && (
          <button
            type="button"
            onClick={onOpenPlayground}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <span>🧪</span>
              <span>Payment Playground</span>
            </span>
            <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
              Test
            </span>
          </button>
        )}

        {/* Razorpay Test Mode Indicator / Toggle */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-[#0f172a] border border-[#1e293b]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-300">Razorpay Test Mode</span>
            <span className="text-[10px] text-slate-500 font-mono">rzp_test_99214a</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isTestMode}
            onClick={onToggleTestMode}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isTestMode ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isTestMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Settings Action */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-[#131b2e] rounded-md transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Webhooks</span>
        </button>
      </div>
    </aside>
  );
};
