import { getDatabase } from '../db/database';
import { RazorpayService } from '../services/razorpayService';
import { WebhookService } from '../services/webhookService';

async function runSyncTests() {
  console.log(`
  ======================================================
  🔄 Running PayPilot Razorpay Live Payment Sync Suite
  ======================================================
  `);

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    testsTotal++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error('     Details:', details);
    }
  }

  const db = getDatabase();

  // Test 1: API payment successfully inserted into transactions
  console.log('\n--- 1. Testing API Payment Ingestion ---');
  const testPay1 = {
    id: `pay_sync_test_01_${Date.now()}`,
    amount: 350000, // ₹3,500
    currency: 'INR',
    status: 'captured',
    method: 'upi',
    order_id: `order_sync_01_${Date.now()}`,
    email: 'rohit.verma@example.com',
    contact: '+91 98765 11111',
    created_at: Math.floor(Date.now() / 1000),
  };

  const res1 = await RazorpayService.syncLivePayments([testPay1]);
  const row1 = db.prepare('SELECT * FROM transactions WHERE razorpay_payment_id = ?').get(testPay1.id) as any;
  assert(res1.success && res1.inserted === 1, 'Sync report reports 1 inserted payment');
  assert(row1 && row1.amount === 3500 && row1.status === 'captured', 'Payment record persisted in SQLite with amount ₹3,500 and status captured');

  // Test 2: Repeated sync does not duplicate transactions
  console.log('\n--- 2. Testing Sync Idempotency (No Duplicate Transactions) ---');
  const res2 = await RazorpayService.syncLivePayments([testPay1]);
  const count2 = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE razorpay_payment_id = ?').get(testPay1.id) as any;
  assert(res2.skipped === 1 && res2.inserted === 0, 'Repeated sync skips already ingested payment');
  assert(count2 && count2.count === 1, 'Exactly 1 transaction row exists (no duplicate inserted)');

  // Test 3: Webhook-created transaction + API sync does not duplicate it
  console.log('\n--- 3. Testing Webhook + API Sync Coexistence ---');
  const webhookPayId = `pay_wh_sync_${Date.now()}`;
  const webhookOrderId = `order_wh_sync_${Date.now()}`;

  // Process via webhook first
  await WebhookService.processEvent({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPayId,
          entity: 'payment',
          amount: 420000, // ₹4,200
          currency: 'INR',
          status: 'captured',
          order_id: webhookOrderId,
          email: 'priya.nair@example.com',
          contact: '+91 98765 22222',
          method: 'card',
        },
      },
    },
  });

  // Now sync the same payment via API sync
  const apiPayFromWebhook = {
    id: webhookPayId,
    amount: 420000,
    currency: 'INR',
    status: 'captured',
    method: 'card',
    order_id: webhookOrderId,
    email: 'priya.nair@example.com',
    contact: '+91 98765 22222',
    created_at: Math.floor(Date.now() / 1000),
  };

  const res3 = await RazorpayService.syncLivePayments([apiPayFromWebhook]);
  const count3 = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE razorpay_payment_id = ?').get(webhookPayId) as any;
  assert(res3.skipped === 1, 'API sync recognizes webhook-created transaction and skips duplicate insert');
  assert(count3 && count3.count === 1, 'Confirmed zero duplicate transactions across webhook and API sync');

  // Test 4: Failed API payment creates exactly one recovery event
  console.log('\n--- 4. Testing Failed Payment Sync & Recovery Event Creation ---');
  const failedPayId = `pay_failed_sync_${Date.now()}`;
  const failedPay = {
    id: failedPayId,
    amount: 850000, // ₹8,500
    currency: 'INR',
    status: 'failed',
    method: 'card',
    error_code: 'INSUFFICIENT_FUNDS',
    error_description: 'Card issuer reported insufficient balance for debit',
    order_id: `order_failed_${Date.now()}`,
    email: 'kavita.patel@example.com',
    contact: '+91 98765 33333',
    created_at: Math.floor(Date.now() / 1000),
  };

  const res4 = await RazorpayService.syncLivePayments([failedPay]);
  const failedTxn = db.prepare('SELECT id, status FROM transactions WHERE razorpay_payment_id = ?').get(failedPayId) as any;
  const recovery4 = db.prepare('SELECT * FROM recovery_events WHERE transaction_id = ?').get(failedTxn?.id) as any;
  assert(res4.recoveryCreated === 1, 'Sync report records 1 recovery case created');
  assert(failedTxn && failedTxn.status === 'failed', 'Transaction saved as failed');
  assert(recovery4 && recovery4.amount === 8500 && recovery4.status === 'pending', 'Recovery event generated with AI decision and pending status');

  // Test 5: Repeated sync does not create duplicate recovery events
  console.log('\n--- 5. Testing Failed Payment Sync Idempotency ---');
  const res5 = await RazorpayService.syncLivePayments([failedPay]);
  const recoveryCount5 = db.prepare('SELECT COUNT(*) as count FROM recovery_events WHERE transaction_id = ?').get(failedTxn?.id) as any;
  assert(res5.skipped === 1 && res5.recoveryCreated === 0, 'Repeated sync skips existing failed case without creating duplicate');
  assert(recoveryCount5 && recoveryCount5.count === 1, 'Exactly 1 recovery event persists in database');

  // Test 6 & 7: Failed → captured updates existing transaction and resolves recovery event
  console.log('\n--- 6 & 7. Testing Failed -> Captured State Transition & Resolution ---');
  const capturedRetryPay = {
    ...failedPay,
    status: 'captured',
    error_code: undefined,
    error_description: undefined,
  };

  const res6 = await RazorpayService.syncLivePayments([capturedRetryPay]);
  const updatedTxn = db.prepare('SELECT status FROM transactions WHERE id = ?').get(failedTxn.id) as any;
  const resolvedRecovery = db.prepare('SELECT status, recovered_amount, recovered_at FROM recovery_events WHERE transaction_id = ?').get(failedTxn.id) as any;
  assert(res6.updated === 1 && res6.recoveryResolved === 1, 'Sync report confirms transaction updated and recovery resolved');
  assert(updatedTxn && updatedTxn.status === 'captured', 'Transaction status updated to captured');
  assert(resolvedRecovery && resolvedRecovery.status === 'recovered' && resolvedRecovery.recovered_amount === 8500, 'Linked recovery case marked as recovered with recovered_amount ₹8,500');

  // Test 8: Standalone captured payment creates no recovery event
  console.log('\n--- 8. Testing Standalone Captured Payment (No Recovery Case) ---');
  const standalonePayId = `pay_standalone_${Date.now()}`;
  const standalonePay = {
    id: standalonePayId,
    amount: 150000, // ₹1,500
    currency: 'INR',
    status: 'captured',
    method: 'netbanking',
    order_id: `order_st_${Date.now()}`,
    email: 'amit.shah@example.com',
    contact: '+91 98765 44444',
    created_at: Math.floor(Date.now() / 1000),
  };

  const res8 = await RazorpayService.syncLivePayments([standalonePay]);
  const standaloneTxn = db.prepare('SELECT id, status FROM transactions WHERE razorpay_payment_id = ?').get(standalonePayId) as any;
  const recovery8 = db.prepare('SELECT id FROM recovery_events WHERE transaction_id = ?').get(standaloneTxn?.id) as any;
  assert(res8.inserted === 1 && res8.recoveryCreated === 0, 'Standalone payment inserted with 0 recovery cases created');
  assert(standaloneTxn && standaloneTxn.status === 'captured', 'Standalone transaction is captured');
  assert(!recovery8, 'Confirmed NO recovery event created for direct successful payment');

  // Test 9: Razorpay API authentication/network failure handled gracefully
  console.log('\n--- 9. Testing Graceful API Error / Fallback Handling ---');
  const fetchFallbackRes = await RazorpayService.fetchPaymentsList();
  assert(typeof fetchFallbackRes.success === 'boolean', 'fetchPaymentsList() returns structured safe object without throwing unhandled exceptions');

  const syncFallbackRes = await RazorpayService.syncLivePayments();
  assert(syncFallbackRes.success === true, 'syncLivePayments() completes gracefully in all environments');

  console.log(`
  ======================================================
  🏁 Sync Engine Suite: ${testsPassed}/${testsTotal} Passed (${Math.round((testsPassed / testsTotal) * 100)}%)
  ======================================================
  `);

  if (testsPassed !== testsTotal) {
    process.exit(1);
  }
}

runSyncTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
