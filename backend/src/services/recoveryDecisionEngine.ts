export interface DecisionCustomerContext {
  id?: string;
  name?: string;
  email?: string;
  tier?: string; // 'Enterprise' | 'Growth' | 'Standard' | 'High Risk'
  healthScore?: string; // 'Healthy' | 'Needs Attention' | 'High Risk'
  totalVolume?: number;
  totalSuccessfulPayments?: number;
  totalFailedPayments?: number;
  previousRecoveries?: number;
  recentFailuresCount?: number;
}

export interface DecisionInput {
  amount: number; // in INR
  currency?: string;
  paymentMethod?: string;
  declineCode?: string;
  declineReason?: string;
  failureReason?: string;
  cause?: string;
  customer?: DecisionCustomerContext;
  retryAttempts?: number;
  status?: string;
}

export interface GuardrailEvaluation {
  allowed: boolean;
  status: 'ALLOWED' | 'MANUAL_APPROVAL_REQUIRED' | 'BLOCKED';
  policy: string;
  reason: string;
  action: 'EXECUTE' | 'RECOMMEND' | 'MANUAL_REVIEW' | 'BLOCK' | 'ESCALATE';
}

export interface AIDecisionResult {
  recoveryProbability: number; // between 0.0 and 100.0 (1 decimal place)
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  failureCategory: string;
  strategy: string;
  recommendedAction: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reasoning: string[];
  whyExplanation: string;
  decisionExplanation: string;
  guardrail: GuardrailEvaluation;
  approvalStatus: string;
  isAutomated: boolean;
}

export class RecoveryDecisionEngine {
  /**
   * Evaluates a payment failure and returns a deterministic, explainable AI recovery decision.
   */
  public static evaluate(input: DecisionInput): AIDecisionResult {
    const {
      amount,
      declineCode = '',
      declineReason = '',
      failureReason = '',
      cause = '',
      customer = {},
      retryAttempts = 0,
      status = 'pending',
    } = input;

    // 1. Classify failure category
    const failureCategory = this.classifyFailureCategory(
      declineCode,
      declineReason,
      failureReason,
      cause
    );

    // 2. Compute dynamic recovery probability using weighted signals
    const { probability, reasoning } = this.calculateProbability(
      amount,
      failureCategory,
      customer,
      retryAttempts
    );

    // 3. Determine confidence level
    const confidenceLevel: 'High' | 'Medium' | 'Low' =
      probability >= 70 ? 'High' : probability >= 48 ? 'Medium' : 'Low';

    // 4. Select tailored recovery strategy & action
    const { strategy, recommendedAction, priority } = this.selectStrategy(
      failureCategory,
      amount,
      customer,
      probability
    );

    // 5. Evaluate policy guardrails
    const guardrail = this.evaluateGuardrails(
      amount,
      retryAttempts,
      customer,
      status,
      probability
    );

    // 6. Generate human-readable explanations
    const whyExplanation = this.buildWhyExplanation(
      failureCategory,
      customer,
      guardrail,
      recommendedAction
    );

    const decisionExplanation = this.buildDecisionExplanation(
      failureCategory,
      strategy,
      recommendedAction,
      guardrail,
      probability
    );

    const isAutomated = guardrail.allowed && guardrail.status === 'ALLOWED';
    const approvalStatus = isAutomated
      ? 'Automatically authorized'
      : guardrail.status === 'MANUAL_APPROVAL_REQUIRED'
      ? 'Requires manual merchant review'
      : 'Blocked by policy guardrail';

    return {
      recoveryProbability: probability,
      confidence: probability,
      confidenceLevel,
      failureCategory,
      strategy,
      recommendedAction: guardrail.allowed ? recommendedAction : 'Escalate to Ops',
      priority,
      reasoning,
      whyExplanation,
      decisionExplanation,
      guardrail,
      approvalStatus,
      isAutomated,
    };
  }

