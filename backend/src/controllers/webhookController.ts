import { Request, Response, NextFunction } from 'express';
import { RazorpayService } from '../services/razorpayService';
import { WebhookService } from '../services/webhookService';

export class WebhookController {
  /**
   * POST /api/webhooks/razorpay
   * Ingest and verify inbound Razorpay webhook events
   */
  public static async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      if (!signature) {
        WebhookService.recordAuditLog({
          caseId: 'SYSTEM',
          customerName: 'Anonymous Webhook Client',
          action: 'Invalid webhook signature rejected',
          amount: 0,
          trigger: 'Inbound Webhook',
          result: 'Blocked by policy',
          policyEvaluated: 'HMAC-SHA256 Signature Guardrail',
          blockedReason: 'Missing x-razorpay-signature header',
        });

        return res.status(400).json({
          success: false,
          error: 'Webhook verification failed: Missing x-razorpay-signature header.',
          timestamp: new Date().toISOString(),
        });
      }

      // Verify HMAC-SHA256 Signature over raw request bytes
      const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);

      if (!isValid) {
        console.warn('[Webhook] Rejected webhook with invalid signature.');
        WebhookService.recordAuditLog({
          caseId: 'SYSTEM',
          customerName: 'Razorpay Gateway',
          action: 'Invalid webhook signature rejected',
          amount: 0,
          trigger: req.body?.event || 'Unknown Webhook',
          result: 'Blocked by policy',
          policyEvaluated: 'HMAC-SHA256 Signature Guardrail',
          blockedReason: 'HMAC-SHA256 signature mismatch on raw payload',
        });

        return res.status(400).json({
          success: false,
          error: 'Webhook verification failed: Invalid x-razorpay-signature.',
          timestamp: new Date().toISOString(),
        });
      }

      // Process event idempotently
      const result = await WebhookService.processEvent(req.body);

      return res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook event:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal webhook processing error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
