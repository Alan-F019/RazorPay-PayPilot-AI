# PayPilot AI — Autonomous Revenue Recovery for Razorpay

> AI-powered agentic commerce platform for smarter payment workflows and autonomous revenue recovery.

## 🏗️ Architecture

```text
React 19 + Vite + TailwindCSS
            │
            ▼
     Express REST API ◄── Razorpay Webhooks (HMAC-SHA256)
            │
            ▼
 Node.js + TypeScript Backend ──► Razorpay Test API
            │
            ▼
      SQLite Database (paypilot.db)
```

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite 6, TailwindCSS 4, Lucide Icons, Motion
* **Backend:** Node.js, Express 4, TypeScript, tsx, Razorpay Node SDK
* **Database:** SQLite (WAL mode, Foreign Keys, Persistent Webhook Idempotency)
* **Tooling:** TypeScript 5.8, Concurrently, Dotenv

---

## 🚀 Quick Start

### Install

```bash
git clone <repository-url>
cd razorpay-PayPilot-AI
npm install
```

### Configure Environment

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

### Seed Demo Data

```bash
npm run seed
```

### Run Application

```bash
npm run dev
```

* Frontend Dashboard: `http://localhost:3000`
* Backend API: `http://localhost:5000`

---

## 💳 Razorpay Test Mode Integration

> [!NOTE]
> This integration runs strictly in **Razorpay Test / Sandbox Mode**. No production credentials or real money movement are involved.

### 1. Test Mode Endpoints

| Method | Endpoint | Description | Sample Body / Params |
|---|---|---|---|
| `POST` | `/api/razorpay/orders` | Create Razorpay test order | `{ "amount": 50000, "currency": "INR", "receipt": "rcpt_01" }` |
| `GET` | `/api/razorpay/orders/:orderId` | Fetch Razorpay order details | Path parameter `orderId` |
| `GET` | `/api/razorpay/payments/:paymentId` | Fetch Razorpay payment details | Path parameter `paymentId` |
| `POST` | `/api/webhooks/razorpay` | Inbound webhook ingestion | Headers: `x-razorpay-signature` |

### 2. Supported Webhook Events

* `payment.failed`: Automatically creates/updates `Transaction`, generates a new `RecoveryEvent` with AI dunning strategy and dynamic 1-click payment link, and records an `AuditLog`.
* `payment.captured` / `payment.authorized`: Updates `Transaction.status = 'captured'`, resolves any active associated `RecoveryEvent` to `'recovered'`, and records an `AuditLog`.
* `order.paid`: Confirms order settlement and updates related records.

### 3. Webhook Signature Verification

All webhook requests to `/api/webhooks/razorpay` are verified using HMAC-SHA256 calculated over the **exact raw request body bytes**:

$$\text{Signature} = \text{HMAC-SHA256}(\text{rawBodyBuffer}, \text{RAZORPAY\_WEBHOOK\_SECRET})$$

Requests with missing or invalid `x-razorpay-signature` headers are rejected with **HTTP 400 Bad Request** and an audit log is recorded.

### 4. Webhook Idempotency

Duplicate deliveries from Razorpay are persistently tracked in SQLite (`webhook_events` table with unique constraint on `event_id`). Re-delivered events are acknowledged and safely skipped without creating duplicate transactions, recovery cases, or audit logs.

### 5. 🧪 Interactive Test Payment Playground

PayPilot AI includes a built-in interactive **Razorpay Test Payment Playground** accessible directly from the top Header and Sidebar.

It supports:
* **Interactive Amounts**: Quick preset chips (`₹100`, `₹500`, `₹1,000`, `₹5,000`, `₹10,000`, `₹50,000`) and custom amounts.
* **Two Operating Modes**:
  1. **Live Razorpay Test Checkout**: Launches the genuine Razorpay Standard Checkout SDK modal (`checkout.js`) with sandbox payment options.
  2. **PayPilot Test Simulation (Outcome Simulator)**: Securely triggers backend-generated, HMAC-SHA256 verified webhook events (`payment.failed` with various decline reasons or `payment.captured`) without exposing any secrets to the client.
* **Instant Feedback & Case Navigation**: Live Order ID, Payment ID, and a direct clickable **`[ View Recovery Case ]`** button to immediately inspect the resulting recovery case and AI strategy in the drawer.

### 6. Automated Local Webhook Test Suite

Run the comprehensive integration test suite simulating signed webhooks, duplicate delivery, invalid signatures, order creation, and recovery workflows:

```bash
npm run test:webhook
```

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
| ------ | ----------------------------------------- | -------------------------- |
| GET    | `/api/health` | Service health status |
| GET    | `/api/dashboard/summary` | Revenue & recovery metrics |
| GET    | `/api/dashboard/trajectory` | Revenue trajectory chart series |
| GET    | `/api/dashboard/causes` | Failure causes breakdown |
| GET    | `/api/transactions` | Paginated transaction listing |
| GET    | `/api/transactions/:id` | Transaction details with joined recovery |
| GET    | `/api/recovery-events` | Active recovery pipeline cases |
| GET    | `/api/recovery-events/:id` | Single recovery case details |
| POST   | `/api/recovery-events/:id/execute-action` | Trigger 1-click recovery / retry |
| POST   | `/api/recovery-events/:id/escalate` | Escalate case to ops queue |
| POST   | `/api/recovery-events/:id/resolve` | Mark case resolved manually |
| GET    | `/api/customers` | Customer accounts & yields |
| GET    | `/api/customers/:id` | Customer profile & lifetime stats |
| GET    | `/api/audit-logs` | Immutable audit log trail |
| GET    | `/api/guardrails` | Active merchant guardrails |
| POST   | `/api/razorpay/orders` | Create Razorpay test order |
| GET    | `/api/razorpay/orders/:orderId` | Fetch Razorpay order |
| GET    | `/api/razorpay/payments/:paymentId` | Fetch Razorpay payment |
| POST   | `/api/webhooks/razorpay` | Razorpay webhook receiver |

---

## 🗄️ Relational Data Model

```text
Customer
   │
   ├── Transactions (FK: customer_id)
   │       │
   │       └── Recovery Events (FK: transaction_id, customer_id)
   │               │
   │               └── Audit Logs
   │
Webhook Events (Persistent Idempotency: event_id UNIQUE)
```

---

## 🧪 Verification & Build

```bash
# Type check TypeScript codebase
npm run lint

# Build frontend production bundle
npm run build

# Run local webhook & Razorpay test suite
npm run test:webhook
```

---

**PayPilot AI** — *Detect → Understand → Decide → Act → Recover*
