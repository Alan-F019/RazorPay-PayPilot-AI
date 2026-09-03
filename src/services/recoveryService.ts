/**
 * Recover — AI Revenue Recovery for Razorpay
 * Dedicated API / Data-Fetching Service Layer
 *
 * NOTE FOR BACKEND INTEGRATION:
 * This layer abstracts all data access from the UI components.
 * To connect to a real backend (e.g., Express, FastAPI, NestJS, or Next.js API routes),
 * replace the simulated async promises with standard `fetch()` or `axios` calls
 * to the documented REST endpoints shown above each function.
 */

import {
  RecoveryCase,
  CustomerProfile,
  AuditLogEntry,
  PolicyGuardrails,
  CauseBreakdown,
  SimulationResult,
  DashboardMetrics,
  DateRange,
  CaseFilterParams,
  CustomerFilterParams,
} from '../types';
import {
  INITIAL_CASES,
  INITIAL_CUSTOMERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_GUARDRAILS,
  CAUSE_BREAKDOWNS,
  CHART_DATA_7D,
  CHART_DATA_30D,
  CHART_DATA_90D,
  ChartDataPoint,
} from '../data/mockData';

// In-memory state storage (mirrors backend database session)
let casesStore: RecoveryCase[] = JSON.parse(JSON.stringify(INITIAL_CASES));
let customersStore: CustomerProfile[] = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
let auditLogsStore: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
let guardrailsStore: PolicyGuardrails = JSON.parse(JSON.stringify(INITIAL_GUARDRAILS));

// Network simulation helper
const simulateLatency = (ms = 180): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Period-specific metrics lookup
const PERIOD_METRICS: Record<DateRange, DashboardMetrics> = {
  '7D': {
    period: '7D',
    revenueAtRisk: 62800,
    revenueRecovered: 26400,
    revenueLost: 7800,
    recoveryRate: 42.0,
    previousPeriodRecoveryRate: 36.5,
    activeCasesCount: 6,
    casesRequiringAction: 6,
    affectedTransactionsCount: 6,
    affectedCustomersCount: 5,
    avgRecoveryTime: '2h 45m',
    successfulRecoveriesCount: 11,
    trendVsPrevious: 8.2,
    unrecoveredVolume: 7800,
    inProgressVolume: 28600,
  },
  '30D': {
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
  },
  '90D': {
    period: '90D',
    revenueAtRisk: 540200,
    revenueRecovered: 218500,
    revenueLost: 74100,
    recoveryRate: 40.4,
    previousPeriodRecoveryRate: 35.1,
    activeCasesCount: 48,
    casesRequiringAction: 48,
    affectedTransactionsCount: 52,
    affectedCustomersCount: 38,
    avgRecoveryTime: '5h 12m',
    successfulRecoveriesCount: 94,
    trendVsPrevious: 16.8,
    unrecoveredVolume: 74100,
    inProgressVolume: 247600,
  },
  'Custom': {
    period: 'Custom',
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
  },
};

/**
 * 1. Fetch dashboard metrics
 * Backend Endpoint: GET /api/v1/recovery/metrics?period={period}
 */
export async function fetchDashboardMetrics(period: DateRange = '30D'): Promise<DashboardMetrics> {
  await simulateLatency(160);
  // Example real implementation:
  // const res = await fetch(`/api/v1/recovery/metrics?period=${period}`);
  // return res.json();
  return { ...PERIOD_METRICS[period] };
}

/**
 * 2. Fetch revenue trajectory chart data
 * Backend Endpoint: GET /api/v1/recovery/trajectory?period={period}
 */
export async function fetchRevenueTrajectory(period: DateRange = '30D'): Promise<ChartDataPoint[]> {
  await simulateLatency(180);
  // Example real implementation:
  // const res = await fetch(`/api/v1/recovery/trajectory?period=${period}`);
  // return res.json();
  switch (period) {
    case '7D':
      return [...CHART_DATA_7D];
    case '90D':
      return [...CHART_DATA_90D];
    case '30D':
    default:
      return [...CHART_DATA_30D];
  }
}

/**
 * 3. Fetch failure causes breakdown
 * Backend Endpoint: GET /api/v1/recovery/causes?period={period}
 */
export async function fetchCauseBreakdowns(): Promise<CauseBreakdown[]> {
  await simulateLatency(100);
  return [...CAUSE_BREAKDOWNS];
}

/**
 * 4. Fetch recovery cases with optional filtering
 * Backend Endpoint: GET /api/v1/recovery/cases?status={status}&search={search}&customerId={customerId}
 */
