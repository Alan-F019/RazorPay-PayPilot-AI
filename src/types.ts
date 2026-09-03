export type NavigationTab = 
  | 'overview' 
  | 'cases' 
  | 'ai_recovery' 
  | 'customers' 
  | 'analytics';

export type CaseStatus = 'recovered' | 'pending' | 'in_progress' | 'blocked' | 'escalated' | 'needs_review';

export type RecoveryCause = 
  | 'payment_failure' 
  | 'checkout_abandonment' 
  | 'subscription_failure' 
  | 'overdue_invoice';

export type StrategyType = 
  | 'Create Payment Link'
  | 'Payment Retry' 
  | 'Retry Sequence' 
  | 'Send Reminder' 
  | 'Escalate'
  | 'Smart Backoff Retry'
  | 'Mandate Regeneration'
  | 'UPI Smart Link'
  | 'Alternate Domestic Route'
  | 'Payment Method Update'
  | 'Gateway Retry';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending' | 'failed' | 'blocked';
  metadata?: Record<string, string | number>;
}

export interface RecoveryCase {
  id: string; // e.g. "RP10482"
  customerName: string;
  customerEmail: string;
  customerId: string;
  amount: number; // in INR
  cause: RecoveryCause;
  causeLabel: string;
  issueDescription: string;
  strategy: StrategyType;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  declineCode?: string;
  declineReason?: string;
  failureReason?: string;
  failureCategory?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  retryAttempts: number;
  maxRetriesAllowed: number;
  contactCountLast7Days: number;
  recoveredAmount?: number;
  revenueAtRisk?: number;
  lastAttemptAt?: string;
  recoveredAt?: string;
  aiProbability: number; // e.g. 84.2 (%)
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  recommendedAction: string; // e.g. "Create Payment Link"
  whyExplanation: string; // e.g. "Strong customer payment history and a high-value recoverable payment failure."
  customerHistoryText: string; // e.g. "8 successful payments, 1 previous failure"
  decisionExplanation: string;
  actionTaken: string;
  policyApplied: string;
  approvalStatus: string;
  isAutomated: boolean;
  paymentLinkUrl?: string;
  recommendedNextAction?: string;
  reasoning?: string[];
  guardrail?: {
    allowed: boolean;
    status: 'ALLOWED' | 'MANUAL_APPROVAL_REQUIRED' | 'BLOCKED';
    policy: string;
    reason: string;
    action: string;
  };
  timeline: TimelineEvent[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  caseId: string;
  customerName: string;
  action: string;
  amount: number;
  trigger: string;
  result: 'Successful' | 'Delivered' | 'Blocked by policy' | 'Failed' | 'Pending Verification' | 'Escalated to Ops';
  policyEvaluated: string;
  blockedReason?: string;
  executionChannel: 'Razorpay API' | 'WhatsApp Business' | 'Email Gateway' | 'Merchant Webhook' | 'Internal Scheduler';
  actor: 'Automated Policy Engine' | 'Safety Circuit Breaker' | 'Manual Operator (ops@merchant.com)' | 'Merchant Operator';
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  totalVolume: number;
  totalAtRisk?: number;
  totalRecovered: number;
  recoveryRate: number;
  activeCasesCount?: number;
  failureCount?: number;
  contactCountLast7Days: number;
  contactLimit: number;
  tier: 'Enterprise' | 'Growth' | 'Standard' | 'Starter' | string;
  healthScore: 'Healthy' | 'Needs Attention' | 'High Risk' | string;
  lastActivity: string;
}

export interface PolicyGuardrails {
  maxRetryAttempts: number;
  maxAutomatedRecoveryAmount: number;
  customerContactLimit: number;
  contactLimitDays: number;
  escalationAfterFailedAttempts: number;
  smartRetryBackoffHours: number[];
  autoBlockHighRiskGatewayErrors: boolean;
  requireManualApprovalAboveAmount: number;
  activeWebhookEvents: string[];
  maxSingleRecoveryAmount?: number;
  maxRetriesPerInvoice?: number;
}

export interface CauseBreakdown {
  id: RecoveryCause;
  title: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface SimulationResult {
  transactionsAnalyzed: number;
  recoveryOpportunitiesClassified: number;
  recoveryActionsExecuted: number;
  revenueRecovered: number;
  recoveryRate: number;
  blockedActionsCount: number;
  casesUpdated: number;
}

// ---------------------------------------------------------------------------
// Backend Integration & Service Layer Contracts
// ---------------------------------------------------------------------------

export type DateRange = '7D' | '30D' | '90D' | 'Custom';

export interface DashboardMetrics {
  period: DateRange;
  revenueAtRisk: number;
  revenueRecovered: number;
  revenueLost: number;
  recoveryRate: number;
  previousPeriodRecoveryRate: number;
  activeCasesCount: number;
  casesRequiringAction: number;
  affectedTransactionsCount: number;
  affectedCustomersCount: number;
  avgRecoveryTime: string;
  successfulRecoveriesCount: number;
  trendVsPrevious: number;
  unrecoveredVolume: number;
  inProgressVolume: number;
}

export interface CaseFilterParams {
  status?: CaseStatus | 'all';
  searchQuery?: string;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
  period?: DateRange;
}

export interface CustomerFilterParams {
  tier?: string;
  searchQuery?: string;
  healthScore?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

