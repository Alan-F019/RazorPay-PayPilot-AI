import { getDatabase } from '../db/database';
import { PaginatedResponse, TransactionModel } from '../models/types';

export interface TransactionFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class TransactionService {
  public static list(params: TransactionFilterParams = {}): PaginatedResponse<any> {
    const db = getDatabase();
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.status && params.status !== 'all') {
      conditions.push('t.status = ?');
      values.push(params.status);
    }

    if (params.customerId) {
      conditions.push('t.customer_id = ?');
      values.push(params.customerId);
    }

    if (params.startDate) {
      conditions.push('t.created_at >= ?');
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push('t.created_at <= ?');
      values.push(params.endDate);
    }

    if (params.search) {
      conditions.push('(t.id LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR t.razorpay_payment_id LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as count 
      FROM transactions t 
      LEFT JOIN customers c ON t.customer_id = c.id 
      ${whereClause}
    `;
    const countRow = db.prepare(countSql).get(...values) as { count: number };
    const total = countRow ? countRow.count : 0;

    const querySql = `
      SELECT 
        t.id,
        t.customer_id as customerId,
        c.name as customerName,
        c.email as customerEmail,
        t.amount,
        t.currency,
        t.status,
        t.payment_method as paymentMethod,
        t.decline_code as declineCode,
        t.decline_reason as declineReason,
        t.failure_reason as failureReason,
        t.razorpay_payment_id as razorpayPaymentId,
        t.razorpay_order_id as razorpayOrderId,
        t.created_at as createdAt,
        r.id as recoveryEventId,
        r.status as recoveryStatus,
        r.strategy as recoveryStrategy,
        r.action_taken as recoveryActionTaken
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN recovery_events r ON t.id = r.transaction_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(querySql).all(...values, limit, offset);

    return {
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static getById(id: string) {
    const db = getDatabase();
    const sql = `
      SELECT 
        t.id,
        t.customer_id as customerId,
        c.name as customerName,
        c.email as customerEmail,
        c.phone as customerPhone,
        c.tier as customerTier,
        t.amount,
        t.currency,
        t.status,
        t.payment_method as paymentMethod,
        t.decline_code as declineCode,
        t.decline_reason as declineReason,
        t.failure_reason as failureReason,
        t.razorpay_payment_id as razorpayPaymentId,
        t.razorpay_order_id as razorpayOrderId,
        t.created_at as createdAt
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.id = ?
    `;

    const transaction = db.prepare(sql).get(id) as any;
    if (!transaction) return null;

    const recoveryEvent = db.prepare(`
      SELECT 
        id,
        reason,
        status,
        amount,
        strategy,
        ai_probability as aiProbability,
        recommended_action as recommendedAction,
        why_explanation as whyExplanation,
        decision_explanation as decisionExplanation,
        action_taken as actionTaken,
        policy_applied as policyApplied,
        approval_status as approvalStatus,
        is_automated as isAutomated,
        payment_link_url as paymentLinkUrl,
        timeline_json as timelineJson,
        created_at as createdAt,
        recovered_at as recoveredAt
      FROM recovery_events
      WHERE transaction_id = ?
    `).get(id) as any;

    if (recoveryEvent && recoveryEvent.timelineJson) {
      try {
        recoveryEvent.timeline = JSON.parse(recoveryEvent.timelineJson);
      } catch (e) {
        recoveryEvent.timeline = [];
      }
      delete recoveryEvent.timelineJson;
    }

    return {
      ...transaction,
      recovery: recoveryEvent || null,
    };
  }
}
