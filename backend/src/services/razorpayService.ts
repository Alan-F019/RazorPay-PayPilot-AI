import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config/env';
import { getDatabase } from '../db/database';
import { RecoveryDecisionEngine } from './recoveryDecisionEngine';

export interface CreateOrderParams {
  amount: number; // in smallest currency unit (e.g. paise for INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface SyncResult {
  success: boolean;
  count: number;
  inserted: number;
  updated: number;
  skipped: number;
  recoveryCreated: number;
  recoveryResolved: number;
  error?: string;
  isSimulated?: boolean;
}

export class RazorpayService {
  private static instance: Razorpay | null = null;

  public static getClient(): Razorpay {
    if (!this.instance) {
      this.instance = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
    return this.instance;
  }

  /**
   * Create Razorpay test order
   */
  public static async createOrder(params: CreateOrderParams) {
    const client = this.getClient();
    const currency = params.currency || 'INR';

    try {
      const order = await client.orders.create({
        amount: params.amount,
        currency,
        receipt: params.receipt || `rcpt_${Date.now()}`,
        notes: params.notes || {},
      });

      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at,
      };
    } catch (error: any) {
      // If running with placeholder test keys without network connectivity, provide safe simulated fallback
      if (
        config.razorpay.keyId === 'rzp_test_placeholder_key' ||
        error.statusCode === 401 ||
        error.error?.code === 'BAD_REQUEST_ERROR'
      ) {
        const fallbackId = `order_test_${Date.now().toString(36)}`;
        return {
          id: fallbackId,
          amount: params.amount,
          currency,
          receipt: params.receipt || `rcpt_${Date.now()}`,
          status: 'created',
          createdAt: Math.floor(Date.now() / 1000),
          isSimulated: true,
        };
      }
      throw new Error(`Razorpay Order Creation Failed: ${error.message || error.description || 'Unknown error'}`);
    }
  }

  /**
   * Fetch list of payments from Razorpay Test Mode API
   */
  public static async fetchPaymentsList(options: { count?: number; skip?: number; from?: number; to?: number } = {}) {
    const client = this.getClient();

    try {
      const response = await (client.payments as any).all({
        count: options.count || 50,
        skip: options.skip || 0,
        from: options.from,
        to: options.to,
      });

      return {
        success: true,
        count: response.items ? response.items.length : 0,
        items: response.items || [],
      };
    } catch (error: any) {
      console.warn(`[RazorpaySync] Payments list fetch returned: ${error.message || 'Authentication/API error'}`);
      return {
        success: false,
        count: 0,
        items: [],
        error: error.message || 'Unable to fetch payments from Razorpay API',
        isSimulated: true,
      };
    }
  }