  /**
   * Deterministically classifies raw failure details into standardized categories
   */
  public static classifyFailureCategory(
    declineCode: string,
    declineReason: string,
    failureReason: string,
    cause: string
  ): string {
    const code = declineCode.toUpperCase();
    const raw = `${declineCode} ${declineReason} ${failureReason} ${cause}`.toLowerCase();

    // 1. Direct code matches take top priority
    if (code.includes('INSUFFICIENT')) return 'Insufficient Funds';
    if (code.includes('INTERNATIONAL')) return 'International Card';
    if (code.includes('LIMIT')) return 'Online Limit Exceeded';
    if (code.includes('GATEWAY') || code.includes('ISSUER') || code.includes('TIMEOUT')) return 'Gateway Decline';
    if (code.includes('CANCEL')) return 'Payment Cancelled';
    if (code.includes('EXPIRED')) return 'Card Expired';
    if (code.includes('AUTH') || code.includes('OTP') || code.includes('3DS')) return 'Authentication Failed';

    // 2. Text heuristics
    if (raw.includes('insufficient') || raw.includes('balance') || raw.includes('funds')) {
      return 'Insufficient Funds';
    }
    if (raw.includes('international') || raw.includes('cross-border') || raw.includes('forex')) {
      return 'International Card';
    }
    if (raw.includes('limit exceeded') || raw.includes('online limit') || raw.includes('daily limit') || raw.includes('per-transaction')) {
      return 'Online Limit Exceeded';
    }
    if (raw.includes('gateway') || raw.includes('issuer decline') || raw.includes('bank policy') || raw.includes('declined by bank') || raw.includes('declined by issuer') || raw.includes('timeout')) {
      return 'Gateway Decline';
    }
    if (raw.includes('cancelled') || raw.includes('canceled') || raw.includes('user cancelled')) {
      return 'Payment Cancelled';
    }
    if (raw.includes('expired card') || raw.includes('card expired')) {
      return 'Card Expired';
    }
    if (raw.includes('authentication') || raw.includes('otp') || raw.includes('3ds') || raw.includes('2fa')) {
      return 'Authentication Failed';
    }
    if (cause === 'subscription_failure' || raw.includes('subscription')) {
      return 'Subscription Failure';
    }
    if (cause === 'overdue_invoice' || raw.includes('invoice')) {
      return 'Overdue Invoice';
    }
    if (cause === 'checkout_abandonment' || raw.includes('abandon')) {
      return 'Checkout Abandonment';
    }

    return 'Payment Failure';
  }

