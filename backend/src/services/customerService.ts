import { getDatabase } from '../db/database';

export interface CustomerFilterParams {
  tier?: string;
  search?: string;
}

export class CustomerService {
  public static list(params: CustomerFilterParams = {}) {
    const db = getDatabase();
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.tier && params.tier !== 'all') {
      conditions.push('LOWER(c.tier) = LOWER(?)');
      values.push(params.tier);
    }

    if (params.search) {
      const s = `%${params.search}%`;
      conditions.push('(c.id LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR c.business_type LIKE ?)');
      values.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.business_type as businessType,
        c.tier,
        c.health_score as healthScore,
        c.created_at as createdAt,
        COALESCE(SUM(t.amount), 0) as totalVolume,
        COALESCE(SUM(CASE WHEN r.status = 'recovered' THEN r.amount ELSE 0 END), 0) as totalRecovered,
        COALESCE(SUM(CASE WHEN r.status IN ('pending', 'in_progress', 'blocked', 'escalated', 'needs_review') THEN r.amount ELSE 0 END), 0) as totalAtRisk,
        COUNT(CASE WHEN r.status IN ('pending', 'in_progress', 'blocked', 'escalated', 'needs_review') THEN 1 ELSE NULL END) as activeCasesCount,
        COUNT(CASE WHEN t.status = 'failed' THEN 1 ELSE NULL END) as failureCount
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      LEFT JOIN recovery_events r ON c.id = r.customer_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY totalVolume DESC
    `;

    const rows = db.prepare(sql).all(...values) as any[];

    return rows.map((row) => {
      const totalPool = (row.totalRecovered || 0) + (row.totalAtRisk || 0);
      const recoveryRate = totalPool > 0
        ? Number(((row.totalRecovered / totalPool) * 100).toFixed(1))
        : 100.0;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || '+91 98000 00000',
        businessType: row.businessType || 'General Merchant',
        totalVolume: row.totalVolume || 0,
        totalAtRisk: row.totalAtRisk || 0,
        totalRecovered: row.totalRecovered || 0,
        recoveryRate,
        activeCasesCount: row.activeCasesCount || 0,
        failureCount: row.failureCount || 0,
        contactCountLast7Days: row.activeCasesCount > 0 ? 1 : 0,
        contactLimit: 2,
        tier: row.tier || 'Standard',
        healthScore: row.healthScore || (row.activeCasesCount > 1 ? 'High Risk' : row.activeCasesCount === 1 ? 'Needs Attention' : 'Healthy'),
        lastActivity: row.createdAt,
      };
    });
  }

  public static getById(id: string) {
    const list = this.list({ search: id });
    return list.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase()) || null;
  }
}