  /**
   * Synchronize Razorpay payments into SQLite database idempotently
   */
  public static async syncLivePayments(rawPayments?: any[]): Promise<SyncResult> {
    let paymentsToSync: any[] = [];
    let isSimulated = false;

    if (rawPayments && Array.isArray(rawPayments)) {
      paymentsToSync = rawPayments;
    } else {
      const fetchResult = await this.fetchPaymentsList({ count: 50 });
      paymentsToSync = fetchResult.items;
      isSimulated = Boolean(fetchResult.isSimulated);
    }

    const db = getDatabase();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let recoveryCreated = 0;
    let recoveryResolved = 0;

    for (const payment of paymentsToSync) {
      if (!payment || !payment.id) continue;

      const paymentId = payment.id;
      const amountInINR = payment.amount ? payment.amount / 100 : 0;
      const orderId = payment.order_id || null;
      const email = payment.email || 'customer@example.com';
      const phone = payment.contact || '+91 98765 43210';
      const status = payment.status || 'captured';
      const method = payment.method || 'card';
      const declineCode = payment.error_code || (status === 'failed' ? 'PAYMENT_FAILED' : null);
      const declineReason = payment.error_description || (status === 'failed' ? 'Payment declined by issuer' : null);
      const failureReason = payment.error_reason || payment.error_description || (status === 'failed' ? 'Payment failed during checkout' : null);
      const createdAtIso = payment.created_at
        ? new Date(typeof payment.created_at === 'number' && payment.created_at < 1e11 ? payment.created_at * 1000 : payment.created_at).toISOString()
        : new Date().toISOString();

      // 1. Find or create Customer
      let customer = db.prepare('SELECT id, name, email FROM customers WHERE email = ?').get(email) as any;
      if (!customer) {
        const custId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
        const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        db.prepare(`
          INSERT INTO customers (id, name, email, phone, business_type, tier, health_score, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(custId, name, email, phone, 'Merchant Account', 'Standard', 'Healthy', createdAtIso);
        customer = { id: custId, name, email };
      }

      // 2. Find existing transaction
      const txnId = `txn_${paymentId.toLowerCase()}`;
      let txn = db.prepare('SELECT id, status, customer_id FROM transactions WHERE id = ? OR razorpay_payment_id = ?').get(txnId, paymentId) as any;

      if (!txn) {
        // Insert new transaction
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
          status,
          method,
          declineCode,
          declineReason,
          failureReason,
          paymentId,
          orderId,
          createdAtIso
        );
        inserted++;

        // If failed payment, formulate dynamic AI recovery event
        if (status === 'failed') {
          const caseId = `RP${Math.floor(10000 + Math.random() * 90000)}`;
          const fullCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as any;
          const custStats = db.prepare(`
            SELECT 
              COUNT(CASE WHEN status = 'captured' THEN 1 END) as successfulTxns,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedTxns
            FROM transactions
            WHERE customer_id = ?
          `).get(customer.id) as any;

          const aiDecision = RecoveryDecisionEngine.evaluate({
            amount: amountInINR,
            currency: payment.currency || 'INR',
            paymentMethod: method,
            declineCode: declineCode || 'GATEWAY_ERROR',
            declineReason: declineReason || 'Payment declined',
            failureReason: failureReason || 'Payment failed during checkout',
            cause: 'payment_failure',
            customer: {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              tier: fullCustomer?.tier || 'Standard',
              healthScore: fullCustomer?.health_score || 'Healthy',
              totalSuccessfulPayments: custStats?.successfulTxns ?? 5,
              totalFailedPayments: custStats?.failedTxns ?? 0,
              previousRecoveries: 1,
            },
            retryAttempts: 0,
            status: 'pending',
          });

          const initialStatus = aiDecision.guardrail.allowed ? 'pending' : (aiDecision.guardrail.status === 'MANUAL_APPROVAL_REQUIRED' ? 'needs_review' : 'escalated');
          const timeline = [
            {
              id: 't-1',
              title: 'Payment initiated',
              description: `Checkout started for ₹${amountInINR.toLocaleString()} via Razorpay API`,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              status: 'completed',
            },
            {
              id: 't-2',
              title: 'Payment failed',
              description: `Razorpay payment ${paymentId} failed: ${declineCode || 'PAYMENT_FAILED'}`,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              status: 'completed',
            },
            {
              id: 't-3',
              title: 'AI recovery strategy formulated',
              description: `Formulated "${aiDecision.recommendedAction}" (${aiDecision.recoveryProbability}% likelihood). Guardrail: ${aiDecision.guardrail.status}`,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              status: 'completed',
            },
          ];

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
            createdAtIso
          );
          recoveryCreated++;
        }
      } else {
        // Transaction already exists
        const statusChanged = txn.status !== status;

        if (statusChanged) {
          db.prepare(`
            UPDATE transactions
            SET status = ?,
                decline_code = COALESCE(?, decline_code),
                decline_reason = COALESCE(?, decline_reason),
                failure_reason = COALESCE(?, failure_reason),
                razorpay_order_id = COALESCE(?, razorpay_order_id)
            WHERE id = ?
          `).run(status, declineCode, declineReason, failureReason, orderId, txn.id);
          updated++;

          // If transition is failed -> captured, resolve active recovery case
          if ((status === 'captured' || status === 'authorized') && txn.status === 'failed') {
            const recovery = db.prepare(`
              SELECT id, timeline_json, status FROM recovery_events WHERE transaction_id = ? AND status != 'recovered'
            `).get(txn.id) as any;

            if (recovery) {
              let timeline = [];
              try {
                timeline = JSON.parse(recovery.timeline_json || '[]');
              } catch {}

              timeline.push({
                id: `t-${Date.now()}`,
                title: 'Razorpay Payment Captured (API Synced)',
                description: `Live settlement confirmed via Razorpay API sync. ₹${amountInINR.toLocaleString()} recovered.`,
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
              `).run(amountInINR, new Date().toISOString(), JSON.stringify(timeline), recovery.id);

              const auditId = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
              db.prepare(`
                INSERT INTO audit_logs (id, timestamp, case_id, customer_name, action, amount, trigger_event, result, policy_evaluated, execution_channel, actor)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                auditId,
                new Date().toLocaleTimeString('en-US', { hour12: false }),
                recovery.id,
                customer.name,
                'Revenue Recovered (API Sync)',
                amountInINR,
                'razorpay.api.sync',
                'Successful',
                'Revenue Recovery Settlement Protocol',
                'Razorpay API Sync',
                'Automated Sync Engine'
              );
              recoveryResolved++;
            }
          }
        } else {
          // Status has not changed
          skipped++;

          // For failed payment, ensure recovery event exists if missing
          if (status === 'failed') {
            const existingRecovery = db.prepare('SELECT id FROM recovery_events WHERE transaction_id = ?').get(txn.id) as any;
            if (!existingRecovery) {
              const caseId = `RP${Math.floor(10000 + Math.random() * 90000)}`;
              const fullCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as any;
              const aiDecision = RecoveryDecisionEngine.evaluate({
                amount: amountInINR,
                currency: payment.currency || 'INR',
                paymentMethod: method,
                declineCode: declineCode || 'GATEWAY_ERROR',
                declineReason: declineReason || 'Payment declined',
                failureReason: failureReason || 'Payment failed during checkout',
                cause: 'payment_failure',
                customer: {
                  id: customer.id,
                  name: customer.name,
                  email: customer.email,
                  tier: fullCustomer?.tier || 'Standard',
                  healthScore: fullCustomer?.health_score || 'Healthy',
                  totalSuccessfulPayments: 5,
                  totalFailedPayments: 0,
                  previousRecoveries: 1,
                },
                retryAttempts: 0,
                status: 'pending',
              });

              db.prepare(`
                INSERT INTO recovery_events (
                  id, transaction_id, customer_id, reason, status, amount, strategy,
                  ai_probability, recommended_action, why_explanation, decision_explanation,
                  action_taken, policy_applied, approval_status, is_automated,
                  payment_link_url, timeline_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                caseId,
                txn.id,
                customer.id,
                'payment_failure',
                'pending',
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
                JSON.stringify([]),
                createdAtIso
              );
              recoveryCreated++;
            }
          }
        }
      }
    }

    return {
      success: true,
      count: paymentsToSync.length,
      inserted,
      updated,
      skipped,
      recoveryCreated,
      recoveryResolved,
      isSimulated,
    };
  }

  /**
   * Fetch single payment details by ID
   */
  public static async fetchPayment(paymentId: string) {
    const client = this.getClient();

    try {
      const payment = await client.payments.fetch(paymentId);
      return {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        createdAt: payment.created_at,
      };
    } catch (error: any) {
      if (
        config.razorpay.keyId === 'rzp_test_placeholder_key' ||
        error.statusCode === 400 ||
        error.statusCode === 401 ||
        error.statusCode === 404 ||
        error.error?.code === 'BAD_REQUEST_ERROR'
      ) {
        return {
          id: paymentId,
          orderId: `order_test_${paymentId.slice(-6)}`,
          amount: 499900,
          currency: 'INR',
          status: 'failed',
          method: 'card',
          errorCode: 'BAD_REQUEST_ERROR',
          errorDescription: 'Payment failed due to card decline in test mode',
          createdAt: Math.floor(Date.now() / 1000),
          isSimulated: true,
        };
      }
      throw new Error(`Failed to fetch Razorpay payment '${paymentId}': ${error.message || 'API error'}`);
    }
  }

  /**
   * Fetch single order details by ID
   */
  public static async fetchOrder(orderId: string) {
    const client = this.getClient();

    try {
      const order = await client.orders.fetch(orderId);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at,
      };
    } catch (error: any) {
      if (
        config.razorpay.keyId === 'rzp_test_placeholder_key' ||
        error.statusCode === 401 ||
        error.statusCode === 404
      ) {
        return {
          id: orderId,
          amount: 50000,
          currency: 'INR',
          receipt: 'rcpt_test_fallback',
          status: 'created',
          createdAt: Math.floor(Date.now() / 1000),
          isSimulated: true,
        };
      }
      throw new Error(`Failed to fetch Razorpay order '${orderId}': ${error.message || 'API error'}`);
    }
  }

  /**
   * HMAC-SHA256 signature verification over raw request body buffer
   */
  public static verifyWebhookSignature(
    rawBodyBuffer: Buffer | string,
    signature: string,
    secret: string = config.razorpay.webhookSecret
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBodyBuffer)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (err) {
      return false;
    }
  }
}

