# PayPilot AI — Autonomous Revenue Recovery for Razorpay

> Autonomous agentic revenue recovery platform that detects failed checkouts, formulates explainable recovery decisions, and recovers lost revenue within enterprise merchant guardrails.

---

## 🏗️ Architecture

```text
React 19 + Vite + TailwindCSS 4
            │
            ▼
     Express REST API ◄── Razorpay Webhooks (HMAC-SHA256)
            │
            ├──► Razorpay Test Mode API Sync (client.payments.all)
            │
            ▼
    Node.js + TypeScript Backend (AI Multi-Signal Decision Engine)
            │
            ▼
      SQLite Database (paypilot.db: WAL mode + Foreign Keys)
```

---

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite 6, TailwindCSS 4, Lucide Icons, Motion
* **Backend:** Node.js, Express 4, TypeScript 5.8, tsx, Official Razorpay Node SDK
* **Database:** SQLite (WAL mode, Foreign Keys, Persistent Webhook Idempotency)
* **Tooling:** TypeScript, Concurrently, Dotenv

---

## 🧠 AI Decision Engine Architecture

PayPilot AI utilizes a **deterministic, explainable, multi-signal decision model** rather than an ungrounded black-box LLM. 

When a payment fails, Razorpay provides the ground-truth transaction and decline telemetry. PayPilot AI synthesizes these signals to calculate recovery probability and recommend tailored dunning workflows:

1. **Failure Category Classification**: Normalizes gateway decline codes (`INSUFFICIENT_FUNDS`, `ONLINE_LIMIT_EXCEEDED`, `GATEWAY_DECLINE_POLICY`, `EXPIRED_CARD`, `TIMEOUT`, `AUTHENTICATION_FAILED`).
2. **Customer Reliability Signals**: Factors in customer account tier (`Enterprise`, `Growth`, `Standard`), health score (`Healthy`, `Needs Attention`, `High Risk`), and historical recovery yield.
3. **Attempt & Fatigue Penalties**: Dynamically penalizes probability on repeat attempts to avoid customer notification fatigue.
4. **Guardrail Governance**: Automatically enforces amount thresholds (₹25,000 ceiling requiring manual merchant authorization) and a 2-attempt circuit breaker before assigning cases to operations.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
git clone <repository-url>
cd razorpay-PayPilot-AI
npm install
```

### 2. Configure Environment

Create `.env` from `.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=./data/paypilot.db
FRONTEND_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:5000/api

# Razorpay Test Mode Credentials (Sandbox Only)
RAZORPAY_KEY_ID=rzp_test_placeholder_key
RAZORPAY_KEY_SECRET=rzp_test_placeholder_secret
RAZORPAY_WEBHOOK_SECRET=paypilot_webhook_secret_test
```

### 3. Seed Deterministic Baseline Data

```bash
npm run seed
```

### 4. Run Application

```bash
npm run dev
```

* Frontend Dashboard: `http://localhost:3000`
* Backend API: `http://localhost:5000`

---

## 💳 Razorpay Test Mode & Webhook Integration

> [!NOTE]
> This integration runs strictly in **Razorpay Test / Sandbox Mode**. No production credentials or real money movement are involved.

### 1. Proactive Live Payment Sync (`POST /api/razorpay/sync`)

In addition to event-driven webhooks, PayPilot AI actively synchronizes payments directly from the Razorpay Test Mode API via `client.payments.all()`:
* **Deterministic Deduplication**: Maps payments to `id = txn_${payment.id.toLowerCase()}` to prevent duplicate transactions across repeated syncs and webhooks.
* **State Evolution**: If an active failed transaction transitions to `captured`, the sync resolves the linked recovery event (`status = 'recovered'`, `recovered_amount = payment.amount / 100`).
* **Standalone Success Isolation**: Directly successful payments persist into `transactions` without creating extraneous recovery cases.

### 2. Webhook Ingestion & Signature Verification

All inbound webhooks to `/api/webhooks/razorpay` are verified using HMAC-SHA256 calculated over the exact raw request bytes:

$$\text{Signature} = \text{HMAC-SHA256}(\text{rawBodyBuffer}, \text{RAZORPAY\_WEBHOOK\_SECRET})$$

