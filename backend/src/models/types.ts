export interface CustomerModel {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessType?: string;
  tier?: string;
  healthScore?: string;
  createdAt: string;
}

export type TransactionStatus = 'captured' | 'failed' | 'authorized' | 'refunded' | 'pending';
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'mandate';

export interface TransactionModel {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  declineCode?: string;
  declineReason?: string;
  failureReason?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
}

export type RecoveryStatus = 'recovered' | 'pending' | 'in_progress' | 'blocked' | 'escalated' | 'needs_review';

export interface RecoveryEventModel {
  id: string;
  transactionId: string;
  customerId: string;
  reason: string;
  status: RecoveryStatus;
  amount: number;
  strategy?: string;
  aiProbability?: number;
  recommendedAction?: string;
  whyExplanation?: string;
  decisionExplanation?: string;
  actionTaken?: string;
  policyApplied?: string;
  approvalStatus?: string;
  isAutomated?: boolean;
  paymentLinkUrl?: string;
  timelineJson?: string;
  createdAt: string;
  recoveredAt?: string;
}

export interface ChartDataPointModel {
  date: string;
  revenueAtRisk: number;
  revenueRecovered: number;
  recoveryRate: number;
}

export interface DashboardSummaryResponse {
  totalRevenue: number;
  revenueRecovered: number;
  revenueAtRisk: number;
  revenueLost: number;
  recoveryRate: number;
  affectedTransactions: number;
  affectedCustomers: number;
  activeCasesCount: number;
  casesRequiringAction: number;
  successfulRecoveriesCount: number;
  avgRecoveryTime: string;
  trendVsPrevious: number;
  period: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogModel {
  id: string;
  timestamp: string;
  caseId: string;
  customerName: string;
  action: string;
  amount: number;
  trigger: string;
  result: string;
  policyEvaluated: string;
  blockedReason?: string;
  executionChannel: string;
  actor: string;
}
