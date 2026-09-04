import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { ScrollExpand } from '../common/ScrollExpand';
import { useAtelierStore } from '../../store/useAtelierStore';

export const WomenAtelierScrollSection: React.FC = () => {
  const { config, fetchConfig, hasLoaded } = useAtelierStore();

  useEffect(() => {
    if (!hasLoaded) {
      fetchConfig();
    }
  }, [hasLoaded, fetchConfig]);

  if (!config.isEnabled) {
    return null;
  }

  const hasAnyContent =
    (config.showBadge && !!config.badgeText) ||
    (config.showHeading && (!!config.headingLine1 || !!config.headingLine2)) ||
    (config.showDescription && !!config.descriptionText) ||
    (config.showPrimaryButton && !!config.primaryButtonText) ||
    (config.showSecondaryButton && !!config.secondaryButtonText);

  return (
    <section className="relative w-full bg-[#3b3a86]">
      <ScrollExpand
        src={config.imageUrl || '/Assets/editorial/tanoah-women-atelier.jpg'}
        alt={config.imageAlt || 'Tanoah Women Atelier Collection'}
        title={config.showPreviewTitle ? config.previewTitle || "THE WOMEN'S ATELIER" : ''}
        useWindowScroll={true}
        headerOffset={80}
        startWidth={46}
        startHeight={64}
        startRadius={16}
        endRadius={0}
        mediaZoom={1.0}
        objectPosition={config.objectPosition || 'center 30%'}
        scrollDistance={1.2}
        holdDistance={0.4}
        smoothing={0.08}
        overlayScrim={0.55}
        titleClassName="!items-end !pb-14 sm:!pb-16 md:!pb-24"
        className="w-full bg-[#3b3a86]"
      >
        {hasAnyContent && (
          <div className="w-full h-full flex flex-col justify-between md:justify-center items-center md:items-start p-5 sm:p-8 md:p-14 lg:p-20 xl:p-24 pt-7 sm:pt-9 md:pt-14 pb-7 sm:pb-9 md:pb-14 pointer-events-none">
            {/* Top Heading Block (On mobile: positioned at top above model's face; On desktop: flows naturally) */}
            <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl text-center md:text-left space-y-2.5 sm:space-y-3.5 md:space-y-4 pointer-events-auto">
              {/* Eyebrow / Badge */}
              {config.showBadge && config.badgeText && (
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/25 text-[10px] sm:text-xs font-poppins font-medium uppercase tracking-[0.2em] text-white shadow-md">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
                  <span>{config.badgeText}</span>
                </div>
              )}

              {/* Main Heading (Both lines strictly as blocks so Line 2 is always on line 2) */}
              {config.showHeading && (config.headingLine1 || config.headingLine2) && (
                <h2 className="font-wondra text-2xl sm:text-3xl md:text-5xl lg:text-[3.25rem] text-white tracking-wide leading-[1.12] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
                  {config.headingLine1 && (
                    <span className="block">{config.headingLine1}</span>
                  )}
                  {config.headingLine2 && (
                    <span className="block text-white/95 mt-0.5">{config.headingLine2}</span>
                  )}
                </h2>
              )}
            </div>

            {/* Bottom Block (Description & CTAs: at bottom on mobile, directly underneath heading on desktop) */}
            <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl text-center md:text-left space-y-3 sm:space-y-4 md:space-y-5 pointer-events-auto mt-auto md:mt-5">
              {/* Editorial Copy */}
              {config.showDescription && config.descriptionText && (
                <p className="font-poppins text-xs sm:text-sm md:text-base text-white/90 max-w-xl mx-auto md:mx-0 leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] line-clamp-3 sm:line-clamp-none">
                  {config.descriptionText}
                </p>
              )}

              {/* Action CTAs */}
              {(config.showPrimaryButton || config.showSecondaryButton) && (
                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5 sm:gap-4 pt-1">
                  {config.showPrimaryButton && config.primaryButtonText && (
                    <Link
                      to={config.primaryButtonLink || '/collections/women'}
                      className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 bg-white hover:bg-neutral-100 text-black text-xs font-poppins font-bold uppercase tracking-widest rounded-[4px] shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>{config.primaryButtonText}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  )}

                  {config.showSecondaryButton && config.secondaryButtonText && (
                    <Link
                      to={config.secondaryButtonLink || '/lookbook'}
                      className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-md text-xs font-poppins font-semibold uppercase tracking-widest rounded-[4px] shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>{config.secondaryButtonText}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollExpand>
    </section>
  );
};

export default WomenAtelierScrollSection;
