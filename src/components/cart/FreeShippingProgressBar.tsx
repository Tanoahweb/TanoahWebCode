import React, { useState, useEffect, useMemo } from 'react';
import { Truck, CheckCircle2, Sparkles } from 'lucide-react';
import { formatPrice, isCouponAvailable } from '../../utils/formatters';
import { api, isProductInCollection } from '../../services/api';
import { Coupon, CartItem, Collection } from '../../types';

interface FreeShippingProgressBarProps {
  subtotal: number;
  threshold?: number;
  coupons?: Coupon[];
  items?: CartItem[];
  collections?: Collection[];
}

interface MilestoneCandidate {
  type: 'free_shipping' | 'coupon';
  targetSpend: number;
  currentSpend: number;
  remaining: number;
  rewardText: string;
  code?: string;
  collectionName?: string;
  iconType: 'truck' | 'sparkles';
  weight: number;
}

export const FreeShippingProgressBar: React.FC<FreeShippingProgressBarProps> = ({
  subtotal,
  threshold = 1999,
  coupons,
  items = [],
  collections,
}) => {
  const [localCoupons, setLocalCoupons] = useState<Coupon[]>([]);
  const [localCollections, setLocalCollections] = useState<Collection[]>([]);

  // Load fallback coupons and collections if not passed via props
  useEffect(() => {
    let isMounted = true;
    if (!coupons) {
      api.getCoupons().then((cpns) => {
        if (isMounted && cpns) setLocalCoupons(cpns);
      });
    }
    if (!collections) {
      api.getCollections().then((cols) => {
        if (isMounted && cols) setLocalCollections(cols);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [coupons, collections]);

  const activeCoupons = coupons || localCoupons;
  const activeCollections = collections || localCollections;

  // Calculate the nearest possible locked offer / milestone
  const { nearest, isAllUnlocked } = useMemo(() => {
    const candidates: MilestoneCandidate[] = [];
    const freeShipThreshold = threshold || 1999;

    // 1. Free Shipping candidate (if not unlocked yet)
    if (freeShipThreshold > 0 && subtotal < freeShipThreshold) {
      candidates.push({
        type: 'free_shipping',
        targetSpend: freeShipThreshold,
        currentSpend: subtotal,
        remaining: Math.max(0, freeShipThreshold - subtotal),
        rewardText: 'FREE SHIPPING',
        iconType: 'truck',
        weight: 10,
      });
    }

    // 2. Active coupon candidates with minimum spend requirement
    const validCoupons = activeCoupons.filter((c) => isCouponAvailable(c));

    for (const c of validCoupons) {
      if (!c.min_spend || c.min_spend <= 0) continue;

      const hasCollections = Boolean(c.eligible_collections && c.eligible_collections.length > 0);

      let reward = '';
      if (c.discount_type === 'percentage') {
        reward = `${c.discount_value}% OFF (CODE: ${c.code})`;
      } else if (c.discount_type === 'free_shipping') {
        reward = `FREE SHIPPING (CODE: ${c.code})`;
      } else {
        reward = `₹${c.discount_value} OFF (CODE: ${c.code})`;
      }

      if (hasCollections) {
        const matchingItems = items.filter((item) =>
          c.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
        );

        const colNames = c.eligible_collections!
          .map((slug) => activeCollections.find((col) => col.slug === slug || col.id === slug)?.title || slug)
          .join(', ');

        if (matchingItems.length > 0) {
          const matchingSubtotal = matchingItems.reduce((acc, item) => {
            const price =
              item.variant?.sale_price ??
              item.variant?.price ??
              item.product?.sale_price ??
              item.product?.base_price ??
              0;
            return acc + price * item.quantity;
          }, 0);

          if (matchingSubtotal < c.min_spend) {
            candidates.push({
              type: 'coupon',
              targetSpend: c.min_spend,
              currentSpend: matchingSubtotal,
              remaining: Math.max(0, Math.round(c.min_spend - matchingSubtotal)),
              rewardText: reward,
              code: c.code,
              collectionName: colNames,
              iconType: 'sparkles',
              weight: c.discount_value || 5,
            });
          }
        } else if (subtotal < c.min_spend) {
          // No items from this collection yet, requires adding from collection
          candidates.push({
            type: 'coupon',
            targetSpend: c.min_spend,
            currentSpend: subtotal,
            remaining: Math.max(0, Math.round(c.min_spend - subtotal)),
            rewardText: reward,
            code: c.code,
            collectionName: colNames,
            iconType: 'sparkles',
            weight: (c.discount_value || 5) - 2,
          });
        }
      } else {
        // Storewide minimum spend coupon
        if (subtotal < c.min_spend) {
          candidates.push({
            type: 'coupon',
            targetSpend: c.min_spend,
            currentSpend: subtotal,
            remaining: Math.max(0, Math.round(c.min_spend - subtotal)),
            rewardText: reward,
            code: c.code,
            iconType: 'sparkles',
            weight: c.discount_value || 5,
          });
        }
      }
    }

    // Sort candidates to find the NEAREST offer (smallest remaining extra spend)
    candidates.sort((a, b) => {
      if (a.remaining !== b.remaining) {
        return a.remaining - b.remaining;
      }
      return b.weight - a.weight;
    });

    const nearestTarget = candidates.length > 0 ? candidates[0] : null;
    const isUnlocked = !nearestTarget && subtotal >= freeShipThreshold;

    return {
      nearest: nearestTarget,
      isAllUnlocked: isUnlocked,
    };
  }, [subtotal, threshold, activeCoupons, activeCollections, items]);

  // Calculate visual progress percentage
  const percentage = useMemo(() => {
    if (isAllUnlocked) return 100;
    if (!nearest || nearest.targetSpend <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((nearest.currentSpend / nearest.targetSpend) * 100)));
  }, [isAllUnlocked, nearest]);

  return (
    <div className="bg-[#EEEEF8] p-3.5 rounded-[4px] border border-[#D5D5ED]/50 font-poppins text-xs">
      <div className="flex items-center gap-2 mb-2 font-medium text-black">
        {isAllUnlocked ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span className="text-[#3F3F8F] font-semibold">
              You have unlocked FREE SHIPPING & all available offers!
            </span>
          </>
        ) : nearest ? (
          <>
            {nearest.iconType === 'truck' ? (
              <Truck className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            )}
            <span>
              Add <strong className="text-[#3F3F8F]">{formatPrice(nearest.remaining)}</strong> more
              {nearest.collectionName ? ` of "${nearest.collectionName}"` : ''} to unlock{' '}
              <strong className="text-[#3F3F8F]">{nearest.rewardText}</strong>
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span className="text-[#3F3F8F] font-semibold">
              You have unlocked FREE COMPLIMENTARY SHIPPING!
            </span>
          </>
        )}
      </div>

      <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#D5D5ED]">
        <div
          className="bg-[#3F3F8F] h-full transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
