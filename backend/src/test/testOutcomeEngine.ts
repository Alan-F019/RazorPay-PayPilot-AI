import assert from 'node:assert';
import { RecoveryService } from '../services/recoveryService';
import { WebhookService } from '../services/webhookService';
import { getDatabase } from '../db/database';

console.log(`
  ======================================================
  ⚡ Running PayPilot Phase 5 Recovery & Outcome Suite
  ======================================================
`);

let passedTests = 0;
let totalTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runSuite() {
  const db = getDatabase();

  console.log('--- 1. Testing Normal Recovery Action Execution Lifecycle ---');
  // Create test case
  const testPayId1 = `pay_life_${Date.now()}_1`;
  const webhook1 = {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: testPayId1,
          amount: 50000, // ₹500
          currency: 'INR',
          status: 'failed',
          order_id: `order_${testPayId1.slice(-8)}`,
          email: 'lifecycle.test1@corp.in',
          contact: '+91 99999 11111',
          error_code: 'INSUFFICIENT_FUNDS',
          error_description: 'Card issuer reported insufficient funds',
        },
      },
    },
  };

  const createRes1 = (await WebhookService.processEvent(webhook1 as any)) as any;
  const caseId1 = createRes1.caseId;

  await test('Attempt 1: Execution transitions status to in_progress (Awaiting Payment)', () => {
    const exec1 = RecoveryService.executeAction(caseId1, 'Create Payment Link', false);
    assert.strictEqual(exec1.success, true);
    assert.strictEqual(exec1.status, 'in_progress');
    assert.strictEqual(exec1.attemptNumber, 1);
    assert.strictEqual(exec1.updatedCase?.status, 'in_progress');
    assert.strictEqual(exec1.updatedCase?.retryAttempts, 1);
  });

  await test('Attempt 2: Second execution increments attempt counter to 2 and remains in_progress', () => {
    const exec2 = RecoveryService.executeAction(caseId1, 'Create Payment Link', false);
    assert.strictEqual(exec2.success, true);
    assert.strictEqual(exec2.status, 'in_progress');
    assert.strictEqual(exec2.attemptNumber, 2);
    assert.strictEqual(exec2.updatedCase?.retryAttempts, 2);
  });

  await test('Attempt 3: Third execution is strictly BLOCKED and auto-escalated to Ops', () => {
    const exec3 = RecoveryService.executeAction(caseId1, 'Create Payment Link', false);
    assert.strictEqual(exec3.success, false);
    assert.strictEqual(exec3.blocked, true);
    assert.strictEqual(exec3.guardrail?.policy, 'Recovery Attempt Limit');
    assert.strictEqual(exec3.updatedCase?.status, 'escalated');
    assert.strictEqual(exec3.updatedCase?.retryAttempts, 2, 'Attempt count must not exceed 2');
  });

  console.log('\n--- 2. Testing High-Value ₹25,000 Amount Guardrail ---');
  const testPayId2 = `pay_life_${Date.now()}_2`;
  const webhook2 = {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: testPayId2,
          amount: 3500000, // ₹35,000
          currency: 'INR',
          status: 'failed',
          order_id: `order_${testPayId2.slice(-8)}`,
          email: 'highvalue.test@corp.in',
          contact: '+91 99999 22222',
          error_code: 'INSUFFICIENT_FUNDS',
          error_description: 'Card issuer reported insufficient balance',
        },
      },
    },
  };
  const createRes2 = (await WebhookService.processEvent(webhook2 as any)) as any;
  const caseId2 = createRes2.caseId;

  await test('Amount > ₹25,000 without manual authorization is HELD (Manual Approval Required)', () => {
    const execWithoutAuth = RecoveryService.executeAction(caseId2, 'Create Payment Link', false);
    assert.strictEqual(execWithoutAuth.success, false);
    assert.strictEqual(execWithoutAuth.blocked, true);
    assert.strictEqual(execWithoutAuth.guardrail?.status, 'MANUAL_APPROVAL_REQUIRED');
    assert.strictEqual(execWithoutAuth.updatedCase?.retryAttempts, 0, 'Blocked request must not increment attempts');
  });

  await test('Amount > ₹25,000 with explicit manual authorization executes Attempt 1 and logs Merchant Operator', () => {
    const execWithAuth = RecoveryService.executeAction(caseId2, 'Create Payment Link', true, 'Merchant Operator');
    assert.strictEqual(execWithAuth.success, true);
    assert.strictEqual(execWithAuth.status, 'in_progress');
    assert.strictEqual(execWithAuth.attemptNumber, 1);
    assert.strictEqual(execWithAuth.updatedCase?.retryAttempts, 1);
    assert.strictEqual(execWithAuth.auditLog?.actor, 'Merchant Operator');
  });

  console.log('\n--- 3. Testing Razorpay Payment Captured & Revenue Recovery Outcome ---');
  const testPayId3 = `pay_life_${Date.now()}_3`;
  const testOrderId3 = `order_life_${Date.now()}_3`;
  const webhook3Failed = {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: testPayId3,
          amount: 1500000, // ₹15,000
          currency: 'INR',
          status: 'failed',
          order_id: testOrderId3,
          email: 'capture.test@corp.in',
          contact: '+91 99999 33333',
          error_code: 'GATEWAY_ERROR',
          error_description: 'Issuer gateway timeout',
        },
      },
    },
  };
  const createRes3 = (await WebhookService.processEvent(webhook3Failed as any)) as any;
  const caseId3 = createRes3.caseId;

  // Execute action to transition to in_progress
  RecoveryService.executeAction(caseId3, 'Gateway Retry', false);

  await test('Verified payment.captured resolves exact matching case to recovered with recovered_amount', async () => {
    const webhook3Captured = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPayId3,
            amount: 1500000, // ₹15,000
            currency: 'INR',
            status: 'captured',
            order_id: testOrderId3,
            email: 'capture.test@corp.in',
            contact: '+91 99999 33333',
          },
        },
      },
    };

    const capRes = (await WebhookService.processEvent(webhook3Captured as any)) as any;
    assert.strictEqual(capRes.success, true);

    const updatedCase3 = RecoveryService.getById(caseId3);
    assert.strictEqual(updatedCase3?.status, 'recovered');
    assert.strictEqual(updatedCase3?.recoveredAmount, 15000);
    assert.ok(updatedCase3?.recoveredAt, 'recoveredAt timestamp must be populated');
    assert.ok(
      updatedCase3?.timeline.some((t: any) => t.title.includes('Razorpay Test Payment Captured')),
      'Timeline must contain Razorpay Test Payment Captured entry'
    );
  });

  await test('Attempting to execute action on recovered case is strictly BLOCKED (Settled Case Lock)', () => {
    const reExec = RecoveryService.executeAction(caseId3, 'Create Payment Link', false);
    assert.strictEqual(reExec.success, false);
    assert.strictEqual(reExec.blocked, true);
    assert.strictEqual(reExec.guardrail?.policy, 'Settled Case Lock');
  });

  console.log('\n--- 4. Testing Case Specificity & Isolation ---');
  await test('Successful payment for Transaction A does not resolve unrelated Transaction B case', async () => {
    // Create Transaction A and Transaction B failures
    const payA = `pay_spec_${Date.now()}_A`;
    const payB = `pay_spec_${Date.now()}_B`;

    const resA = (await WebhookService.processEvent({
      event: 'payment.failed',
      payload: { payment: { entity: { id: payA, amount: 200000, email: 'userA@corp.in', error_code: 'AUTH_FAIL' } } },
    } as any)) as any;

    const resB = (await WebhookService.processEvent({
      event: 'payment.failed',
      payload: { payment: { entity: { id: payB, amount: 300000, email: 'userB@corp.in', error_code: 'INSUFFICIENT' } } },
    } as any)) as any;

    // Send payment.captured for payA ONLY
    await WebhookService.processEvent({
      event: 'payment.captured',
      payload: { payment: { entity: { id: payA, amount: 200000, email: 'userA@corp.in' } } },
    } as any);

    const caseA = RecoveryService.getById(resA.caseId);
    const caseB = RecoveryService.getById(resB.caseId);

    assert.strictEqual(caseA?.status, 'recovered', 'Case A must be recovered');
    assert.strictEqual(caseA?.recoveredAmount, 2000, 'Case A recoveredAmount must be ₹2,000');
    assert.notStrictEqual(caseB?.status, 'recovered', 'Case B must NOT be resolved by payment for Transaction A');
    assert.strictEqual(caseB?.recoveredAmount, 0, 'Case B recoveredAmount must remain 0');
  });

  console.log('\n--- 5. Testing Failed Attempt Recording & Auto-Escalation ---');
  await test('Failed recovery attempt increments attempts and escalates after attempt 2', async () => {
    const payFailId = `pay_fail_${Date.now()}`;
    const createFailRes = (await WebhookService.processEvent({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: payFailId,
            amount: 500000, // ₹5,000
            email: 'failed.user@corp.in',
            error_code: 'INSUFFICIENT_FUNDS',
          },
        },
      },
    } as any)) as any;

    const caseFailId = createFailRes.caseId;

    // Dispatch attempt 1
    RecoveryService.executeAction(caseFailId, 'Create Payment Link', false);

    // Attempt 1 fails -> status pending
    const fail1 = RecoveryService.recordFailedAttempt(caseFailId, 'Customer secondary card declined');
    assert.strictEqual(fail1.success, true);
    assert.strictEqual(fail1.status, 'pending');

    // Dispatch attempt 2
    RecoveryService.executeAction(caseFailId, 'Create Payment Link', false);

    // Attempt 2 fails -> status escalated
    const fail2 = RecoveryService.recordFailedAttempt(caseFailId, 'UPI authorization expired');
    assert.strictEqual(fail2.success, true);
    assert.strictEqual(fail2.status, 'escalated');
    assert.strictEqual(fail2.updatedCase?.status, 'escalated');
  });

  console.log(`
  ======================================================
  🏁 Recovery & Outcome Suite: ${passedTests}/${totalTests} Passed (100%)
  ======================================================
  `);
}

runSuite().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
