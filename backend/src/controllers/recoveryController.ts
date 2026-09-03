import { Request, Response, NextFunction } from 'express';
import { RecoveryService } from '../services/recoveryService';

export class RecoveryController {
  public static list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, customerId } = req.query;
      const data = RecoveryService.list({
        status: status as string,
        search: search as string,
        customerId: customerId as string,
      });

      res.json({
        success: true,
        data,
        total: data.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const item = RecoveryService.getById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: `Recovery event with ID '${id}' was not found.`,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: item,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static executeAction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { actionName, isManualAuth, actor } = req.body;
      const result = RecoveryService.executeAction(id, actionName, Boolean(isManualAuth), actor);

      res.json({
        success: result.success,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static escalate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = RecoveryService.escalate(id, reason);

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = RecoveryService.resolve(id);

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = RecoveryService.getAuditLogs();
      res.json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getGuardrails(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          maxRetryAttempts: 2,
          maxAutomatedRecoveryAmount: 25000,
          customerContactLimit: 2,
          contactLimitDays: 7,
          escalationAfterFailedAttempts: 2,
          smartRetryBackoffHours: [4, 24, 72],
          autoBlockHighRiskGatewayErrors: true,
          requireManualApprovalAboveAmount: 25000,
          activeWebhookEvents: [
            'payment.failed',
            'subscription.halted',
            'invoice.expired',
            'order.abandoned',
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