* **`payment.failed`**: Ingests decline data, evaluates AI strategy, and opens an active Recovery Case.
* **`payment.captured` / `order.paid`**: Settle transactions and mark linked recovery cases as recovered.
* **Persistent Idempotency**: Tracked via the SQLite `webhook_events` table (`event_id UNIQUE`).

### 3. 🧪 Interactive Test Payment Playground

Accessible directly from the top Header and Sidebar, the Playground offers two distinct execution modes:

* **`SIMULATED WEBHOOK ENGINE`**: Deterministic backend-generated, HMAC-signed webhook simulation. Ideal for testing AI diagnosis, guardrail blocks, and recovery outcomes instantly without launching a browser checkout modal.
* **`LIVE RAZORPAY TEST MODE`**: Launches the official Razorpay Standard Checkout SDK popup (`checkout.js`) against your active sandbox test keys. Real test transactions can subsequently be refreshed into the dashboard via live API sync.

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
| ------ | ----------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/health`                             | Service health status |
| GET    | `/api/dashboard/summary`                  | Revenue & recovery metrics (Live DB queries) |
| GET    | `/api/dashboard/trajectory`               | Revenue trajectory chart velocity series |
| GET    | `/api/dashboard/causes`                   | Failure causes breakdown |
| GET    | `/api/transactions`                       | Paginated transaction listing |
| GET    | `/api/transactions/:id`                   | Transaction details with joined recovery data |
| GET    | `/api/recovery-events`                    | Active recovery pipeline cases |
| GET    | `/api/recovery-events/:id`                | Single recovery case details & timeline |
| POST   | `/api/recovery-events/:id/execute-action` | Dispatch 1-click recovery action / retry |
| POST   | `/api/recovery-events/:id/escalate`       | Escalate case to merchant operations queue |
| POST   | `/api/recovery-events/:id/resolve`        | Mark case resolved manually |
| GET    | `/api/customers`                          | Customer accounts & recovery yields |
| GET    | `/api/customers/:id`                      | Customer profile & lifetime statistics |
| GET    | `/api/audit-logs`                         | Immutable governance & policy audit trail |
| GET    | `/api/guardrails`                         | Active merchant guardrail configurations |
| POST   | `/api/razorpay/sync`                      | Proactively pull & sync live payments from Razorpay |
| POST   | `/api/razorpay/orders`                    | Create Razorpay test order |
| GET    | `/api/razorpay/orders/:orderId`           | Fetch Razorpay order from API |
| GET    | `/api/razorpay/payments/:paymentId`       | Fetch Razorpay payment from API |
| POST   | `/api/razorpay/simulate-webhook`          | Trigger signed webhook simulation |
| POST   | `/api/webhooks/razorpay`                  | Razorpay inbound webhook receiver |

---

## 🧪 Verification & Automated Testing

PayPilot AI includes a comprehensive automated test suite with **55/55 assertions passing (100%)**:

| Test Suite | Assertions | Focus Areas |
|---|---:|---|
| **AI Decision Engine Suite** | 10/10 | Multi-signal probability scoring, failure classification, enterprise priority, ₹25k cap, 2-attempt limit, settled case lock. |
| **Recovery Outcome Engine Suite** | 11/11 | Attempt state progression, Attempt 2 in-progress & recovery isolation, manual authorization override, settlement resolution, failed retry escalation. |
| **Razorpay Webhook & Test Mode Suite**| 15/15 | Order creation, HMAC-SHA256 signature verification, duplicate webhook idempotency, invalid signature rejection. |
| **Live Payment Sync Suite** | 19/19 | `client.payments.all()` sync, transaction upsert, webhook coexistence, failed → captured resolution, standalone isolation, graceful offline fallback. |
| **Total Automated Assertions** | **55/55** | **100% Passing** |

### Run Test Suite

```bash
# Run the complete 55-assertion test suite
npm test

# Type-check TypeScript codebase
npm run lint

# Build frontend production bundle
npm run build
```

---

**PayPilot AI** — *Detect → Understand → Decide → Act → Recover*
