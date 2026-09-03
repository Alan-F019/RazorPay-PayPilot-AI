import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';

export class DashboardController {
  public static getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const period = (req.query.period as string) || '30D';
      const summary = DashboardService.getSummary(period);
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const period = (req.query.period as string) || '30D';
      const trajectory = DashboardService.getTrajectory(period);
      res.json({
        success: true,
        data: trajectory,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static getCauses(req: Request, res: Response, next: NextFunction) {
    try {
      const causes = DashboardService.getCauses();
      res.json({
        success: true,
        data: causes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
