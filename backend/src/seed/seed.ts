import { getDatabase } from '../db/database';
import { INITIAL_CASES, INITIAL_CUSTOMERS, INITIAL_AUDIT_LOGS } from '../../../src/data/mockData';

export function seedDatabase() {
  const db = getDatabase();

  console.log('[Seed] Initializing database tables...');

  // Clear existing data cleanly in foreign-key order
  db.exec('DELETE FROM audit_logs;');
  db.exec('DELETE FROM recovery_events;');
  db.exec('DELETE FROM transactions;');
  db.exec('DELETE FROM customers;');

  console.log('[Seed] Seeding customers...');
  const insertCustomer = db.prepare(`
    INSERT OR REPLACE INTO customers (id, name, email, phone, business_type, tier, health_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of INITIAL_CUSTOMERS) {
    insertCustomer.run(
      c.id,
      c.name,
      c.email,
      c.phone,
      c.businessType,
      c.tier,
      c.healthScore,
      c.lastActivity || '2026-08-24 10:00:00'
    );
  }

  console.log('[Seed] Seeding transactions and recovery events...');
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (
      id, customer_id, amount, currency, status, payment_method,
      decline_code, decline_reason, failure_reason,
      razorpay_payment_id, razorpay_order_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecovery = db.prepare(`
    INSERT INTO recovery_events (
      id, transaction_id, customer_id, reason, status, amount, strategy,
      ai_probability, recommended_action, why_explanation, decision_explanation,
      action_taken, policy_applied, approval_status, is_automated,
      payment_link_url, timeline_json, created_at, recovered_at,
      retry_attempts, recovered_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of INITIAL_CASES) {
    // Ensure customer exists in database
    insertCustomer.run(
      c.customerId,
      c.customerName,
      c.customerEmail,
      '+91 98765 43210',
      'Merchant Account',
      'Standard',
      'Healthy',
      c.createdAt
    );

    const txnId = `txn_${c.id.toLowerCase()}`;
    const txnStatus = c.status === 'recovered' ? 'captured' : 'failed';
    const paymentMethod = c.cause === 'subscription_failure' ? 'mandate' : 'card';

    insertTransaction.run(
      txnId,
      c.customerId,
      c.amount,
      'INR',
      txnStatus,
      paymentMethod,
      c.declineCode || 'PAYMENT_FAILED',
      c.declineReason || c.causeLabel,
      c.failureReason || c.issueDescription,
      c.razorpayPaymentId || `pay_${c.id.toLowerCase()}`,
      c.razorpayOrderId || `order_${c.id.toLowerCase()}`,
      c.createdAt
    );

    insertRecovery.run(
      c.id,
      txnId,
      c.customerId,
      c.cause,
      c.status,
      c.amount,
      c.strategy,
      c.aiProbability,
      c.recommendedAction,
      c.whyExplanation,
      c.decisionExplanation,
      c.actionTaken,
      c.policyApplied,
      c.approvalStatus,
      c.isAutomated ? 1 : 0,
      c.paymentLinkUrl || null,
      JSON.stringify(c.timeline || []),
      c.createdAt,
      c.status === 'recovered' ? (c.updatedAt || c.createdAt) : null,
      c.retryAttempts || 0,
      c.status === 'recovered' ? c.amount : 0
    );
  }

  // Seed standard successful baseline transactions to populate total revenue realistically
  const baselineTxns = [
    { id: 'txn_base_01', customerId: 'CUST-8819', amount: 48000, method: 'card', date: '2026-08-20 09:30:00' },
    { id: 'txn_base_02', customerId: 'CUST-8819', amount: 125000, method: 'netbanking', date: '2026-08-21 11:15:00' },
    { id: 'txn_base_03', customerId: 'CUST-3902', amount: 75000, method: 'card', date: '2026-08-21 14:20:00' },
    { id: 'txn_base_04', customerId: 'CUST-1194', amount: 150000, method: 'netbanking', date: '2026-08-22 10:00:00' },
    { id: 'txn_base_05', customerId: 'CUST-4091', amount: 280000, method: 'upi', date: '2026-08-22 16:45:00' },
    { id: 'txn_base_06', customerId: 'CUST-5520', amount: 95000, method: 'card', date: '2026-08-23 12:10:00' },
  ];

  for (const b of baselineTxns) {
    insertTransaction.run(
      b.id,
      b.customerId,
      b.amount,
      'INR',
      'captured',
      b.method,
      null,
      null,
      null,
      `pay_${b.id}`,
      `order_${b.id}`,
      b.date
    );
  }

  console.log('[Seed] Seeding audit logs...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (
      id, timestamp, case_id, customer_name, action, amount,
      trigger_event, result, policy_evaluated, blocked_reason,
      execution_channel, actor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const a of INITIAL_AUDIT_LOGS) {
    insertAudit.run(
      a.id,
      a.timestamp,
      a.caseId,
      a.customerName,
      a.action,
      a.amount,
      a.trigger,
      a.result,
      a.policyEvaluated,
      a.blockedReason || null,
      a.executionChannel,
      a.actor
    );
  }

  console.log('✅ [Seed] Successfully seeded deterministic database!');
}

// Allow direct script execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
  seedDatabase();
}
