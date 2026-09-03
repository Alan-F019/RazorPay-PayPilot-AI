import React, { useState, useEffect, useCallback } from 'react';
import {
  NavigationTab,
  RecoveryCase,
  CustomerProfile,
  PolicyGuardrails,
  AuditLogEntry,
  SimulationResult,
  DashboardMetrics,
  DateRange,
  ToastNotification,
  CauseBreakdown,
} from './types';
import { ChartDataPoint } from './data/mockData';

// Dedicated Backend Service Layer
import {
  fetchDashboardMetrics,
  fetchRevenueTrajectory,
  fetchCauseBreakdowns,
  fetchRecoveryCases,
  fetchCustomers,
  fetchPolicyGuardrails,
  executeRecoveryAction,
  escalateRecoveryCase,
  resolveRecoveryCase,
  triggerSimulationRun,
} from './services/recoveryService';

// Layout & Views
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/views/OverviewView';
import { RecoveryCasesView } from './components/views/RecoveryCasesView';
import { AIRecoveryView } from './components/views/AIRecoveryView';
import { CustomersView } from './components/views/CustomersView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { CaseDetailDrawer } from './components/views/CaseDetailDrawer';
import { CustomerDetailDrawer } from './components/views/CustomerDetailDrawer';
import { SimulationModal } from './components/views/SimulationModal';
import { SettingsModal } from './components/views/SettingsModal';
import { ToastContainer } from './components/common/ToastContainer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Environment & Modes
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange>('30D');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState<boolean>(false);

  // Core Asynchronous Data States
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [guardrails, setGuardrails] = useState<PolicyGuardrails>({
    maxRetryAttempts: 2,
    maxAutomatedRecoveryAmount: 25000,
    customerContactLimit: 2,
    contactLimitDays: 7,
    escalationAfterFailedAttempts: 2,
    smartRetryBackoffHours: [4, 24, 72],
    autoBlockHighRiskGatewayErrors: true,
    requireManualApprovalAboveAmount: 50000,
    activeWebhookEvents: ['payment.failed', 'order.paid'],
  });
  const [causes, setCauses] = useState<CauseBreakdown[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Financial Metrics State
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    period: '30D',
    revenueAtRisk: 184500,
    revenueRecovered: 72400,
    revenueLost: 24800,
    recoveryRate: 39.2,
    previousPeriodRecoveryRate: 34.8,
    activeCasesCount: 17,
    casesRequiringAction: 17,
    affectedTransactionsCount: 17,
    affectedCustomersCount: 12,
    avgRecoveryTime: '4h 18m',
    successfulRecoveriesCount: 31,
    trendVsPrevious: 12.4,
    unrecoveredVolume: 24800,
    inProgressVolume: 87300,
  });

  // Modal / Drawer States
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const showToast = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'success'
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, message, type, timestamp: Date.now() }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Data Bootstrap from Service Layer
  const loadInitialData = useCallback(async () => {
    try {
      setNetworkError(null);
      const [initCases, initCustomers, initGuardrails, initCauses, initMetrics, initChart] =
        await Promise.all([
          fetchRecoveryCases(),
          fetchCustomers(),
          fetchPolicyGuardrails(),
          fetchCauseBreakdowns(),
          fetchDashboardMetrics(dateRange),
          fetchRevenueTrajectory(dateRange),
        ]);

      setCases(initCases);
      setCustomers(initCustomers);
      setGuardrails(initGuardrails);
      setCauses(initCauses);
      setMetrics(initMetrics);
      setChartData(initChart);
    } catch (err: any) {
      setNetworkError(err?.message || 'Failed to connect to recovery service');
      showToast(
        'Connection Issue',
        'Could not sync latest transaction telemetry. Using local cache.',
        'warning'
      );
    }
  }, [dateRange, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Date Range Switch with Realistic Async Transition
  const handleSelectDateRange = async (newRange: DateRange) => {
    setDateRange(newRange);
    setIsLoadingTrajectory(true);
    try {
      const [newMetrics, newTrajectory] = await Promise.all([
        fetchDashboardMetrics(newRange),
        fetchRevenueTrajectory(newRange),
      ]);
      setMetrics(newMetrics);
      setChartData(newTrajectory);
    } catch (err) {
      showToast('Data Error', 'Unable to fetch period data.', 'error');
    } finally {
      setIsLoadingTrajectory(false);
    }
  };

  // Explicit User Refresh Action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [refreshedCases, refreshedMetrics, refreshedTrajectory] = await Promise.all([
        fetchRecoveryCases(),
        fetchDashboardMetrics(dateRange),
        fetchRevenueTrajectory(dateRange),
      ]);
      setCases(refreshedCases);
      setMetrics(refreshedMetrics);
      setChartData(refreshedTrajectory);
      showToast(
        'Data Refreshed',
        'Synced latest Razorpay webhook events and settlement batches.',
        'info'
      );
    } catch (err) {
      showToast('Refresh Error', 'Failed to refresh transactions.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action: Trigger / Execute Recovery (e.g. Generate 1-Click Link)
  const handleExecuteRecoveryAction = async (caseId: string, actionName?: string) => {
    try {
      const { updatedCase } = await executeRecoveryAction(caseId, actionName);

      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));

      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase);
      }

      // Dynamically update dashboard metrics to reflect recovered cashflow
      setMetrics((prev) => {
        const newRecovered = prev.revenueRecovered + updatedCase.amount;
        const newAtRisk = Math.max(0, prev.revenueAtRisk - updatedCase.amount);
        const newRate = Number(((newRecovered / (newRecovered + newAtRisk)) * 100).toFixed(1));
        return {
          ...prev,
          revenueRecovered: newRecovered,
          revenueAtRisk: newAtRisk,
          recoveryRate: newRate,
          successfulRecoveriesCount: prev.successfulRecoveriesCount + 1,
          casesRequiringAction: Math.max(0, prev.casesRequiringAction - 1),
        };
      });

      showToast(
        'Action Executed',
        `Generated 1-click payment link and dispatched to ${updatedCase.customerName}.`,
        'success'
      );
    } catch (err: any) {
      showToast('Action Failed', err?.message || 'Unable to execute action', 'error');
    }
  };

  // Action: Escalate Case to Operations Queue
  const handleEscalateCase = async (caseId: string) => {
    try {
      const { updatedCase } = await escalateRecoveryCase(caseId);
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase);
      }
      showToast(
        'Case Escalated',
        `Transaction #${caseId} routed to Senior Merchant Support queue.`,
        'warning'
      );
    } catch (err: any) {
      showToast('Escalation Failed', err?.message || 'Unable to escalate', 'error');
    }
  };

  // Action: Manually Resolve Case
  const handleResolveCase = async (caseId: string) => {
    try {
      const { updatedCase } = await resolveRecoveryCase(caseId);
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase);
      }
      showToast('Case Resolved', `Transaction #${caseId} marked as recovered.`, 'success');
    } catch (err: any) {
      showToast('Resolve Failed', err?.message || 'Unable to resolve', 'error');
    }
  };

  // Action: Inspect Customer Profile from anywhere in the app
  const handleInspectCustomer = (customerName: string) => {
    const found = customers.find(
      (c) =>
        c.name.toLowerCase() === customerName.toLowerCase() ||
        c.id.toLowerCase() === customerName.toLowerCase()
    );
    if (found) {
      setSelectedCustomer(found);
    } else {
      // Create lightweight fallback profile
      const fallback: CustomerProfile = {
        id: `cust_${Math.floor(1000 + Math.random() * 9000)}`,
        name: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: '+91 98765 43210',
        businessType: 'Merchant Account',
        totalVolume: 85000,
        totalRecovered: 18400,
        failureCount: 2,
        recoveryRate: 50.0,
        contactCountLast7Days: 1,
        contactLimit: 2,
        tier: 'Growth',
        healthScore: 'Healthy',
        lastActivity: 'Recent transaction',
      };
      setSelectedCustomer(fallback);
    }
  };

  // Action: Run 8-Step Interactive Recovery Simulation
  const handleApplySimulation = async (result: SimulationResult) => {
    try {
      const targetCaseId = 'RP10482';
      await handleExecuteRecoveryAction(targetCaseId, 'Create Payment Link');
      showToast(
        'Simulation Complete',
        `Recovered ₹${result.revenueRecovered.toLocaleString()} across test transactions.`,
        'success'
      );
    } catch (err) {
      showToast('Simulation Notice', 'Simulation demo completed.', 'info');
    }
  };

  // Dynamic Header Metadata based on active navigation tab
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Revenue Recovery',
          subtitle:
            'Monitor failed payments, identify revenue at risk, and let AI determine the best recovery action.',
        };
      case 'cases':
        return {
          title: 'Recovery Cases Pipeline',
          subtitle:
            'Real-time stream of failed checkouts, decline diagnostics, and targeted retry workflows.',
        };
      case 'ai_recovery':
        return {
          title: 'AI Decision Engine',
          subtitle:
            'Policy-enforced reasoner evaluating failure codes, customer reliability, and dispatch channels.',
        };
      case 'customers':
        return {
          title: 'Customer Accounts & Dunning Health',
          subtitle:
            'Account recovery yields, lifetime volume, and strict 7-day anti-spam contact limits.',
        };
      case 'analytics':
        return {
          title: 'Recovery Economics & Yield',
          subtitle:
            'Quantitative breakdown of automated retry yields, recovery latency, and net merchant ROI.',
        };
      default:
        return {
          title: 'Revenue Recovery',
          subtitle:
            'Autonomous revenue recovery infrastructure designed for Razorpay merchants.',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans select-none">
      {/* 1. COMPACT LEFT SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isTestMode={isTestMode}
        onToggleTestMode={() => setIsTestMode((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulation={() => setIsSimulationOpen(true)}
        activeCaseCount={metrics.casesRequiringAction}
      />

      {/* 2. MAIN WORKSPACE CANVAS */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto bg-[#090d16]">
        {/* Network Error or Service Disconnection Alert Banner */}
        {networkError && (
          <div className="bg-rose-950/80 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{networkError}</span>
            </div>
            <button
              onClick={loadInitialData}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-500/40 rounded text-[11px] font-semibold text-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Sync
            </button>
          </div>
        )}

        {/* Global Page Header */}
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          isTestMode={isTestMode}
          onToggleTestMode={() => setIsTestMode((prev) => !prev)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenSimulation={() => setIsSimulationOpen(true)}
          dateRange={dateRange}
          onSelectDateRange={handleSelectDateRange}
        />

        {/* View Router (Restricted to Clean 1440px Boundary) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              cases={cases}
              causes={causes}
              chartData={chartData}
              activePeriod={dateRange === 'Custom' ? '30D' : dateRange}
              onPeriodChange={handleSelectDateRange}
              onSelectCase={(c) => setSelectedCase(c)}
              onViewAllCases={() => setActiveTab('cases')}
              metrics={metrics}
              isLoading={isLoadingTrajectory}
              onSelectCustomer={handleInspectCustomer}
            />
          )}

          {activeTab === 'cases' && (
            <RecoveryCasesView
              cases={cases}
              onSelectCase={(c) => setSelectedCase(c)}
              onRefreshCases={handleRefresh}
              onSelectCustomer={handleInspectCustomer}
            />
          )}

          {activeTab === 'ai_recovery' && (
            <AIRecoveryView
              cases={cases}
              guardrails={guardrails}
              onSelectCase={(c) => setSelectedCase(c)}
              onExecuteAction={handleExecuteRecoveryAction}
              onEscalateCase={handleEscalateCase}
              onOpenSimulation={() => setIsSimulationOpen(true)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              onSelectCustomerCases={(custName) => {
                setActiveTab('cases');
              }}
              onInspectCustomer={(cust) => setSelectedCustomer(cust)}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsView />}
        </main>
      </div>

      {/* 3. CASE DETAIL DRAWER */}
      <CaseDetailDrawer
        caseItem={selectedCase}
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        guardrails={guardrails}
        onTriggerManualRetry={(id) => handleExecuteRecoveryAction(id, 'Trigger Manual Retry')}
        onEscalateCase={handleEscalateCase}
        onResolveCase={handleResolveCase}
        onInspectCustomer={handleInspectCustomer}
      />

      {/* 4. CUSTOMER PROFILE DRAWER */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        cases={cases}
        onSelectCase={(c) => {
          setSelectedCustomer(null);
          setSelectedCase(c);
        }}
      />

      {/* 5. 8-STEP INTERACTIVE SIMULATION MODAL */}
      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onApplySimulation={handleApplySimulation}
      />

      {/* 6. SETTINGS & WEBHOOKS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isTestMode={isTestMode}
      />

      {/* 7. TOAST NOTIFICATION CONTAINER (FEEDBACK & ACTIONS) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
