import { getDatabase } from '../db/database';
import { DashboardSummaryResponse, ChartDataPointModel } from '../models/types';

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

  public static getTrajectory(period: string = '30D'): ChartDataPointModel[] {
    // Generate trajectory data points matching frontend ChartDataPoint structure
    if (period === '7D') {
      return [
        { date: 'Aug 18', revenueAtRisk: 22400, revenueRecovered: 8400, recoveryRate: 37.5 },
        { date: 'Aug 19', revenueAtRisk: 25100, revenueRecovered: 10200, recoveryRate: 40.6 },
        { date: 'Aug 20', revenueAtRisk: 28900, revenueRecovered: 11400, recoveryRate: 39.4 },
        { date: 'Aug 21', revenueAtRisk: 24200, revenueRecovered: 9800, recoveryRate: 40.5 },
        { date: 'Aug 22', revenueAtRisk: 31000, revenueRecovered: 12100, recoveryRate: 39.0 },
        { date: 'Aug 23', revenueAtRisk: 26500, revenueRecovered: 10800, recoveryRate: 40.7 },
        { date: 'Aug 24', revenueAtRisk: 26400, revenueRecovered: 9700, recoveryRate: 36.7 },
      ];
    } else if (period === '90D') {
      return [
        { date: 'Jun 01', revenueAtRisk: 112000, revenueRecovered: 41000, recoveryRate: 36.6 },
        { date: 'Jun 15', revenueAtRisk: 128000, revenueRecovered: 48000, recoveryRate: 37.5 },
        { date: 'Jul 01', revenueAtRisk: 145000, revenueRecovered: 55000, recoveryRate: 37.9 },
        { date: 'Jul 15', revenueAtRisk: 160000, revenueRecovered: 62000, recoveryRate: 38.8 },
        { date: 'Aug 01', revenueAtRisk: 172000, revenueRecovered: 68000, recoveryRate: 39.5 },
        { date: 'Aug 24', revenueAtRisk: 184500, revenueRecovered: 72400, recoveryRate: 39.2 },
      ];
    }

    // Default 30D trajectory
    return [
      { date: 'Jul 26', revenueAtRisk: 21000, revenueRecovered: 7800, recoveryRate: 37.1 },
      { date: 'Jul 30', revenueAtRisk: 24500, revenueRecovered: 9500, recoveryRate: 38.7 },
      { date: 'Aug 03', revenueAtRisk: 27800, revenueRecovered: 10900, recoveryRate: 39.2 },
      { date: 'Aug 07', revenueAtRisk: 29400, revenueRecovered: 11800, recoveryRate: 40.1 },
      { date: 'Aug 11', revenueAtRisk: 26200, revenueRecovered: 10400, recoveryRate: 39.7 },
      { date: 'Aug 15', revenueAtRisk: 30100, revenueRecovered: 12200, recoveryRate: 40.5 },
      { date: 'Aug 19', revenueAtRisk: 25100, revenueRecovered: 10200, recoveryRate: 40.6 },
      { date: 'Aug 24', revenueAtRisk: 26400, revenueRecovered: 9700, recoveryRate: 36.7 },
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