  /**
   * Transparent scoring model calculating dynamic probability and reasoning bullets
   */
  private static calculateProbability(
    amount: number,
    category: string,
    customer: DecisionCustomerContext,
    retryAttempts: number
  ): { probability: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // Signal 1: Failure Category Baseline
    let baseScore = 70;
    switch (category) {
      case 'Insufficient Funds':
        baseScore = 78;
        reasoning.push('Insufficient Funds is highly recoverable through an alternate payment route or UPI');
        break;
      case 'Gateway Decline':
        baseScore = 82;
        reasoning.push('Gateway Decline / Issuer Timeout has high recovery propensity on scheduled retry');
        break;
      case 'Online Limit Exceeded':
        baseScore = 75;
        reasoning.push('Online Limit Exceeded is recoverable via split card payment or UPI intent link');
        break;
      case 'Authentication Failed':
        baseScore = 71;
        reasoning.push('Authentication / OTP timeout is recoverable via immediate 1-click re-authorization link');
        break;
      case 'International Card':
        baseScore = 65;
        reasoning.push('International Card authorization block is recoverable through domestic payment alternatives');
        break;
      case 'Payment Cancelled':
      case 'Checkout Abandonment':
        baseScore = 63;
        reasoning.push('Customer abandonment is recoverable via personalized WhatsApp/SMS recovery checkout link');
        break;
      case 'Card Expired':
        baseScore = 56;
        reasoning.push('Card Expired requires customer to update payment mandate or enter a new card');
        break;
      case 'Subscription Failure':
        baseScore = 68;
        reasoning.push('Subscription mandate failure can be recovered with mandate re-authorization');
        break;
      default:
        baseScore = 66;
        reasoning.push('Generic payment failure evaluated with standard telemetry heuristics');
        break;
    }

    let score = baseScore;

    // Signal 2: Customer Tier
    const tier = (customer.tier || 'Standard').toLowerCase();
    if (tier.includes('enterprise')) {
      score += 8;
      reasoning.push('Enterprise account tier reflects high historical settlement commitment (+8%)');
    } else if (tier.includes('growth')) {
      score += 4;
      reasoning.push('Growth account tier shows reliable transaction volume (+4%)');
    } else if (tier.includes('high risk')) {
      score -= 10;
      reasoning.push('High-risk merchant tier lowers baseline probability (-10%)');
    }

    // Signal 3: Customer Health Score
    const health = (customer.healthScore || 'Healthy').toLowerCase();
    if (health.includes('healthy')) {
      score += 6;
      reasoning.push('Customer account health is Healthy with zero recent default flags (+6%)');
    } else if (health.includes('needs attention')) {
      score -= 4;
      reasoning.push('Customer account health status Needs Attention (-4%)');
    } else if (health.includes('high risk') || health.includes('critical')) {
      score -= 14;
      reasoning.push('Customer account is marked High Risk due to multiple recent disputes (-14%)');
    }

    // Signal 4: Payment History (Successful vs Failed)
    const successfulTxns = customer.totalSuccessfulPayments ?? 6;
    if (successfulTxns >= 8) {
      score += 8;
      reasoning.push(`Strong payment history with ${successfulTxns} successfully completed prior transactions (+8%)`);
    } else if (successfulTxns >= 3) {
      score += 4;
      reasoning.push(`Consistent payment history with ${successfulTxns} completed transactions (+4%)`);
    }

    const pastFailures = customer.totalFailedPayments ?? customer.recentFailuresCount ?? 0;
    if (pastFailures >= 3) {
      score -= 9;
      reasoning.push(`Customer has ${pastFailures} recent failed payments within last 30 days (-9%)`);
    } else if (pastFailures >= 1) {
      score -= 3;
      reasoning.push(`Customer encountered ${pastFailures} previous payment decline (-3%)`);
    }

    // Signal 5: Previous Recovery Track Record
    const recoveries = customer.previousRecoveries ?? 1;
    if (recoveries >= 1) {
      score += 4;
      reasoning.push('Customer has previously completed payment recovery successfully (+4%)');
    }

    // Signal 6: Amount Risk Adjustments
    if (amount <= 1000) {
      score += 4;
      reasoning.push(`Micro-transaction amount (₹${amount.toLocaleString()}) has minimal payer friction (+4%)`);
    } else if (amount <= 10000) {
      score += 2;
      reasoning.push(`Standard transaction volume (₹${amount.toLocaleString()}) within normal debit limits (+2%)`);
    } else if (amount > 25000) {
      score -= 4;
      reasoning.push(`High-value transaction (₹${amount.toLocaleString()}) subject to stricter cardholder scrutiny (-4%)`);
    }

    // Signal 7: Retry Attempts Penalty
    if (retryAttempts > 0) {
      const penalty = retryAttempts * 8;
      score -= penalty;
      reasoning.push(`${retryAttempts} previous recovery attempts already executed (-${penalty}%)`);
    }

    // Strictly bound probability between 5.0% and 98.0%
    const boundedProbability = Math.max(5.0, Math.min(98.0, Number(score.toFixed(1))));

    return {
      probability: boundedProbability,
      reasoning,
    };
  }

  /**
   * Deterministically selects the optimal recovery strategy based on failure category and context
   */
  private static selectStrategy(
    category: string,
    amount: number,
    customer: DecisionCustomerContext,
    probability: number
  ): { strategy: string; recommendedAction: string; priority: 'urgent' | 'high' | 'medium' | 'low' } {
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
    if (amount >= 25000 || (customer.tier && customer.tier.includes('Enterprise'))) {
      priority = 'urgent';
    } else if (probability >= 75 || amount >= 10000) {
      priority = 'high';
    } else if (probability < 40) {
      priority = 'low';
    }

    switch (category) {
      case 'Insufficient Funds':
        return {
          strategy: 'Alternate Payment Method',
          recommendedAction: 'Create Payment Link',
          priority,
        };

      case 'Online Limit Exceeded':
        return {
          strategy: 'Split Payment Option',
          recommendedAction: 'Split Card Option',
          priority,
        };

      case 'Gateway Decline':
        return {
          strategy: 'Smart Backoff Retry',
          recommendedAction: 'Gateway Retry',
          priority,
        };

      case 'Card Expired':
        return {
          strategy: 'Payment Method Update',
          recommendedAction: 'Update Payment Method',
          priority,
        };

      case 'International Card':
        return {
          strategy: 'Alternate Domestic Route',
          recommendedAction: 'UPI Smart Link',
          priority,
        };

      case 'Authentication Failed':
        return {
          strategy: '1-Click Re-Authorization',
          recommendedAction: 'Create Payment Link',
          priority,
        };

      case 'Subscription Failure':
        return {
          strategy: 'Mandate Re-Authorization',
          recommendedAction: 'Update Payment Method',
          priority,
        };

      case 'Payment Cancelled':
      case 'Checkout Abandonment':
        return {
          strategy: 'Automated Checkout Link',
          recommendedAction: 'Create Payment Link',
          priority,
        };

      default:
        return {
          strategy: 'Create Payment Link',
          recommendedAction: 'Create Payment Link',
          priority,
        };
    }
  }

