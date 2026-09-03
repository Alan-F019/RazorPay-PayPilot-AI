import { getDatabase } from '../db/database';
import { RecoveryDecisionEngine } from './recoveryDecisionEngine';

export interface WebhookPayload {
  entity?: string;
  account_id?: string;
  event: string;
  contains?: string[];
  payload?: {
    payment?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id?: string;
        invoice_id?: string;
        method?: string;
        email?: string;
        contact?: string;
        error_code?: string;
        error_description?: string;
        error_source?: string;
        error_step?: string;
        error_reason?: string;
        created_at?: number;
      };
    };
    order?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        receipt?: string;
        created_at?: number;
      };
    };
  };
  created_at?: number;
}

export class WebhookService {
  /**
   * Process Razorpay webhook payload idempotently
   */
  public static async processEvent(payload: WebhookPayload, rawEventId?: string) {
    const db = getDatabase();
    const eventType = payload.event;

    // Generate persistent unique event ID from payload
    const eventId =
      rawEventId ||
      `evt_${payload.created_at || Date.now()}_${payload.payload?.payment?.entity?.id || payload.payload?.order?.entity?.id || 'gen'}_${eventType}`;

    // 1. Persistent Idempotency Check in SQLite database
    const existingEvent = db
      .prepare('SELECT id FROM webhook_events WHERE event_id = ?')
      .get(eventId) as { id: string } | undefined;

    if (existingEvent) {
      console.log(`[Webhook] Duplicate event '${eventId}' detected. Safely skipping all state changes.`);
      return {
        success: true,
        message: 'Duplicate event ignored',
        eventId,
        duplicate: true,
      };
    }

    // Record event to webhook_events table to guarantee idempotency
    db.prepare(`
      INSERT INTO webhook_events (id, event_id, event_type, payload_json, processed_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      eventType,
      JSON.stringify(payload),
      new Date().toISOString()
    );

    // 2. Dispatch to dedicated event handlers
    switch (eventType) {
      case 'payment.failed':
        return this.handlePaymentFailed(payload);

      case 'payment.captured':
      case 'payment.authorized':
        return this.handlePaymentCaptured(payload);

      case 'order.paid':
        return this.handleOrderPaid(payload);

      default:
        console.log(`[Webhook] Unhandled event type '${eventType}'. Acknowledged without modification.`);
        this.recordAuditLog({
          caseId: 'SYSTEM',
          customerName: 'Razorpay Gateway',
          action: 'Unknown webhook event received',
          amount: 0,
          trigger: eventType,
          result: 'Delivered',
          policyEvaluated: 'Webhook Ingestion Pipeline',
        });
        return {
          success: true,
          message: `Event '${eventType}' acknowledged and ignored`,
          eventId,
        };
    }
  }

  /**
   * Handle payment.failed: creates/updates transaction, creates recovery event and audit log
   */
  private static handlePaymentFailed(payload: WebhookPayload) {
    const db = getDatabase();
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
      throw new Error('Malformed payment.failed webhook: Missing payment entity');
    }

    const amountInINR = payment.amount ? payment.amount / 100 : 0;
    const paymentId = payment.id;
    const orderId = payment.order_id || `order_${paymentId.slice(-8)}`;
    const email = payment.email || 'customer@example.com';
    const phone = payment.contact || '+91 98765 43210';
    const nowIso = new Date().toISOString();

    // 1. Find or create Customer
    let customer = db.prepare('SELECT id, name, email FROM customers WHERE email = ?').get(email) as any;
    if (!customer) {
      const custId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      db.prepare(`
        INSERT INTO customers (id, name, email, phone, business_type, tier, health_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(custId, name, email, phone, 'Test Account', 'Standard', 'Needs Attention', nowIso);
      customer = { id: custId, name, email };
    }

    // 2. Find or create Transaction
    const txnId = `txn_${paymentId.toLowerCase()}`;
    let txn = db.prepare('SELECT id FROM transactions WHERE id = ? OR razorpay_payment_id = ?').get(txnId, paymentId) as any;

    if (!txn) {
      db.prepare(`
        INSERT INTO transactions (
          id, customer_id, amount, currency, status, payment_method,
          decline_code, decline_reason, failure_reason,
          razorpay_payment_id, razorpay_order_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txnId,
        customer.id,
        amountInINR,
        payment.currency || 'INR',
        'failed',
        payment.method || 'card',
        payment.error_code || 'PAYMENT_FAILED',
        payment.error_description || payment.error_reason || 'Card declined by issuer',
        payment.error_description || 'Payment failed during test checkout',
        paymentId,
        orderId,
        nowIso
      );
    } else {
      db.prepare(`
        UPDATE transactions
        SET status = 'failed',
            decline_code = ?,
            decline_reason = ?,
            failure_reason = ?,
            razorpay_payment_id = ?,
            razorpay_order_id = ?
        WHERE id = ?
      `).run(
        payment.error_code || 'PAYMENT_FAILED',
        payment.error_description || 'Payment declined',
        payment.error_description || 'Payment failed',
        paymentId,
        orderId,
        txn.id
      );
    }

    // 3. Create or update RecoveryEvent
    const caseId = `RP${Math.floor(10000 + Math.random() * 90000)}`;
    let recovery = db.prepare('SELECT id FROM recovery_events WHERE transaction_id = ?').get(txnId) as any;

    if (!recovery) {
      // Query customer transaction stats for AI evaluation
      const custStats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'captured' THEN 1 END) as successfulTxns,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedTxns
        FROM transactions
        WHERE customer_id = ?
      `).get(customer.id) as any;

      const custRecoveries = db.prepare(`
        SELECT COUNT(*) as recoveredCases
        FROM recovery_events
        WHERE customer_id = ? AND status = 'recovered'
      `).get(customer.id) as any;

      const fullCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as any;

      // Run AI Revenue Recovery Decision Engine
      const aiDecision = RecoveryDecisionEngine.evaluate({
        amount: amountInINR,
        currency: payment.currency || 'INR',
        paymentMethod: payment.method || 'card',
        declineCode: payment.error_code || 'GATEWAY_ERROR',
        declineReason: payment.error_description || payment.error_reason || 'Payment declined',
        failureReason: payment.error_description || 'Payment failed during checkout',
        cause: 'payment_failure',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          tier: fullCustomer?.tier || 'Standard',
          healthScore: fullCustomer?.health_score || 'Healthy',
          totalSuccessfulPayments: custStats?.successfulTxns ?? 6,
          totalFailedPayments: custStats?.failedTxns ?? 0,
          previousRecoveries: custRecoveries?.recoveredCases ?? 1,
        },
        retryAttempts: 0,
        status: 'pending',
      });

      const timeline = [
        {
          id: 't-1',
          title: 'Payment initiated',
          description: `Checkout started for ₹${amountInINR.toLocaleString()} on Razorpay Test Checkout`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        },
        {
          id: 't-2',
          title: 'Payment failed',
          description: `Razorpay webhook: ${paymentId} declined with ${payment.error_code || 'GATEWAY_ERROR'}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        },
        {
          id: 't-3',
          title: 'Webhook received & verified',
          description: 'Inbound payment.failed validated via HMAC-SHA256 signature',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        },
        {
          id: 't-4',
          title: 'AI recovery strategy formulated',
          description: `Formulated "${aiDecision.recommendedAction}" (${aiDecision.recoveryProbability}% likelihood). Guardrail: ${aiDecision.guardrail.status}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        },
      ];

      const initialStatus = aiDecision.guardrail.allowed ? 'pending' : (aiDecision.guardrail.status === 'MANUAL_APPROVAL_REQUIRED' ? 'needs_review' : 'escalated');

      db.prepare(`
        INSERT INTO recovery_events (
          id, transaction_id, customer_id, reason, status, amount, strategy,
          ai_probability, recommended_action, why_explanation, decision_explanation,
          action_taken, policy_applied, approval_status, is_automated,
          payment_link_url, timeline_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        caseId,
        txnId,
        customer.id,
        'payment_failure',
        initialStatus,
        amountInINR,
        aiDecision.strategy,
        Math.round(aiDecision.recoveryProbability),
        aiDecision.recommendedAction,
        aiDecision.whyExplanation,
        aiDecision.decisionExplanation,
        'Recovery Decision Generated',
        aiDecision.guardrail.policy,
        aiDecision.approvalStatus,
        aiDecision.isAutomated ? 1 : 0,
        `https://rzp.io/i/rec_${caseId.toLowerCase()}`,
        JSON.stringify(timeline),
        nowIso
      );
    }

    // 4. Record Audit Log for initial failure ingestion
    this.recordAuditLog({
      caseId: recovery ? recovery.id : caseId,
      customerName: customer.name,
      action: 'Payment failed received',
      amount: amountInINR,
      trigger: 'payment.failed',
      result: 'Successful',
      policyEvaluated: 'Automated Recovery Protocol',
    });

    return {
      success: true,
      caseId: recovery ? recovery.id : caseId,
      transactionId: txnId,
      status: 'recovery_created',
    };
  }

