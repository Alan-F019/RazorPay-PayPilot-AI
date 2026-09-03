import { Request, Response, NextFunction } from 'express';
import { RazorpayService } from '../services/razorpayService';
import { WebhookService, WebhookPayload } from '../services/webhookService';
import { config } from '../config/env';

export class RazorpayController {
  /**
   * GET /api/razorpay/config
   * Returns safe public configuration for frontend Razorpay checkout modal
   */
  public static async getConfig(req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        keyId: config.razorpay.keyId,
        currency: 'INR',
        name: 'PayPilot AI',
        description: 'Revenue Recovery & Agentic Checkout',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * POST /api/razorpay/orders
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, currency, receipt, notes } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Field "amount" is required and must be a positive number representing the smallest currency unit (e.g. paise).',
          timestamp: new Date().toISOString(),
        });
      }

      const order = await RazorpayService.createOrder({
        amount,
        currency,
        receipt,
        notes,
      });

      res.status(201).json({
        success: true,
        order,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/razorpay/payments/:paymentId
   */
  public static async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Parameter "paymentId" is required.',
          timestamp: new Date().toISOString(),
        });
      }

      const payment = await RazorpayService.fetchPayment(paymentId);

      res.json({
        success: true,
        payment,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/razorpay/orders/:orderId
   */
  public static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Parameter "orderId" is required.',
          timestamp: new Date().toISOString(),
        });
      }

      const order = await RazorpayService.fetchOrder(orderId);

      res.json({
        success: true,
        order,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/razorpay/simulate-webhook
   * Server-side test mechanism that creates a simulated Razorpay webhook payload
   * and runs it securely through the existing WebhookService pipeline.
   * NEVER exposes RAZORPAY_WEBHOOK_SECRET to the client.
   */
  public static async simulateWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        amount, // in rupees
        currency = 'INR',
        customerName = 'Test Customer',
        customerEmail = 'customer@test.com',
        customerPhone = '+91 98765 43210',
        outcome = 'failed', // 'failed' | 'captured'
        declineCode = 'INSUFFICIENT_FUNDS',
        declineReason = 'Card issuer reported insufficient funds',
        orderId,
        paymentId: customPaymentId,
      } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Field "amount" (in INR) is required.',
          timestamp: new Date().toISOString(),
        });
      }

      const paymentId = customPaymentId || `pay_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const resolvedOrderId = orderId || `order_sim_${Date.now().toString(36)}`;
      const amountInPaise = Math.round(amount * 100);
      const isFailed = outcome === 'failed';
      const eventType = isFailed ? 'payment.failed' : 'payment.captured';

      const payload: WebhookPayload = {
        entity: 'event',
        account_id: 'acc_paypilot_sim',
        event: eventType,
        contains: ['payment'],
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: paymentId,
              entity: 'payment',
              amount: amountInPaise,
              currency,
              status: isFailed ? 'failed' : 'captured',
              order_id: resolvedOrderId,
              method: 'card',
              email: customerEmail,
              contact: customerPhone,
              error_code: isFailed ? declineCode : undefined,
              error_description: isFailed ? declineReason : undefined,
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
      };

      // Process payload directly through WebhookService
      const result = await WebhookService.processEvent(payload);

      res.status(200).json({
        success: true,
        simulation: true,
        event: eventType,
        paymentId,
        orderId: resolvedOrderId,
        amount,
        customerName,
        customerEmail,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
}