  /**
   * Evaluates merchant safety guardrails before execution
   */
  public static evaluateGuardrails(
    amount: number,
    retryAttempts: number,
    customer: DecisionCustomerContext,
    status: string,
    probability: number
  ): GuardrailEvaluation {
    // Rule 1: Settled cases cannot be re-executed
    if (status === 'recovered') {
      return {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Settled Case Lock',
        reason: 'Payment has already been captured and recovered. No further action permitted.',
        action: 'BLOCK',
      };
    }

    // Rule 2: Already escalated cases
    if (status === 'escalated') {
      return {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Ops Escalation Lock',
        reason: 'Case is currently assigned to merchant operations for manual intervention.',
        action: 'ESCALATE',
      };
    }

    // Rule 3: Maximum Retry Attempt Limit (Cap = 2 retries)
    if (retryAttempts >= 2) {
      return {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Recovery Attempt Limit',
        reason: `Maximum automated retry limit exceeded (${retryAttempts}/2 attempts). Escalating to operations to protect customer experience.`,
        action: 'ESCALATE',
      };
    }

    // Rule 4: Maximum Automated Amount Cap (Cap = ₹25,000)
    if (amount > 25000) {
      return {
        allowed: false,
        status: 'MANUAL_APPROVAL_REQUIRED',
        policy: 'Automated Recovery Amount Cap (₹25,000)',
        reason: `Transaction volume (₹${amount.toLocaleString()}) exceeds the ₹25,000 automated recovery threshold. Requires merchant authorization.`,
        action: 'MANUAL_REVIEW',
      };
    }

    // Rule 5: Customer High Risk & Low Probability Threshold
    const health = (customer.healthScore || '').toLowerCase();
    if (health.includes('high risk') && probability < 45) {
      return {
        allowed: false,
        status: 'MANUAL_APPROVAL_REQUIRED',
        policy: 'High-Risk Account Guardrail',
        reason: 'Customer flagged as high-risk with low recovery probability. Manual review recommended before issuing link.',
        action: 'MANUAL_REVIEW',
      };
    }

    // Rule 6: Normal Authorized Execution
    return {
      allowed: true,
      status: 'ALLOWED',
      policy: 'Automated High-Value Recovery Protocol',
      reason: `Transaction volume (₹${amount.toLocaleString()}) and retry count (${retryAttempts}/2) are within safety limits.`,
      action: 'EXECUTE',
    };
  }

  /**
   * Generates natural language summary of why the recommendation was made
   */
  private static buildWhyExplanation(
    category: string,
    customer: DecisionCustomerContext,
    guardrail: GuardrailEvaluation,
    action: string
  ): string {
    const health = customer.healthScore || 'Healthy';
    const tier = customer.tier || 'Standard';

    if (!guardrail.allowed && guardrail.status === 'MANUAL_APPROVAL_REQUIRED') {
      return `${category} detected on high-value transaction. Guardrail policy requires manual approval before dispatching ${action}.`;
    }

    if (!guardrail.allowed) {
      return `Automated recovery blocked: ${guardrail.reason}`;
    }

    return `Identified ${category} pattern on ${tier} account (${health} health). AI formulated ${action} as highest probability recovery route.`;
  }

  /**
   * Generates technical policy decision description
   */
  private static buildDecisionExplanation(
    category: string,
    strategy: string,
    action: string,
    guardrail: GuardrailEvaluation,
    probability: number
  ): string {
    return `AI Reasoner classified failure as '${category}'. Formulated strategy '${strategy}' with ${probability.toFixed(
      1
    )}% recovery likelihood. Guardrail status: ${guardrail.status} (${guardrail.policy}). Action: ${
      guardrail.allowed ? action : 'Escalate to Ops'
    }.`;
  }
}
