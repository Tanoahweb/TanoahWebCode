import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '../product/ProductCard';
import { Product } from '../../types';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { Button } from '../common/Button';

interface NewArrivalsSectionProps {
  products: Product[];
}

export const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({ products }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'best' | 'sale'>('new');
  const containerRef = useGsapReveal({ stagger: 0.08 });

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'new') return p.is_new_arrival;
    if (activeTab === 'best') return p.is_best_seller;
    if (activeTab === 'sale') return p.sale_price != null && p.sale_price < p.base_price;
    return true;
  });

  const displayList = filteredProducts.length > 0 ? filteredProducts.slice(0, 8) : products.slice(0, 8);

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

        {/* Product Grid */}
        <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {displayList.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-14 text-center">
          <Link to="/collections/all">
            <Button
              variant="outline"
              size="lg"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              EXPLORE FULL CATALOG ({products.length} PIECES)
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
