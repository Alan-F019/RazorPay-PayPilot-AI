import { createApp } from './app';
import { config } from './config/env';
import { getDatabase } from './db/database';
import { seedDatabase } from './seed/seed';

const app = createApp();

// Initialize DB and auto-seed if empty
const db = getDatabase();
const customerCount = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
if (customerCount === 0) {
  console.log('[Startup] Empty database detected. Running initial seed...');
  seedDatabase();
}

const server = app.listen(config.port, () => {
  console.log(`
  ======================================================
  🚀 Razorpay PayPilot-AI Backend Server is running!
  ======================================================
  📡 URL:         http://localhost:${config.port}
  🩺 Health API:  http://localhost:${config.port}/api/health
  📊 Summary:     http://localhost:${config.port}/api/dashboard/summary
  💳 Txns API:    http://localhost:${config.port}/api/transactions
  🔄 Recovery:    http://localhost:${config.port}/api/recovery-events
  👥 Customers:   http://localhost:${config.port}/api/customers
  🌐 Frontend:    ${config.frontendUrl}
  ======================================================
  `);
});

export default server;