  /**
   * Handle payment.captured / payment.authorized
   * Only resolves the specific active RecoveryEvent linked to this transaction.
   */
  private static handlePaymentCaptured(payload: WebhookPayload) {
    const db = getDatabase();
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
      throw new Error('Malformed payment.captured webhook: Missing payment entity');
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const amountInINR = payment.amount ? payment.amount / 100 : 0;
    const nowIso = new Date().toISOString();

    // 1. Find matching transaction
    let txn = db
      .prepare('SELECT id, customer_id FROM transactions WHERE razorpay_payment_id = ? OR razorpay_order_id = ? OR id = ?')
      .get(paymentId, orderId || '', `txn_${paymentId.toLowerCase()}`) as any;

    if (txn) {
      db.prepare(`UPDATE transactions SET status = 'captured' WHERE id = ?`).run(txn.id);

      // 2. Only resolve an existing active RecoveryEvent genuinely associated with this specific transaction
      const recovery = db
        .prepare(`SELECT id, timeline_json, status FROM recovery_events WHERE transaction_id = ? AND status != 'recovered'`)
        .get(txn.id) as any;

      if (recovery) {
        let timeline = [];
        try {
          timeline = JSON.parse(recovery.timeline_json || '[]');
        } catch {}

        timeline.push({
          id: `t-${Date.now()}`,
          title: 'Razorpay Test Payment Captured',
          description: `Customer completed checkout. ₹${amountInINR.toLocaleString()} revenue recovered.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        });

        db.prepare(`
          UPDATE recovery_events
          SET status = 'recovered',
              recovered_amount = ?,
              recovered_at = ?,
              timeline_json = ?
          WHERE id = ?
        `).run(amountInINR, nowIso, JSON.stringify(timeline), recovery.id);

        this.recordAuditLog({
          caseId: recovery.id,
          customerName: 'Customer',
          action: 'Revenue Recovered',
          amount: amountInINR,
          trigger: payload.event,
          result: 'Successful',
          policyEvaluated: 'Revenue Recovery Settlement Protocol',
        });
      }
    } else {
      this.recordAuditLog({
        caseId: 'SYSTEM',
        customerName: 'Razorpay Gateway',
        action: 'Payment captured',
        amount: amountInINR,
        trigger: payload.event,
        result: 'Successful',
        policyEvaluated: 'Payment Settlement Protocol',
      });
    }

    return {
      success: true,
      paymentId,
      status: 'payment_captured',
    };
  }

  /**
   * Handle order.paid
   * Only resolves the specific active RecoveryEvent linked to this order's transaction.
   */
  private static handleOrderPaid(payload: WebhookPayload) {
    const db = getDatabase();
    const order = payload.payload?.order?.entity;

    if (!order) {
      throw new Error('Malformed order.paid webhook: Missing order entity');
    }

    const orderId = order.id;
    const amountInINR = order.amount ? order.amount / 100 : 0;
    const nowIso = new Date().toISOString();

    const txn = db.prepare('SELECT id FROM transactions WHERE razorpay_order_id = ?').get(orderId) as any;

    if (txn) {
      db.prepare(`UPDATE transactions SET status = 'captured' WHERE id = ?`).run(txn.id);

      // Only resolve recovery event if active and associated with this transaction
      const recovery = db
        .prepare(`SELECT id, timeline_json, status FROM recovery_events WHERE transaction_id = ? AND status != 'recovered'`)
        .get(txn.id) as any;

      if (recovery) {
        let timeline = [];
        try {
          timeline = JSON.parse(recovery.timeline_json || '[]');
        } catch {}

        timeline.push({
          id: `t-${Date.now()}`,
          title: 'Order settlement confirmed',
          description: `Order ${orderId} marked paid. Case successfully recovered.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'completed',
        });

        db.prepare(`
          UPDATE recovery_events
          SET status = 'recovered',
              recovered_at = ?,
              timeline_json = ?
          WHERE id = ?
        `).run(nowIso, JSON.stringify(timeline), recovery.id);
      }
    }

    this.recordAuditLog({
      caseId: orderId,
      customerName: 'Customer',
      action: 'Order paid',
      amount: amountInINR,
      trigger: 'order.paid',
      result: 'Successful',
      policyEvaluated: 'Order Settlement Protocol',
    });

    return {
      success: true,
      orderId,
      status: 'order_paid',
    };
  }

  /**
   * Record entry in immutable audit_logs table
   */
  public static recordAuditLog(params: {
    caseId: string;
    customerName: string;
    action: string;
    amount: number;
    trigger: string;
    result: string;
    policyEvaluated: string;
    blockedReason?: string;
  }) {
    const db = getDatabase();
    const auditId = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, case_id, customer_name, action, amount,
        trigger_event, result, policy_evaluated, blocked_reason,
        execution_channel, actor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      timestamp,
      params.caseId,
      params.customerName,
      params.action,
      params.amount,
      params.trigger,
      params.result,
      params.policyEvaluated,
      params.blockedReason || null,
      'Razorpay Webhook',
      'Automated Policy Engine'
    );
  }
}
