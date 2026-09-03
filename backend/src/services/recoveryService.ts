import { getDatabase } from '../db/database';
import { RecoveryDecisionEngine, GuardrailEvaluation } from './recoveryDecisionEngine';

export interface RecoveryFilterParams {
  status?: string;
  search?: string;
  customerId?: string;
}

export class RecoveryService {
  public static list(params: RecoveryFilterParams = {}) {
    const db = getDatabase();
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.status && params.status !== 'all') {
      conditions.push('r.status = ?');
      values.push(params.status);
    }

    if (params.customerId) {
      conditions.push('(r.customer_id = ? OR c.name = ?)');
      values.push(params.customerId, params.customerId);
    }

    if (params.search) {
      const s = `%${params.search}%`;
      conditions.push(
        '(r.id LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR r.reason LIKE ? OR r.recommended_action LIKE ? OR t.razorpay_payment_id LIKE ? OR t.razorpay_order_id LIKE ?)'
      );
      values.push(s, s, s, s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        r.id,
        r.transaction_id as transactionId,
        r.customer_id as customerId,
        c.name as customerName,
        c.email as customerEmail,
        c.tier as customerTier,
        c.health_score as customerHealthScore,
        r.amount,
        r.reason as cause,
        r.reason as causeLabel,
        t.failure_reason as issueDescription,
        r.strategy,
        r.status,
        r.created_at as createdAt,
        COALESCE(r.recovered_at, r.created_at) as updatedAt,
        r.recovered_at as recoveredAt,
        COALESCE(r.recovered_amount, CASE WHEN r.status = 'recovered' THEN r.amount ELSE 0 END) as recoveredAmount,
        COALESCE(r.retry_attempts, 0) as retryAttempts,
        2 as maxRetriesAllowed,
        r.last_attempt_at as lastAttemptAt,
        t.decline_code as declineCode,
        t.decline_reason as declineReason,
        t.failure_reason as failureReason,
        t.razorpay_payment_id as razorpayPaymentId,
        t.razorpay_order_id as razorpayOrderId,
        1 as contactCountLast7Days,
        r.ai_probability as aiProbability,
        r.recommended_action as recommendedAction,
        r.why_explanation as whyExplanation,
        'Past transaction telemetry evaluated' as customerHistoryText,
        r.decision_explanation as decisionExplanation,
        r.action_taken as actionTaken,
        r.policy_applied as policyApplied,
        r.approval_status as approvalStatus,
        r.is_automated as isAutomated,
        r.payment_link_url as paymentLinkUrl,
        r.timeline_json as timelineJson
      FROM recovery_events r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN transactions t ON r.transaction_id = t.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `;

    const rows = db.prepare(sql).all(...values) as any[];

    return rows.map((row) => {
      let timeline = [];
      if (row.timelineJson) {
        try {
          timeline = JSON.parse(row.timelineJson);
        } catch (e) {
          timeline = [];
        }
      }
      const { timelineJson, ...rest } = row;

      // Evaluate live decision signals and guardrails
      const decision = RecoveryDecisionEngine.evaluate({
        amount: rest.amount,
        declineCode: rest.declineCode,
        declineReason: rest.declineReason,
        failureReason: rest.failureReason,
        cause: rest.cause,
        customer: {
          id: rest.customerId,
          name: rest.customerName,
          email: rest.customerEmail,
          tier: rest.customerTier || 'Standard',
          healthScore: rest.customerHealthScore || 'Healthy',
        },
        retryAttempts: rest.retryAttempts || 0,
        status: rest.status,
      });

      const actualRecoveredAmount =
        rest.status === 'recovered' ? (rest.recoveredAmount > 0 ? rest.recoveredAmount : rest.amount) : 0;

      return {
        ...rest,
        isAutomated: Boolean(rest.isAutomated),
        timeline,
        aiProbability: rest.aiProbability || Math.round(decision.recoveryProbability),
        recommendedAction: rest.recommendedAction || decision.recommendedAction,
        strategy: rest.strategy || decision.strategy,
        reasoning: decision.reasoning,
        guardrail: decision.guardrail,
        confidenceLevel: decision.confidenceLevel,
        recoveredAmount: actualRecoveredAmount,
        revenueAtRisk: rest.amount,
      };
    });
  }

  public static getById(id: string) {
    const list = this.list({ search: id });
    return list.find((item) => item.id === id) || null;
  }

  /**
   * Execute a recovery action safely through policy guardrails.
   * Transitions state to 'in_progress' (Awaiting Payment), increments attempt count, and logs audit trail.
   * NEVER directly marks case as 'recovered'.
   */
  public static executeAction(
    id: string,
    actionName?: string,
    isManualAuth: boolean = false,
    actorName: string = 'Automated Policy Engine'
  ) {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const nowIso = new Date().toISOString();
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;

    // Rule 1: Settled Case Lock
    if (existing.status === 'recovered') {
      const guardrail: GuardrailEvaluation = {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Settled Case Lock',
        reason: 'Payment has already been captured and revenue recovered. Duplicate execution is prohibited.',
        action: 'BLOCK',
      };

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        actionName || existing.recommendedAction || 'Execute Recovery',
        existing.amount,
        'API Execution Blocked',
        'Blocked',
        guardrail.policy,
        guardrail.reason,
        'Policy Engine',
        'Automated Guardrail'
      );

      return {
        success: false,
        blocked: true,
        guardrail,
        error: guardrail.reason,
        updatedCase: existing,
      };
    }

    // Rule 2: Escalated Case Lock
    if (existing.status === 'escalated') {
      const guardrail: GuardrailEvaluation = {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Ops Escalation Lock',
        reason: 'Case is currently assigned to merchant operations for manual review. Automated dispatch is locked.',
        action: 'ESCALATE',
      };

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        actionName || existing.recommendedAction || 'Execute Recovery',
        existing.amount,
        'API Execution Blocked',
        'Blocked',
        guardrail.policy,
        guardrail.reason,
        'Policy Engine',
        'Automated Guardrail'
      );

      return {
        success: false,
        blocked: true,
        guardrail,
        error: guardrail.reason,
        updatedCase: existing,
      };
    }

    // Rule 3: Max Attempts Guardrail (Cap = 2 attempts)
    if (existing.retryAttempts >= 2) {
      const guardrail: GuardrailEvaluation = {
        allowed: false,
        status: 'BLOCKED',
        policy: 'Recovery Attempt Limit',
        reason: `Maximum automated recovery attempts reached (${existing.retryAttempts}/2). Escalating to operations to prevent customer fatigue.`,
        action: 'ESCALATE',
      };

      const blockedTimelineItem = {
        id: `t-${Date.now()}`,
        title: 'Action Blocked — Maximum Recovery Attempts Exceeded',
        description: guardrail.reason,
        timestamp: timeStr,
        status: 'blocked',
      };

      const updatedTimeline = [...(existing.timeline || []), blockedTimelineItem];

      db.prepare(`
        UPDATE recovery_events
        SET status = 'escalated',
            timeline_json = ?
        WHERE id = ?
      `).run(JSON.stringify(updatedTimeline), id);

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        actionName || existing.recommendedAction || 'Execute Recovery',
        existing.amount,
        'API Execution Blocked',
        'Blocked',
        guardrail.policy,
        guardrail.reason,
        'Policy Engine',
        'Automated Guardrail'
      );

      return {
        success: false,
        blocked: true,
        guardrail,
        error: guardrail.reason,
        updatedCase: this.getById(id),
      };
    }

    // Rule 4: ₹25,000 Amount Guardrail Check
    if (existing.amount > 25000 && !isManualAuth) {
      const guardrail: GuardrailEvaluation = {
        allowed: false,
        status: 'MANUAL_APPROVAL_REQUIRED',
        policy: 'Automated Recovery Amount Cap (₹25,000)',
        reason: `Transaction volume (₹${existing.amount.toLocaleString()}) exceeds the ₹25,000 automated recovery threshold. Requires explicit manual merchant authorization.`,
        action: 'MANUAL_REVIEW',
      };

      const blockedTimelineItem = {
        id: `t-${Date.now()}`,
        title: 'Action Held — Manual Authorization Required',
        description: guardrail.reason,
        timestamp: timeStr,
        status: 'blocked',
      };

      const updatedTimeline = [...(existing.timeline || []), blockedTimelineItem];

      db.prepare(`
        UPDATE recovery_events
        SET status = 'needs_review',
            timeline_json = ?
        WHERE id = ?
      `).run(JSON.stringify(updatedTimeline), id);

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        actionName || existing.recommendedAction || 'Execute Recovery',
        existing.amount,
        'Manual Approval Required',
        'Held for Review',
        guardrail.policy,
        guardrail.reason,
        'Policy Engine',
        'Automated Guardrail'
      );

      return {
        success: false,
        blocked: true,
        guardrail,
        error: guardrail.reason,
        updatedCase: this.getById(id),
      };
    }

    // Execution is Permitted!
    const newAttemptCount = existing.retryAttempts + 1;
    const paymentLink = existing.paymentLinkUrl || `https://rzp.io/i/rec_${id.toLowerCase()}`;
    const selectedAction = actionName || existing.recommendedAction || 'Create Payment Link';

    const dispatchedTimelineItem = {
      id: `t-${Date.now()}`,
      title: `Recovery attempt #${newAttemptCount} dispatched`,
      description: `Action "${selectedAction}" dispatched via Razorpay API. Awaiting customer payment. Link: ${paymentLink}`,
      timestamp: timeStr,
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), dispatchedTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'in_progress',
          retry_attempts = ?,
          last_attempt_at = ?,
          payment_link_url = ?,
          action_taken = ?,
          timeline_json = ?
      WHERE id = ?
    `).run(
      newAttemptCount,
      nowIso,
      paymentLink,
      selectedAction,
      JSON.stringify(updatedTimeline),
      id
    );

    // Record audit log
    const actor = isManualAuth ? 'Merchant Operator' : actorName;
    const trigger = isManualAuth ? 'Manual Authorization Execution' : 'API Execution';
    const policy = isManualAuth
      ? 'Manual Override Authorization Protocol'
      : (existing.policyApplied || 'Automated Recovery Protocol');

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, execution_channel, actor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      timeStr,
      existing.id,
      existing.customerName,
      selectedAction,
      existing.amount,
      trigger,
      'Dispatched / Awaiting Payment',
      policy,
      'Razorpay API',
      actor
    );

    const updatedCase = this.getById(id);
    return {
      success: true,
      status: 'in_progress',
      attemptNumber: newAttemptCount,
      updatedCase,
      auditLog: {
        id: auditId,
        timestamp: timeStr,
        caseId: existing.id,
        customerName: existing.customerName,
        action: selectedAction,
        amount: existing.amount,
        trigger,
        result: 'Dispatched / Awaiting Payment',
        policyEvaluated: policy,
        executionChannel: 'Razorpay API',
        actor,
      },
    };
  }

  /**
   * Records a failed recovery attempt.
   * If attempts reach 2, auto-escalates to ops.
   */
  public static recordFailedAttempt(
    id: string,
    failureReason: string = 'Payment retry authorization declined by issuer',
    actor: string = 'Razorpay Webhook Engine'
  ) {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;
    const currentAttempts = existing.retryAttempts;

    const failedTimelineItem = {
      id: `t-${Date.now()}`,
      title: `Recovery attempt #${currentAttempts || 1} failed`,
      description: `Payment not completed: ${failureReason}`,
      timestamp: timeStr,
      status: 'failed',
    };

    let updatedTimeline = [...(existing.timeline || []), failedTimelineItem];
    let nextStatus: string = 'pending';

    if (currentAttempts >= 2) {
      nextStatus = 'escalated';
      const escalationItem = {
        id: `t-${Date.now() + 1}`,
        title: 'Maximum Recovery Attempts Reached — Escalated',
        description: `Reached ${currentAttempts}/2 maximum recovery attempts. Case automatically assigned to merchant operations.`,
        timestamp: timeStr,
        status: 'completed',
      };
      updatedTimeline.push(escalationItem);

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        'Auto-Escalate to Ops',
        existing.amount,
        'Max Retries Exceeded',
        'Escalated to Ops',
        'Recovery Attempt Limit',
        'Reached 2/2 attempts',
        'Policy Engine',
        'Automated Circuit Breaker'
      );
    } else {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, execution_channel, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        timeStr,
        existing.id,
        existing.customerName,
        'Recovery Attempt Failed',
        existing.amount,
        'Payment Webhook',
        'Failed Attempt',
        existing.policyApplied || 'Automated Recovery Protocol',
        'Razorpay API',
        actor
      );
    }

    db.prepare(`
      UPDATE recovery_events
      SET status = ?,
          timeline_json = ?
      WHERE id = ?
    `).run(nextStatus, JSON.stringify(updatedTimeline), id);

    const updatedCase = this.getById(id);
    return {
      success: true,
      status: nextStatus,
      attempts: currentAttempts,
      updatedCase,
    };
  }

  public static escalate(id: string, reason: string = 'Requires manual merchant review') {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTimelineItem = {
      id: `t-${Date.now()}`,
      title: 'Case escalated to Ops',
      description: `Escalated by operator: ${reason}`,
      timestamp: timeStr,
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), newTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'escalated',
          timeline_json = ?
      WHERE id = ?
    `).run(JSON.stringify(updatedTimeline), id);

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, blocked_reason, execution_channel, actor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      timeStr,
      existing.id,
      existing.customerName,
      'Escalate to Ops',
      existing.amount,
      'Manual Escalation',
      'Escalated to Ops',
      'Merchant Operational Escalation',
      reason,
      'Dashboard UI',
      'Merchant Operator'
    );

    const updatedCase = this.getById(id);
    return {
      success: true,
      updatedCase,
    };
  }

  public static resolve(id: string) {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTimelineItem = {
      id: `t-${Date.now()}`,
      title: 'Payment recovered & settled',
      description: `Payment completed. ₹${existing.amount.toLocaleString()} credited to merchant.`,
      timestamp: timeStr,
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), newTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'recovered',
          recovered_amount = ?,
          recovered_at = ?,
          timeline_json = ?
      WHERE id = ?
    `).run(existing.amount, now, JSON.stringify(updatedTimeline), id);

    db.prepare(`
      UPDATE transactions
      SET status = 'captured'
      WHERE id = ?
    `).run(existing.transactionId);

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, execution_channel, actor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      timeStr,
      existing.id,
      existing.customerName,
      'Revenue Recovered',
      existing.amount,
      'Payment Settlement',
      'Successful',
      'Revenue Recovery Settlement Protocol',
      'Razorpay Settlement',
      'Settlement Engine'
    );

    const updatedCase = this.getById(id);
    return {
      success: true,
      updatedCase,
    };
  }

  public static getAuditLogs() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        id,
        timestamp,
        case_id as caseId,
        customer_name as customerName,
        action,
        amount,
        trigger_event as trigger,
        result,
        policy_evaluated as policyEvaluated,
        blocked_reason as blockedReason,
        execution_channel as executionChannel,
        actor
      FROM audit_logs
      ORDER BY id DESC
    `).all();

    return rows;
  }
}
