import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = config.databaseUrl;
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(dbPath);

  // Enable Foreign Keys and WAL mode
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  initSchema(dbInstance);

  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      business_type TEXT,
      tier TEXT DEFAULT 'Standard',
      health_score TEXT DEFAULT 'Healthy',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      decline_code TEXT,
      decline_reason TEXT,
      failure_reason TEXT,
      razorpay_payment_id TEXT,
      razorpay_order_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

    CREATE TABLE IF NOT EXISTS recovery_events (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      strategy TEXT,
      ai_probability INTEGER DEFAULT 75,
      recommended_action TEXT,
      why_explanation TEXT,
      decision_explanation TEXT,
      action_taken TEXT,
      policy_applied TEXT,
      approval_status TEXT,
      is_automated INTEGER DEFAULT 1,
      payment_link_url TEXT,
      timeline_json TEXT,
      created_at TEXT NOT NULL,
      recovered_at TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recovery_events_status ON recovery_events(status);
    CREATE INDEX IF NOT EXISTS idx_recovery_events_transaction_id ON recovery_events(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_recovery_events_customer_id ON recovery_events(customer_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      case_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      action TEXT NOT NULL,
      amount REAL NOT NULL,
      trigger_event TEXT NOT NULL,
      result TEXT NOT NULL,
      policy_evaluated TEXT NOT NULL,
      blocked_reason TEXT,
      execution_channel TEXT NOT NULL,
      actor TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
  `);
}
