import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService';

export class TransactionController {
  public static list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, customerId, startDate, endDate, search } = req.query;
      const result = TransactionService.list({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string,
        customerId: customerId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      });

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const transaction = TransactionService.getById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: `Transaction with ID '${id}' was not found.`,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: transaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
