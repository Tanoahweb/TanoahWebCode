import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { Button } from '../common/Button';
import { api } from '../../services/api';

interface NewArrivalsSectionProps {
  products?: Product[];
}

export const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({ products: initialProducts }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'best' | 'sale'>('new');
  const [cache, setCache] = useState<Record<string, Product[]>>(() => {
    const base: Record<string, Product[]> = {};
    if (initialProducts && initialProducts.length > 0) {
      base.new = initialProducts.slice(0, 8);
    }
    return base;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!cache['new'] || cache['new'].length === 0);
  const containerRef = useGsapReveal({ stagger: 0.08 });

  // On-demand fetch for active tab (only runs if tab is not already cached)
  useEffect(() => {
    let isMounted = true;

    if (cache[activeTab] && cache[activeTab].length > 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api
      .getShowcaseProductsByTab(activeTab, 8)
      .then((items) => {
        if (isMounted) {
          setCache((prev) => ({
            ...prev,
            [activeTab]: items,
          }));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`Error loading showcase products for ${activeTab}:`, err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Invalidate cache and refetch active tab whenever products are updated in Admin
  useEffect(() => {
    const handleProductUpdate = () => {
      setCache({});
      setIsLoading(true);
      api.getShowcaseProductsByTab(activeTab, 8).then((items) => {
        setCache({ [activeTab]: items });
        setIsLoading(false);
      });
    };

    window.addEventListener('tanoah_products_updated', handleProductUpdate);
    return () => {
      window.removeEventListener('tanoah_products_updated', handleProductUpdate);
    };
  }, [activeTab]);

  const displayList = cache[activeTab] || [];

  return (
    <section className="py-20 bg-white border-b border-[#E7E7E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-[#E7E7E7] pb-6">
          <div>
            <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
              HAUTE COUTURE SELECTIONS
            </span>
            <h2 className="font-wondra text-3xl sm:text-4xl text-black">
              SIGNATURE RELEASES
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 text-xs font-poppins uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('new')}
              className={`pb-2 transition-all cursor-pointer font-medium ${
                activeTab === 'new'
                  ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F] font-semibold'
                  : 'text-[#666666] hover:text-black'
              }`}
            >
              NEW ARRIVALS
            </button>
            <button
              onClick={() => setActiveTab('best')}
              className={`pb-2 transition-all cursor-pointer font-medium ${
                activeTab === 'best'
                  ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F] font-semibold'
                  : 'text-[#666666] hover:text-black'
              }`}
            >
              BEST SELLERS
            </button>
            <button
              onClick={() => setActiveTab('sale')}
              className={`pb-2 transition-all cursor-pointer font-medium ${
                activeTab === 'sale'
                  ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F] font-semibold'
                  : 'text-[#666666] hover:text-black'
              }`}
            >
              SPECIAL OFFERS
            </button>
          </div>
        </div>

        {/* Product Grid or Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] bg-[#F4F4F3] rounded-[2px]" />
                <div className="h-3.5 bg-[#ECECEB] rounded w-3/4" />
                <div className="h-3 bg-[#ECECEB] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div key={activeTab} ref={containerRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {displayList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* View All CTA */}
        <div className="mt-14 text-center">
          <Link to="/collections/all">
            <Button
              variant="outline"
              size="lg"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              EXPLORE FULL ATELIER COLLECTION
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
