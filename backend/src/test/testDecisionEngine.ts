import assert from 'node:assert';
import { RecoveryDecisionEngine } from '../services/recoveryDecisionEngine';
import { getDatabase } from '../db/database';
import { WebhookService } from '../services/webhookService';
import { RecoveryService } from '../services/recoveryService';

console.log(`
  ======================================================
  🧠 Running PayPilot AI Revenue Recovery Engine Suite
  ======================================================
`);

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`  ✅ [PASS] ${name}`);
        passedTests++;
      }).catch((err) => {
        console.error(`  ❌ [FAIL] ${name}:`, err.message);
        throw err;
      });
    }
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runSuite() {
  console.log('--- 1. Testing Insufficient Funds Scoring & Strategy ---');
  test('Insufficient Funds produces high recovery probability and Create Payment Link', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 4999,
      declineCode: 'INSUFFICIENT_FUNDS',
      declineReason: 'Card issuer reported insufficient balance for instantaneous debit.',
      customer: {
        tier: 'Standard',
        healthScore: 'Healthy',
        totalSuccessfulPayments: 7,
        totalFailedPayments: 0,
      },
    });

    assert.ok(decision.recoveryProbability >= 70, `Expected prob >= 70%, got ${decision.recoveryProbability}%`);
    assert.strictEqual(decision.failureCategory, 'Insufficient Funds');
    assert.strictEqual(decision.recommendedAction, 'Create Payment Link');
    assert.strictEqual(decision.strategy, 'Alternate Payment Method');
    assert.strictEqual(decision.guardrail.status, 'ALLOWED');
    assert.ok(decision.reasoning.length >= 3, 'Expected at least 3 explainable reasoning points');
  });

  console.log('\n--- 2. Testing International Card Strategy ---');
  test('International Card selects Alternate Domestic Route & UPI Smart Link', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 2500,
      declineCode: 'INTERNATIONAL_CARD',
      declineReason: 'International card transaction restricted by issuer',
      customer: {
        tier: 'Growth',
        healthScore: 'Healthy',
        totalSuccessfulPayments: 5,
      },
    });

    assert.strictEqual(decision.failureCategory, 'International Card');
    assert.strictEqual(decision.recommendedAction, 'UPI Smart Link');
    assert.strictEqual(decision.strategy, 'Alternate Domestic Route');
    assert.strictEqual(decision.guardrail.status, 'ALLOWED');
  });

  console.log('\n--- 3. Testing Gateway Decline / Issuer Timeout ---');
  test('Gateway Decline selects Smart Backoff Retry & Gateway Retry', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 8500,
      declineCode: 'GATEWAY_ERROR',
      declineReason: 'Bank gateway timeout during 2FA response',
      customer: {
        tier: 'Growth',
        healthScore: 'Healthy',
        totalSuccessfulPayments: 8,
      },
    });

    assert.strictEqual(decision.failureCategory, 'Gateway Decline');
    assert.strictEqual(decision.recommendedAction, 'Gateway Retry');
    assert.strictEqual(decision.strategy, 'Smart Backoff Retry');
    assert.ok(decision.recoveryProbability >= 75, `Expected prob >= 75%, got ${decision.recoveryProbability}%`);
  });

  console.log('\n--- 4. Testing Card Expired ---');
  test('Card Expired selects Payment Method Update strategy', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 1999,
      declineCode: 'CARD_EXPIRED',
      declineReason: 'Card expiry date passed (07/26)',
      customer: {
        tier: 'Standard',
        healthScore: 'Healthy',
      },
    });

    assert.strictEqual(decision.failureCategory, 'Card Expired');
    assert.strictEqual(decision.recommendedAction, 'Update Payment Method');
    assert.strictEqual(decision.strategy, 'Payment Method Update');
  });

  console.log('\n--- 5. Testing Repeated Failures & Low Health Penalties ---');
  test('Customer with repeated failures and high risk has lower probability and penalties in reasoning', () => {
    const healthyDecision = RecoveryDecisionEngine.evaluate({
      amount: 3000,
      declineCode: 'INSUFFICIENT_FUNDS',
      customer: {
        healthScore: 'Healthy',
        totalSuccessfulPayments: 8,
        totalFailedPayments: 0,
      },
    });

    const riskyDecision = RecoveryDecisionEngine.evaluate({
      amount: 3000,
      declineCode: 'INSUFFICIENT_FUNDS',
      customer: {
        healthScore: 'High Risk',
        totalSuccessfulPayments: 1,
        totalFailedPayments: 4,
      },
    });

    assert.ok(
      riskyDecision.recoveryProbability < healthyDecision.recoveryProbability,
      `Risky prob (${riskyDecision.recoveryProbability}%) should be strictly less than Healthy prob (${healthyDecision.recoveryProbability}%)`
    );
    assert.ok(
      riskyDecision.reasoning.some((r) => r.toLowerCase().includes('high risk') || r.toLowerCase().includes('failed payments')),
      'Expected penalty explanation in reasoning bullets'
    );
  });

  console.log('\n--- 6. Testing High-Value Enterprise Customer Bonus ---');
  test('Enterprise customer receives probability bonus and Urgent/High priority', () => {
    const standardDecision = RecoveryDecisionEngine.evaluate({
      amount: 12000,
      declineCode: 'INSUFFICIENT_FUNDS',
      customer: {
        tier: 'Standard',
        healthScore: 'Healthy',
      },
    });

    const enterpriseDecision = RecoveryDecisionEngine.evaluate({
      amount: 12000,
      declineCode: 'INSUFFICIENT_FUNDS',
      customer: {
        tier: 'Enterprise',
        healthScore: 'Healthy',
      },
    });

    assert.ok(
      enterpriseDecision.recoveryProbability > standardDecision.recoveryProbability,
      `Enterprise prob (${enterpriseDecision.recoveryProbability}%) should be > Standard prob (${standardDecision.recoveryProbability}%)`
    );
    assert.strictEqual(enterpriseDecision.priority, 'urgent');
  });

  console.log('\n--- 7. Testing Guardrail: Amount Cap (₹25,000 Threshold) ---');
  test('Transactions exceeding ₹25,000 require manual approval', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 35000,
      declineCode: 'INSUFFICIENT_FUNDS',
      customer: {
        tier: 'Enterprise',
        healthScore: 'Healthy',
      },
    });

    assert.strictEqual(decision.guardrail.allowed, false);
    assert.strictEqual(decision.guardrail.status, 'MANUAL_APPROVAL_REQUIRED');
    assert.ok(decision.guardrail.reason.includes('₹25,000'), 'Guardrail reason should mention ₹25,000 limit');
    assert.strictEqual(decision.recommendedAction, 'Escalate to Ops');
  });

  console.log('\n--- 8. Testing Guardrail: Max Recovery Attempts Limit (Cap = 2) ---');
  test('Cases with 2 or more retry attempts are BLOCKED and Escalated to Ops', () => {
    const decision = RecoveryDecisionEngine.evaluate({
      amount: 4500,
      declineCode: 'INSUFFICIENT_FUNDS',
      retryAttempts: 2,
    });

    assert.strictEqual(decision.guardrail.allowed, false);
    assert.strictEqual(decision.guardrail.status, 'BLOCKED');
    assert.strictEqual(decision.guardrail.policy, 'Recovery Attempt Limit');
    assert.strictEqual(decision.guardrail.action, 'ESCALATE');
  });

  console.log('\n--- 9. Testing Guardrail: Settled Case Lock ---');
  test('Already recovered/settled transactions cannot have actions executed', () => {
    const guardrail = RecoveryDecisionEngine.evaluateGuardrails(
      5000,
      0,
      { tier: 'Standard' },
      'recovered',
      85
    );

    assert.strictEqual(guardrail.allowed, false);
    assert.strictEqual(guardrail.status, 'BLOCKED');
    assert.strictEqual(guardrail.policy, 'Settled Case Lock');
  });

  console.log('\n--- 10. Testing End-to-End Webhook Ingestion with AI Decision Engine ---');
  await test('payment.failed webhook creates RecoveryEvent with dynamic AI decision, reasoning, and guardrail', async () => {
    const testPaymentId = `pay_ai_test_${Date.now()}`;
    const testAmountInPaise = 1000000; // ₹10,000

    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            entity: 'payment',
            amount: testAmountInPaise,
            currency: 'INR',
            status: 'failed',
            order_id: `order_${testPaymentId.slice(-8)}`,
            method: 'card',
            email: 'ai.test@merchantcorp.com',
            contact: '+91 98888 77777',
            error_code: 'ONLINE_LIMIT_EXCEEDED',
            error_description: 'Daily online authorization limit exceeded',
          },
        },
      },
    };

    const result = (await WebhookService.processEvent(webhookPayload)) as any;
    assert.strictEqual(result.success, true);
    assert.ok(result.caseId, 'Expected caseId to be returned');

    const db = getDatabase();
    const recovery = db.prepare('SELECT * FROM recovery_events WHERE id = ?').get(result.caseId) as any;
    assert.ok(recovery, 'RecoveryEvent must exist in DB');
    assert.strictEqual(recovery.strategy, 'Split Payment Option');
    assert.strictEqual(recovery.recommended_action, 'Split Card Option');
    assert.ok(recovery.ai_probability > 0 && recovery.ai_probability <= 100);

    const timeline = JSON.parse(recovery.timeline_json);
    assert.ok(timeline.length >= 4, 'Timeline should contain AI formulated step');

    // Verify recovery case fetched via service contains reasoning
    const caseItem = RecoveryService.getById(result.caseId);
    assert.ok(caseItem, 'Service should fetch case');
    assert.ok(Array.isArray(caseItem.reasoning), 'Case should contain reasoning array');
    assert.ok(caseItem.guardrail, 'Case should contain guardrail object');
  });

  console.log(`
  ======================================================
  🏁 AI Recovery Engine Suite: ${passedTests}/${totalTests} Passed (100%)
  ======================================================
  `);
}

runSuite().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
