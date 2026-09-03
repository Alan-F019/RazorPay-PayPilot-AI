# PayPilot AI — Autonomous Revenue Recovery for Razorpay

> AI-powered agentic commerce platform for smarter payment workflows and autonomous revenue recovery.

## 🏗️ Architecture

```text
React 19 + Vite + TailwindCSS
            │
            ▼
     Express REST API
            │
            ▼
 Node.js + TypeScript Backend
            │
            ▼
      SQLite Database
```

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite 6, TailwindCSS 4, Lucide Icons, Motion
* **Backend:** Node.js, Express 4, TypeScript, tsx
* **Database:** SQLite
* **Tooling:** TypeScript 5.8, Concurrently, Dotenv

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
```

### Seed Demo Data

```bash
npm run seed
```

### Run

```bash
npm run dev
```

* Frontend: `http://localhost:3000`
* Backend: `http://localhost:5000`

Run independently:

```bash
npm run dev:backend
npm run dev:frontend
```

## 🔌 API

| Method | Endpoint                                  | Purpose                    |
| ------ | ----------------------------------------- | -------------------------- |
| GET    | `/api/health`                             | Service health             |
| GET    | `/api/dashboard/summary`                  | Revenue & recovery metrics |
| GET    | `/api/dashboard/trajectory`               | Revenue trajectory         |
| GET    | `/api/dashboard/causes`                   | Failure causes             |
| GET    | `/api/transactions`                       | Transaction listing        |
| GET    | `/api/transactions/:id`                   | Transaction details        |
| GET    | `/api/recovery-events`                    | Recovery cases             |
| GET    | `/api/recovery-events/:id`                | Recovery case details      |
| POST   | `/api/recovery-events/:id/execute-action` | Execute recovery action    |
| POST   | `/api/recovery-events/:id/escalate`       | Escalate case              |
| POST   | `/api/recovery-events/:id/resolve`        | Resolve case               |
| GET    | `/api/customers`                          | Customer accounts          |
| GET    | `/api/customers/:id`                      | Customer details           |
| GET    | `/api/audit-logs`                         | Audit trail                |
| GET    | `/api/guardrails`                         | Safety guardrails          |

## 🗄️ Data Model

```text
Customer
   │
   ├── Transactions
   │       │
   │       └── Recovery Events
   │
   └── Recovery Events

Recovery Events
        │
        └── Audit Logs
```

The database stores customer profiles, transactions, recovery cases, and audit information. Razorpay payment/order IDs are included in the transaction model for integration with Razorpay services.

## 🔄 Recovery Workflow

```text
Payment Issue
     ↓
Recovery Case
     ↓
Analysis & Recommendation
     ↓
Guardrail Check
     ↓
Action
     ↓
Recovered / Escalated / Resolved
     ↓
Audit Log
```

## 🧪 Verification

```bash
npm run lint
npm run build
```

The current implementation passes TypeScript checking and the production build successfully.

## 🔮 Roadmap

* Razorpay Test Mode integration
* Razorpay payment APIs & webhooks
* Real-time payment failure detection
* Automated recovery workflows
* AI-powered recovery recommendations
* Agentic recovery actions
* Advanced revenue intelligence

---

**PayPilot AI**

**Detect → Understand → Decide → Act → Recover**
