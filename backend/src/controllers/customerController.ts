import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';

export class CustomerController {
  public static list(req: Request, res: Response, next: NextFunction) {
    try {
      const { tier, search } = req.query;
      const customers = CustomerService.list({
        tier: tier as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: customers,
        total: customers.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const customer = CustomerService.getById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: `Customer with ID '${id}' was not found.`,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: customer,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
