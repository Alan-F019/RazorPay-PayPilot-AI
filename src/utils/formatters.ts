/**
 * Format currency strictly in Indian numbering format: e.g. ₹1,84,500
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format compact INR for chart ticks, e.g. ₹80k, ₹1.8L
 */
export function formatCompactINR(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₹${amount}`;
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(1)}%`;
}