export async function fetchRecoveryCases(filter?: CaseFilterParams): Promise<RecoveryCase[]> {
  await simulateLatency(200);
  let result = [...casesStore];

  if (filter?.status && filter.status !== 'all') {
    result = result.filter((c) => c.status === filter.status);
  }

  if (filter?.customerId) {
    result = result.filter((c) => c.customerId === filter.customerId || c.customerName === filter.customerId);
  }

  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.failureReason.toLowerCase().includes(q) ||
        c.recommendedAction.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * 5. Fetch single recovery case by ID
 * Backend Endpoint: GET /api/v1/recovery/cases/{id}
 */
export async function fetchCaseById(caseId: string): Promise<RecoveryCase | null> {
  await simulateLatency(120);
  const found = casesStore.find((c) => c.id === caseId);
  return found ? { ...found } : null;
}

/**
 * 6. Fetch customer accounts list
 * Backend Endpoint: GET /api/v1/recovery/customers?tier={tier}&search={search}
 */
export async function fetchCustomers(filter?: CustomerFilterParams): Promise<CustomerProfile[]> {
  await simulateLatency(150);
  let result = [...customersStore];

  if (filter?.tier && filter.tier !== 'all') {
    result = result.filter((c) => c.tier.toLowerCase() === filter.tier?.toLowerCase());
  }

  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * 7. Fetch single customer profile by ID
 * Backend Endpoint: GET /api/v1/recovery/customers/{id}
 */
export async function fetchCustomerById(customerId: string): Promise<CustomerProfile | null> {
  await simulateLatency(120);
  const found = customersStore.find((c) => c.id === customerId || c.name === customerId);
  return found ? { ...found } : null;
}

/**
 * 8. Execute recovery action on a case
 * Backend Endpoint: POST /api/v1/recovery/cases/{id}/execute-action
 */
export async function executeRecoveryAction(
  caseId: string,
  actionName?: string
): Promise<{ success: boolean; updatedCase: RecoveryCase; auditLog: AuditLogEntry }> {
  await simulateLatency(350);

  const targetIndex = casesStore.findIndex((c) => c.id === caseId);
  if (targetIndex === -1) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  const existing = casesStore[targetIndex];
  const updatedCase: RecoveryCase = {
    ...existing,
    status: 'recovered',
    retryAttempts: existing.retryAttempts + 1,
    updatedAt: 'Just now (AI Captured)',
    paymentLinkUrl: existing.paymentLinkUrl || `https://rzp.io/i/rec_${existing.id.toLowerCase()}`,
    timeline: [
      ...existing.timeline,
      {
        id: `t-${Date.now()}`,
        title: 'Recovery executed via Razorpay',
        description: `Action "${actionName || existing.recommendedAction}" executed successfully. Payment link generated and dispatched.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        status: 'completed',
      },
    ],
  };

  casesStore[targetIndex] = updatedCase;

  // Record audit log
  const newAuditLog: AuditLogEntry = {
    id: `AUD-${Math.floor(10000 + Math.random() * 90000)}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    caseId: existing.id,
    customerName: existing.customerName,
    action: actionName || existing.recommendedAction,
    amount: existing.amount,
    trigger: 'AI Policy Execution',
    result: 'Successful',
    policyEvaluated: existing.policyApplied || 'Automated Recovery Protocol',
    executionChannel: 'Razorpay API',
    actor: 'Automated Policy Engine',
  };

  auditLogsStore.unshift(newAuditLog);

  return {
    success: true,
    updatedCase,
    auditLog: newAuditLog,
  };
}

/**
 * 9. Escalate recovery case to operations queue
 * Backend Endpoint: POST /api/v1/recovery/cases/{id}/escalate
 */
export async function escalateRecoveryCase(
  caseId: string,
  reason = 'Requires manual merchant review'
): Promise<{ success: boolean; updatedCase: RecoveryCase }> {
  await simulateLatency(250);

  const targetIndex = casesStore.findIndex((c) => c.id === caseId);
  if (targetIndex === -1) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  const existing = casesStore[targetIndex];
  const updatedCase: RecoveryCase = {
    ...existing,
    status: 'escalated',
    updatedAt: 'Just now',
    timeline: [
      ...existing.timeline,
      {
        id: `t-${Date.now()}`,
        title: 'Case escalated to Ops',
        description: `Escalated by merchant: ${reason}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        status: 'completed',
      },
    ],
  };

  casesStore[targetIndex] = updatedCase;
  return { success: true, updatedCase };
}

/**
 * 10. Mark case as resolved
 * Backend Endpoint: POST /api/v1/recovery/cases/{id}/resolve
 */
export async function resolveRecoveryCase(
  caseId: string
): Promise<{ success: boolean; updatedCase: RecoveryCase }> {
  await simulateLatency(200);

  const targetIndex = casesStore.findIndex((c) => c.id === caseId);
  if (targetIndex === -1) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  const existing = casesStore[targetIndex];
  const updatedCase: RecoveryCase = {
    ...existing,
    status: 'recovered',
    updatedAt: 'Just now (Resolved)',
    timeline: [
      ...existing.timeline,
      {
        id: `t-${Date.now()}`,
        title: 'Manually marked resolved',
        description: 'Case closed and marked as recovered by merchant operator.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        status: 'completed',
      },
    ],
  };

  casesStore[targetIndex] = updatedCase;
  return { success: true, updatedCase };
}

/**
 * 11. Fetch audit logs
 * Backend Endpoint: GET /api/v1/recovery/audit-logs
 */
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  await simulateLatency(120);
  return [...auditLogsStore];
}

/**
 * 12. Fetch merchant policy guardrails
 * Backend Endpoint: GET /api/v1/recovery/guardrails
 */
export async function fetchPolicyGuardrails(): Promise<PolicyGuardrails> {
  await simulateLatency(100);
  return { ...guardrailsStore };
}

/**
 * 13. Trigger automated simulation run
 * Backend Endpoint: POST /api/v1/recovery/simulation/run
 */
export async function triggerSimulationRun(): Promise<SimulationResult> {
  await simulateLatency(400);
  return {
    transactionsAnalyzed: 148,
    recoveryOpportunitiesClassified: 42,
    recoveryActionsExecuted: 17,
    revenueRecovered: 72400,
    recoveryRate: 39.2,
    blockedActionsCount: 2,
    casesUpdated: 17,
  };
}
