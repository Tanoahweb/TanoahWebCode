export type OfferPopupFrequency = 'once_per_session' | 'once_per_day' | 'always';
export type OfferPopupButtonAction = 'apply_coupon' | 'redirect' | 'copy_only';

export interface OfferPopupConfig {
  // Master switch
  isEnabled: boolean;

  // Trigger & Timing
  delaySeconds: number;
  frequency: OfferPopupFrequency;

  // Media
  imageUrl: string;
  imageAlt: string;

  // Content
  badgeText: string;
  subtitleText: string;
  headlineText: string;
  descriptionText: string;
  couponCode: string;
  couponLabel: string;
  emailPlaceholder: string;
  buttonText: string;
  dismissText: string;
  buttonAction: OfferPopupButtonAction;
  redirectUrl: string;
  successMessage: string;

  // Visibility Controls ("option set which options want to be visible in the popup")
  showImage: boolean;
  showBadge: boolean;
  showBadgeIcon: boolean;
  showSubtitle: boolean;
  showHeadline: boolean;
  showDescription: boolean;
  showDivider: boolean;
  showCouponCode: boolean;
  showEmailInput: boolean;
  showButton: boolean;
  showDismissLink: boolean;
}

export const DEFAULT_OFFER_POPUP_CONFIG: OfferPopupConfig = {
  isEnabled: true,
  delaySeconds: 3,
  frequency: 'once_per_session',

  imageUrl: 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev/offers/special-offer-portrait.jpg',
  imageAlt: 'Special Offer - Linen Apparel',

  badgeText: 'LIMITED TIME',
  subtitleText: 'SPECIAL OFFER',
  headlineText: 'Get 20% OFF',
  descriptionText: 'on your first order',
  couponCode: 'STYLE20',
  couponLabel: 'Use code: ',
  emailPlaceholder: 'Enter your email',
  buttonText: 'UNLOCK OFFER',
  dismissText: 'No thanks',
  buttonAction: 'apply_coupon',
  redirectUrl: '/collections/all',
  successMessage: 'Offer unlocked! Code STYLE20 has been applied to your shopping bag.',

  // Visibility defaults (all visible as in reference)
  showImage: true,
  showBadge: true,
  showBadgeIcon: true,
  showSubtitle: true,
  showHeadline: true,
  showDescription: true,
  showDivider: true,
  showCouponCode: true,
  showEmailInput: true,
  showButton: true,
  showDismissLink: true,
};
