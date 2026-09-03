import { Router, Request, Response } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { TransactionController } from '../controllers/transactionController';
import { RecoveryController } from '../controllers/recoveryController';
import { CustomerController } from '../controllers/customerController';
import { RazorpayController } from '../controllers/razorpayController';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

// Health Check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Razorpay PayPilot-AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Dashboard Endpoints
router.get('/dashboard/summary', DashboardController.getSummary);
router.get('/dashboard/trajectory', DashboardController.getTrajectory);
router.get('/dashboard/causes', DashboardController.getCauses);

// Transaction Endpoints
router.get('/transactions', TransactionController.list);
router.get('/transactions/:id', TransactionController.getById);

// Recovery Event Endpoints
router.get('/recovery-events', RecoveryController.list);
router.get('/recovery-events/:id', RecoveryController.getById);
router.post('/recovery-events/:id/execute-action', RecoveryController.executeAction);
router.post('/recovery-events/:id/escalate', RecoveryController.escalate);
router.post('/recovery-events/:id/resolve', RecoveryController.resolve);

// Customer Endpoints
router.get('/customers', CustomerController.list);
router.get('/customers/:id', CustomerController.getById);

// Audit & Governance Endpoints
router.get('/audit-logs', RecoveryController.getAuditLogs);
router.get('/guardrails', RecoveryController.getGuardrails);

// Razorpay Test Mode Endpoints
router.get('/razorpay/config', RazorpayController.getConfig);
router.post('/razorpay/orders', RazorpayController.createOrder);
router.get('/razorpay/orders/:orderId', RazorpayController.getOrder);
router.get('/razorpay/payments/:paymentId', RazorpayController.getPayment);
router.post('/razorpay/simulate-webhook', RazorpayController.simulateWebhook);

// Razorpay Webhook Ingestion Endpoint
router.post('/webhooks/razorpay', WebhookController.handleRazorpayWebhook);

export default router;
