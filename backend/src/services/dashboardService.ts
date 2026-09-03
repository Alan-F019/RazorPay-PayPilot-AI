import { getDatabase } from '../db/database';
import { DashboardSummaryResponse } from '../models/types';

export class DashboardService {
  public static getSummary(period: string = '30D'): DashboardSummaryResponse {
    const db = getDatabase();

    // Calculate metrics from database
    const totalRevRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'captured'
    `).get() as { total: number };

    const recoveredRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM recovery_events
      WHERE status = 'recovered'
    `).get() as { total: number; count: number };

    const atRiskRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM recovery_events
      WHERE status IN ('pending', 'in_progress', 'blocked', 'escalated', 'needs_review')
    `).get() as { total: number; count: number };

    const lostRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = 'failed'
      AND id NOT IN (SELECT transaction_id FROM recovery_events WHERE status = 'recovered')
      AND id NOT IN (SELECT transaction_id FROM recovery_events WHERE status IN ('pending', 'in_progress'))
    `).get() as { total: number };

    const affectedTransactionsRow = db.prepare(`
      SELECT COUNT(DISTINCT transaction_id) as count
      FROM recovery_events
    `).get() as { count: number };

    const affectedCustomersRow = db.prepare(`
      SELECT COUNT(DISTINCT customer_id) as count
      FROM recovery_events
    `).get() as { count: number };

    const activeCasesRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM recovery_events
      WHERE status != 'recovered'
    `).get() as { count: number };

    const casesRequiringActionRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM recovery_events
      WHERE status IN ('pending', 'needs_review', 'in_progress', 'blocked', 'escalated')
    `).get() as { count: number };

    const totalRevenue = totalRevRow.total;
    const revenueRecovered = recoveredRow.total;
    const revenueAtRisk = atRiskRow.total;
    const revenueLost = lostRow.total;
    const totalRecoveryPool = revenueRecovered + revenueAtRisk;
    const recoveryRate = totalRecoveryPool > 0
      ? Number(((revenueRecovered / totalRecoveryPool) * 100).toFixed(1))
      : 0;

    return {
      totalRevenue,
      revenueRecovered,
      revenueAtRisk,
      revenueLost,
      recoveryRate,
      affectedTransactions: affectedTransactionsRow.count,
      affectedCustomers: affectedCustomersRow.count,
      activeCasesCount: activeCasesRow.count,
      casesRequiringAction: casesRequiringActionRow.count,
      successfulRecoveriesCount: recoveredRow.count,
      avgRecoveryTime: '4h 18m',
      trendVsPrevious: 12.4,
      period,
    };
  }

  public static getTrajectory(period: string = '30D') {
    // Generate trajectory data points
    if (period === '7D') {
      return [
        { date: 'Mon', atRisk: 12000, recovered: 4500, baselineLoss: 8000 },
        { date: 'Tue', atRisk: 15400, recovered: 7200, baselineLoss: 9500 },
        { date: 'Wed', atRisk: 9800, recovered: 4100, baselineLoss: 6200 },
        { date: 'Thu', atRisk: 18200, recovered: 8900, baselineLoss: 11000 },
        { date: 'Fri', atRisk: 14600, recovered: 6800, baselineLoss: 9200 },
        { date: 'Sat', atRisk: 8400, recovered: 3900, baselineLoss: 5100 },
        { date: 'Sun', atRisk: 11200, recovered: 5600, baselineLoss: 7400 },
      ];
    } else if (period === '90D') {
      return [
        { date: 'Month 1', atRisk: 165000, recovered: 68000, baselineLoss: 112000 },
        { date: 'Month 2', atRisk: 188000, recovered: 79500, baselineLoss: 124000 },
        { date: 'Month 3', atRisk: 187200, recovered: 71000, baselineLoss: 121000 },
      ];
    }

    // Default 30D trajectory
    return [
      { date: 'Aug 01', atRisk: 18000, recovered: 7200, baselineLoss: 12000 },
      { date: 'Aug 05', atRisk: 24000, recovered: 9800, baselineLoss: 16000 },
      { date: 'Aug 10', atRisk: 31000, recovered: 14200, baselineLoss: 21000 },
      { date: 'Aug 15', atRisk: 42000, recovered: 19800, baselineLoss: 28000 },
      { date: 'Aug 20', atRisk: 53000, recovered: 26400, baselineLoss: 36000 },
      { date: 'Aug 24', atRisk: 62800, recovered: 32900, baselineLoss: 43000 },
    ];
  }

  public static getCauses() {
    return [
      {
        id: 'payment_failure',
        title: 'Payment Failures',
        amount: 82400,
        count: 148,
        percentage: 44.7,
        color: '#2563EB',
      },
      {
        id: 'checkout_abandonment',
        title: 'Checkout Abandonment',
        amount: 46200,
        count: 89,
        percentage: 25.0,
        color: '#0284C7',
      },
      {
        id: 'subscription_failure',
        title: 'Subscription Failures',
        amount: 31800,
        count: 54,
        percentage: 17.2,
        color: '#4F46E5',
      },
      {
        id: 'overdue_invoice',
        title: 'Overdue Invoices',
        amount: 24100,
        count: 36,
        percentage: 13.1,
        color: '#64748B',
      },
    ];
  }
}
