import { Coupon } from '../types';

export const formatPrice = (amount: number | null | undefined, currency: string = 'INR'): string => {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateDiscountPercentage = (originalPrice: number, salePrice: number): number => {
  if (!originalPrice || !salePrice || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export function parseCouponDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCouponDate(dateStr?: string | null): string {
  const d = parseCouponDate(dateStr);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isCouponDateExpired(coupon: { end_date?: string | null }): boolean {
  if (!coupon.end_date) return false;
  const end = parseCouponDate(coupon.end_date);
  if (!end) return false;
  end.setHours(23, 59, 59, 999);
  return new Date() > end;
}

export function isCouponExpired(coupon: {
  end_date?: string | null;
  total_usage_limit?: number | null;
  usage_count?: number | null;
}): boolean {
  if (isCouponDateExpired(coupon)) return true;
  if (coupon.total_usage_limit && (coupon.usage_count || 0) >= coupon.total_usage_limit) {
    return true;
  }
  return false;
}

export function isCouponNotStarted(coupon: { start_date?: string | null }): boolean {
  if (!coupon.start_date) return false;
  const start = parseCouponDate(coupon.start_date);
  if (!start) return false;
  start.setHours(0, 0, 0, 0);
  return new Date() < start;
}

export function isCouponAvailable(coupon: Coupon): boolean {
  if (coupon.is_active === false) return false;
  if (isCouponExpired(coupon)) return false;
  if (isCouponNotStarted(coupon)) return false;
  return true;
}

