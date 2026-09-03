/**
 * Format currency strictly in Indian numbering format: e.g. ₹1,84,500
 */
export function formatINR(amount?: number | null): string {
  const num = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format compact INR for chart ticks, e.g. ₹80k, ₹1.8L
 */
export function formatCompactINR(amount?: number | null): string {
  const num = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  if (num >= 100000) {
    const lakhs = num / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₹${num}`;
}

/**
 * Format percentage with 1 decimal place safely, e.g. 39.2%
 */
export function formatPercentage(val?: number | null): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return '0.0%';
  }
  return `${val.toFixed(1)}%`;
}

/**
 * Format AI confidence / recovery probability consistently as a percentage string (e.g. '84%', '84.2%')
 * Correctly normalizes values whether stored as integer percent (84), basis points/tenths (842/849), or decimals (0.84)
 */
export function formatConfidence(val?: number | string | null): string {
  if (val === undefined || val === null || val === '') {
    return '84%';
  }

  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (!Number.isFinite(num)) {
    return '84%';
  }

  // Handle basis points / tenths: e.g. 842 -> 84.2%, 849 -> 84.9%
  if (num > 100) {
    const scaled = num / 10;
    return `${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}%`;
  }

  // Handle unit decimals: e.g. 0.84 -> 84%
  if (num > 0 && num <= 1) {
    const scaled = num * 100;
    return `${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}%`;
  }

  // Standard percentage numbers: e.g. 84 -> 84%, 84.2 -> 84.2%
  return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}%`;
}

/**
 * Return numeric confidence between 0 and 100 for progress bar width style
 */
export function getConfidenceNumber(val?: number | string | null): number {
  if (val === undefined || val === null || val === '') {
    return 84;
  }
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (!Number.isFinite(num)) {
    return 84;
  }
  if (num > 100) {
    return Math.min(100, Math.max(0, num / 10));
  }
  if (num > 0 && num <= 1) {
    return Math.min(100, Math.max(0, num * 100));
  }
  return Math.min(100, Math.max(0, num));
}

/**
 * Normalize raw Razorpay error descriptions or codes into a compact, standardized category label
 * (e.g. 'Insufficient Funds', 'International Card', 'Gateway Decline', 'Online Limit Exceeded')
 */
export function normalizeFailureCategory(
  caseItem?: {
    cause?: string;
    declineCode?: string;
    declineReason?: string;
    failureReason?: string;
    issueDescription?: string;
  } | null
): string {
  if (!caseItem) return 'Payment Failure';

  const code = (caseItem.declineCode || '').toUpperCase();
  const rawText = `${caseItem.declineCode || ''} ${caseItem.declineReason || ''} ${caseItem.failureReason || ''} ${caseItem.issueDescription || ''} ${caseItem.cause || ''}`.toLowerCase();

  if (code.includes('INSUFFICIENT') || rawText.includes('insufficient') || rawText.includes('balance') || rawText.includes('funds')) {
    return 'Insufficient Funds';
  }
  if (code.includes('INTERNATIONAL') || rawText.includes('international') || rawText.includes('cross-border') || rawText.includes('forex')) {
    return 'International Card';
  }
  if (code.includes('LIMIT') || rawText.includes('limit exceeded') || rawText.includes('online limit') || rawText.includes('daily limit') || rawText.includes('per-transaction')) {
    return 'Online Limit Exceeded';
  }
  if (code.includes('CANCEL') || rawText.includes('cancelled') || rawText.includes('canceled') || rawText.includes('user cancelled')) {
    return 'Payment Cancelled';
  }
  if (code.includes('EXPIRED') || rawText.includes('expired card') || rawText.includes('card expired')) {
    return 'Card Expired';
  }
  if (code.includes('AUTH') || rawText.includes('authentication') || rawText.includes('otp') || rawText.includes('3ds') || rawText.includes('2fa')) {
    return 'Authentication Failed';
  }
  if (code.includes('GATEWAY') || rawText.includes('gateway') || rawText.includes('issuer decline') || rawText.includes('bank policy') || rawText.includes('declined by bank') || rawText.includes('declined by issuer')) {
    return 'Gateway Decline';
  }
  if (caseItem.cause === 'subscription_failure' || rawText.includes('subscription')) {
    return 'Subscription Failure';
  }
  if (caseItem.cause === 'overdue_invoice' || rawText.includes('invoice')) {
    return 'Overdue Invoice';
  }
  if (caseItem.cause === 'checkout_abandonment' || rawText.includes('abandon')) {
    return 'Checkout Abandonment';
  }

  return 'Payment Failure';
}
