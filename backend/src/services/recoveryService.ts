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
      conditions.push('(r.id LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR r.reason LIKE ? OR r.recommended_action LIKE ?)');
      values.push(s, s, s, s, s);
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
        t.decline_code as declineCode,
        t.decline_reason as declineReason,
        t.failure_reason as failureReason,
        t.razorpay_payment_id as razorpayPaymentId,
        t.razorpay_order_id as razorpayOrderId,
        1 as retryAttempts,
        2 as maxRetriesAllowed,
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
      };
    });
  }

  public static getById(id: string) {
    const list = this.list({ search: id });
    return list.find((item) => item.id === id) || null;
  }

  public static executeAction(id: string, actionName?: string) {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    // 1. Guardrail Safety Evaluation prior to execution
    const guardrail: GuardrailEvaluation = RecoveryDecisionEngine.evaluateGuardrails(
      existing.amount,
      existing.retryAttempts || 0,
      {
        id: existing.customerId,
        name: existing.customerName,
        email: existing.customerEmail,
        tier: existing.customerTier,
        healthScore: existing.customerHealthScore,
      },
      existing.status,
      existing.aiProbability
    );

    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;

    if (!guardrail.allowed) {
      // Guardrail Blocked / Manual Approval Required
      const blockedTimelineItem = {
        id: `t-${Date.now()}`,
        title: `Action Blocked by Guardrail (${guardrail.policy})`,
        description: guardrail.reason,
        timestamp: timeStr,
        status: 'blocked',
      };

      const updatedTimeline = [...(existing.timeline || []), blockedTimelineItem];
      const newStatus = guardrail.status === 'MANUAL_APPROVAL_REQUIRED' ? 'needs_review' : 'escalated';

      db.prepare(`
        UPDATE recovery_events
        SET status = ?,
            timeline_json = ?
        WHERE id = ?
      `).run(newStatus, JSON.stringify(updatedTimeline), id);

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

      const updatedCase = this.getById(id);
      return {
        success: false,
        blocked: true,
        guardrail,
        error: guardrail.reason,
        updatedCase,
        auditLog: {
          id: auditId,
          timestamp: timeStr,
          caseId: existing.id,
          customerName: existing.customerName,
          action: actionName || existing.recommendedAction,
          amount: existing.amount,
          trigger: 'API Execution Blocked',
          result: 'Blocked',
          policyEvaluated: guardrail.policy,
          blockedReason: guardrail.reason,
          executionChannel: 'Policy Engine',
          actor: 'Automated Guardrail',
        },
      };
    }

    // 2. Allowed - Dispatch and record action
    const paymentLink = existing.paymentLinkUrl || `https://rzp.io/i/rec_${id.toLowerCase()}`;
    const newTimelineItem = {
      id: `t-${Date.now()}`,
      title: 'Recovery dispatched via Razorpay API',
      description: `Action "${actionName || existing.recommendedAction}" dispatched. Payment link: ${paymentLink}`,
      timestamp: timeStr,
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), newTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'recovered',
          recovered_at = ?,
          payment_link_url = ?,
          action_taken = ?,
          timeline_json = ?
      WHERE id = ?
    `).run(
      now,
      paymentLink,
      actionName || 'Payment Link Generated & Delivered',
      JSON.stringify(updatedTimeline),
      id
    );

    // Also update transaction status to captured
    db.prepare(`
      UPDATE transactions
      SET status = 'captured'
      WHERE id = ?
    `).run(existing.transactionId);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, execution_channel, actor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      timeStr,
      existing.id,
      existing.customerName,
      actionName || existing.recommendedAction || 'Execute Recovery',
      existing.amount,
      'API Execution',
      'Successful',
      guardrail.policy,
      'Razorpay API',
      'Automated Policy Engine'
    );

    const updatedCase = this.getById(id);
    return {
      success: true,
      updatedCase,
      guardrail,
      auditLog: {
        id: auditId,
        timestamp: timeStr,
        caseId: existing.id,
        customerName: existing.customerName,
        action: actionName || existing.recommendedAction,
        amount: existing.amount,
        trigger: 'API Execution',
        result: 'Successful',
        policyEvaluated: guardrail.policy,
        executionChannel: 'Razorpay API',
        actor: 'Automated Policy Engine',
      },
    };
  }

  public static escalate(id: string, reason: string = 'Requires manual merchant review') {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Recovery case #${id} not found`);
    }

    const newTimelineItem = {
      id: `t-${Date.now()}`,
      title: 'Case escalated to Ops',
      description: `Escalated by operator: ${reason}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), newTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'escalated',
          timeline_json = ?
      WHERE id = ?
    `).run(JSON.stringify(updatedTimeline), id);

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
    const newTimelineItem = {
      id: `t-${Date.now()}`,
      title: 'Manually marked resolved',
      description: 'Case closed and marked as recovered in database.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'completed',
    };

    const updatedTimeline = [...(existing.timeline || []), newTimelineItem];

    db.prepare(`
      UPDATE recovery_events
      SET status = 'recovered',
          recovered_at = ?,
          timeline_json = ?
      WHERE id = ?
    `).run(now, JSON.stringify(updatedTimeline), id);

    db.prepare(`
      UPDATE transactions
      SET status = 'captured'
      WHERE id = ?
    `).run(existing.transactionId);

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
