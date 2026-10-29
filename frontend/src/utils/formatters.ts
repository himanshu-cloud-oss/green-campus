/**
 * Utility functions for formatting values across the Green Campus AI dashboard.
 */

export function formatCurrencyINR(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatKWh(val: number): string {
  if (isNaN(val)) return '0 kWh';
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(2)} GWh`;
  }
  if (val >= 10000) {
    return `${(val / 1000).toFixed(1)} MWh`;
  }
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(val)} kWh`;
}

export function formatNumberWithCommas(val: number, decimals: number = 0): string {
  if (isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(val: number, decimals: number = 1): string {
  if (isNaN(val)) return '0%';
  return `${val >= 0 ? '+' : ''}${val.toFixed(decimals)}%`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}
