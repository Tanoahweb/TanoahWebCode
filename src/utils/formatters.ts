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

export interface ProductPriceInfo {
  currentPrice: number;
  originalPrice: number;
  isSale: boolean;
  discountPercent: number;
}

export interface PricingInputProduct {
  base_price?: number | null;
  sale_price?: number | null;
  compare_at_price?: number | null;
}

export interface PricingInputVariant {
  price?: number | null;
  sale_price?: number | null;
  compare_at_price?: number | null;
}

export const computeProductPricing = (
  product?: PricingInputProduct | null,
  variant?: PricingInputVariant | null
): ProductPriceInfo => {
  if (!product) {
    return { currentPrice: 0, originalPrice: 0, isSale: false, discountPercent: 0 };
  }

  const vPrice = variant?.price != null && !isNaN(Number(variant.price)) && Number(variant.price) > 0
    ? Number(variant.price)
    : null;
  const pBasePrice = product.base_price != null && !isNaN(Number(product.base_price))
    ? Number(product.base_price)
    : 0;

  // 1. Determine Current Selling Price
  let currentPrice = vPrice ?? pBasePrice;

  // If variant has an explicit sale_price that is lower than variant.price, use it
  if (variant?.sale_price != null && !isNaN(Number(variant.sale_price)) && Number(variant.sale_price) > 0) {
    const vSale = Number(variant.sale_price);
    if (vPrice != null && vSale < vPrice) {
      currentPrice = vSale;
    }
  }

  // 2. Determine Original / MRP Price
  let originalPrice = currentPrice;

  const vCompare = variant?.compare_at_price != null && !isNaN(Number(variant.compare_at_price))
    ? Number(variant.compare_at_price)
    : null;
  const pCompare = product.compare_at_price != null && !isNaN(Number(product.compare_at_price))
    ? Number(product.compare_at_price)
    : null;

  if (vCompare != null && vCompare > currentPrice) {
    originalPrice = vCompare;
  } else if (pCompare != null && pCompare > currentPrice) {
    originalPrice = pCompare;
  } else if (vPrice != null && vPrice > currentPrice) {
    originalPrice = vPrice;
  } else if (product.sale_price != null && pBasePrice > Number(product.sale_price)) {
    // If base_price was saved as MRP and sale_price as discounted selling price
    originalPrice = pBasePrice;
    currentPrice = Number(product.sale_price);
  }

  const isSale = originalPrice > currentPrice && currentPrice > 0;
  const discountPercent = isSale ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  return {
    currentPrice,
    originalPrice,
    isSale,
    discountPercent,
  };
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

