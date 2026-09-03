import crypto from 'crypto';
import { config } from '../config/env';

const BASE_URL = `http://localhost:${config.port}/api`;
const WEBHOOK_SECRET = config.razorpay.webhookSecret;

function signPayload(payloadStr: string, secret: string = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
}

async function runTests() {
  console.log(`
  ======================================================
  🧪 Running PayPilot Razorpay Test Mode & Webhook Suite
  ======================================================
  🌐 Target: ${BASE_URL}
  🔒 Signature Mode: HMAC-SHA256 (Secret Masked)
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

  // -------------------------------------------------------------------------
  // Test 1: Health Check
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Backend Health ---');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /api/health returns 200 OK', data);
  } catch (err: any) {
    assert(false, 'GET /api/health reachable', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 2: Razorpay Order Creation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Razorpay Order Creation ---');
  let createdOrderId = '';
  try {
    const res = await fetch(`${BASE_URL}/razorpay/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 350000, // ₹3,500.00
        currency: 'INR',
        receipt: `test_rcpt_${Date.now()}`,
        notes: { customerId: 'CUST-8819', campaign: 'Recovery Demo' },
      }),
    });
    const data = await res.json();
    createdOrderId = data.order?.id;
    assert(
      res.status === 201 && data.success && !!createdOrderId && data.order?.amount === 350000,
      'POST /api/razorpay/orders creates test order',
      data
    );
  } catch (err: any) {
    assert(false, 'POST /api/razorpay/orders', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 3: Razorpay Payment & Order Fetching
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Razorpay Fetch Endpoints ---');
  try {
    const res = await fetch(`${BASE_URL}/razorpay/payments/pay_test_demo_99`);
    const data = await res.json();
    assert(res.status === 200 && data.success && data.payment?.id === 'pay_test_demo_99', 'GET /api/razorpay/payments/:id', data);
  } catch (err: any) {
    assert(false, 'GET /api/razorpay/payments/:id', err.message);
  }

  if (createdOrderId) {
    try {
      const res = await fetch(`${BASE_URL}/razorpay/orders/${createdOrderId}`);
      const data = await res.json();
      assert(res.status === 200 && data.success && data.order?.id === createdOrderId, 'GET /api/razorpay/orders/:id', data);
    } catch (err: any) {
      assert(false, 'GET /api/razorpay/orders/:id', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // Test 4: Webhook payment.failed (Valid Signature)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Webhook: payment.failed (Signature Verified) ---');
  const testPaymentId = `pay_rzp_test_${Date.now().toString(36)}`;
  const failedPayload = {
    entity: 'event',
    account_id: 'acc_demo_rzp',
    event: 'payment.failed',
    contains: ['payment'],
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          entity: 'payment',
          amount: 899900, // ₹8,999.00
          currency: 'INR',
          status: 'failed',
          order_id: `order_${testPaymentId.slice(-8)}`,
          method: 'card',
          email: 'ananya.sharma@startupindia.in',
          contact: '+91 98112 34567',
          error_code: 'INSUFFICIENT_FUNDS',
          error_description: 'Card issuer reported insufficient balance for instantaneous debit.',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };

  const failedPayloadStr = JSON.stringify(failedPayload);
  const validSignature = signPayload(failedPayloadStr);

  try {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: failedPayloadStr,
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.status === 'recovery_created', 'Webhook payment.failed creates recovery case', data);

    // Verify recovery event exists in /api/recovery-events
    const recoveryCheck = await fetch(`${BASE_URL}/recovery-events?search=ananya`);
    const recoveryData = await recoveryCheck.json();
    const createdCase = recoveryData.data?.find((c: any) => c.amount === 8999);
    assert(!!createdCase && createdCase.cause === 'payment_failure', 'Verified RecoveryEvent in DB with AI strategy', createdCase);
  } catch (err: any) {
    assert(false, 'Webhook payment.failed execution', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 5: Webhook Idempotency (Duplicate Ingestion & Zero Duplicate Records)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Webhook Idempotency (Duplicate Ingestion) ---');
  try {
    // Count audit logs before duplicate
    const auditBeforeRes = await fetch(`${BASE_URL}/audit-logs`);
    const auditBefore = await auditBeforeRes.json();
    const countBefore = auditBefore.data?.length || 0;

    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: failedPayloadStr,
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.duplicate === true, 'Duplicate webhook safely ignored via persistent SQLite tracking', data);

    // Count audit logs after duplicate to guarantee no duplicate audit records were generated
    const auditAfterRes = await fetch(`${BASE_URL}/audit-logs`);
    const auditAfter = await auditAfterRes.json();
    const countAfter = auditAfter.data?.length || 0;
    assert(countBefore === countAfter, 'Confirmed zero duplicate AuditLogs created on duplicate webhook delivery', { countBefore, countAfter });
  } catch (err: any) {
    assert(false, 'Webhook duplicate test', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 6: Webhook Invalid Signature Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Webhook Security: Invalid Signature Rejection ---');
  try {
    const tamperedSignature = 'deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678';
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': tamperedSignature,
      },
      body: failedPayloadStr,
    });
    const data = await res.json();
    assert(res.status === 400 && !data.success, 'Invalid HMAC-SHA256 signature rejected with HTTP 400', data);
  } catch (err: any) {
    assert(false, 'Webhook invalid signature rejection', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 7: Webhook payment.captured (Only Resolves Associated Case)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Webhook: payment.captured (Resolves Specific Case) ---');
  // First, verify that an unrelated active recovery case (e.g. RP10512) is currently blocked/pending
  const unrelatedBefore = await fetch(`${BASE_URL}/recovery-events/RP10512`).then((r) => r.json());
  const unrelatedStatusBefore = unrelatedBefore.data?.status;

  const capturedPayload = {
    entity: 'event',
    account_id: 'acc_demo_rzp',
    event: 'payment.captured',
    contains: ['payment'],
    created_at: Math.floor(Date.now() / 1000) + 10,
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          entity: 'payment',
          amount: 899900,
          currency: 'INR',
          status: 'captured',
          order_id: `order_${testPaymentId.slice(-8)}`,
          created_at: Math.floor(Date.now() / 1000) + 10,
        },
      },
    },
  };

  const capturedPayloadStr = JSON.stringify(capturedPayload);
  const capturedSignature = signPayload(capturedPayloadStr);

  try {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': capturedSignature,
      },
      body: capturedPayloadStr,
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, 'Webhook payment.captured processed', data);

    // Verify transaction status is now captured
    const txnRes = await fetch(`${BASE_URL}/transactions/txn_${testPaymentId.toLowerCase()}`);
    const txnData = await txnRes.json();
    assert(txnData.data?.status === 'captured', 'Transaction updated to captured in DB', txnData.data);
    assert(txnData.data?.recovery?.status === 'recovered', 'Associated RecoveryEvent updated to recovered', txnData.data?.recovery);

    // Verify unrelated recovery case RP10512 was NOT altered
    const unrelatedAfter = await fetch(`${BASE_URL}/recovery-events/RP10512`).then((r) => r.json());
    assert(
      unrelatedAfter.data?.status === unrelatedStatusBefore,
      'Confirmed unrelated recovery cases remain unaltered',
      { caseId: 'RP10512', before: unrelatedStatusBefore, after: unrelatedAfter.data?.status }
    );
  } catch (err: any) {
    assert(false, 'Webhook payment.captured resolution', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 8: Unknown Webhook Event Handling
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Testing Unknown Webhook Event Handling ---');
  const unknownPayload = {
    entity: 'event',
    event: 'refund.speed_processed',
    created_at: Math.floor(Date.now() / 1000) + 20,
    payload: {},
  };
  const unknownPayloadStr = JSON.stringify(unknownPayload);
  const unknownSig = signPayload(unknownPayloadStr);

  try {
    const res = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': unknownSig,
      },
      body: unknownPayloadStr,
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.message?.includes('ignored'), 'Unknown webhook event acknowledged without crashing', data);
  } catch (err: any) {
    assert(false, 'Unknown webhook handling', err.message);
  }

  // -------------------------------------------------------------------------
  // Test 9: Verify Audit Logs
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Testing Audit Log Recording ---');
  try {
    const res = await fetch(`${BASE_URL}/audit-logs`);
    const data = await res.json();
    const hasWebhookLog = data.data?.some((l: any) => l.executionChannel === 'Razorpay Webhook');
    assert(res.status === 200 && hasWebhookLog, 'Audit logs recorded for Razorpay webhook actions', data.data?.[0]);
  } catch (err: any) {
    assert(false, 'Audit log verification', err.message);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`
  ======================================================
  🏁 Test Suite Complete: ${testsPassed}/${testsTotal} Passed (${Math.round((testsPassed / testsTotal) * 100)}%)
  ======================================================
  `);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
