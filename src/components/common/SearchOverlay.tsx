import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { formatPrice } from '../../utils/formatters';
import { api } from '../../services/api';
import { Product } from '../../types';
import { SAMPLE_PRODUCTS } from '../../data/mockData';

const POPULAR_SEARCHES = [
  'Oversized T-Shirts',
  'Linen Shirts',
  'Tailored Trousers',
  'Editorial Dresses',
  'Monochrome Sets',
  'Bomber Jackets',
];

export const SearchOverlay: React.FC = () => {
  const { isSearchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    api.getProducts().then((data) => {
      if (isMounted && data && data.length > 0) {
        setCatalogProducts(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('tanoah_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const handleSearchSubmit = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    const clean = searchTerm.trim();
    const updated = [clean, ...recentSearches.filter((s) => s !== clean)].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('tanoah_recent_searches', JSON.stringify(updated));
    closeSearch();
    navigate(`/collections/all?search=${encodeURIComponent(clean)}`);
  };

  const filteredResults = query.trim()
    ? catalogProducts
        .filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.brand?.toLowerCase().includes(query.toLowerCase()) ||
            p.category_name?.toLowerCase().includes(query.toLowerCase()) ||
            p.product_type?.toLowerCase().includes(query.toLowerCase()) ||
            p.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category_name || p.gender || 'Collection',
          price: p.variants?.[0]?.price ?? p.base_price,
          sale_price: p.variants?.[0]?.sale_price ?? p.sale_price ?? null,
          image: p.images?.[0]?.image_url || '/Assets/products/placeholder-product.svg',
          slug: p.slug,
        }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={closeSearch}
      />

      {/* Main Search Container */}
      <div className="relative bg-white w-full shadow-2xl z-10 border-b border-[#E7E7E7] animate-fade-in">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Top Search Input Bar */}
          <div className="flex items-center gap-4 pb-4 border-b border-[#E7E7E7]">
            <Search className="w-6 h-6 text-[#3F3F8F] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(query);
              }}
              placeholder="Search products, collections, styles, SKUs..."
              className="w-full text-base sm:text-xl font-poppins text-black placeholder-neutral-400 focus:outline-none bg-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-[#888888] hover:text-black text-xs uppercase"
              >
                Clear
              </button>
            )}
            <button
              onClick={closeSearch}
              className="p-2 rounded-full text-black hover:text-[#3F3F8F] hover:bg-[#EEEEF8] transition-colors"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body Content: Predictive results or Suggested Tags */}
          <div className="py-6 max-h-[70vh] overflow-y-auto">
            {query.trim() ? (
              <div>
                <div className="flex justify-between items-center mb-4 text-xs font-poppins uppercase tracking-wider text-[#666666]">
                  <span>Search Results ({filteredResults.length})</span>
                  {filteredResults.length > 0 && (
                    <button
                      onClick={() => handleSearchSubmit(query)}
                      className="text-[#3F3F8F] font-semibold hover:underline flex items-center gap-1"
                    >
                      View All Results <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {filteredResults.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm font-poppins text-[#666666]">
                      No fashion items matched <strong className="text-black">"{query}"</strong>
                    </p>
                    <p className="text-xs text-[#888888]">
                      Try searching with broader terms or browse our popular categories below.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredResults.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.slug}`}
                        onClick={closeSearch}
                        className="group flex gap-3 p-2.5 rounded-[4px] hover:bg-[#F8F8F8] transition-colors border border-transparent hover:border-[#E7E7E7]"
                      >
                        <div className="w-16 h-20 bg-neutral-100 rounded-[2px] overflow-hidden shrink-0">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 text-xs font-poppins flex flex-col justify-center">
                          <span className="text-[10px] text-[#888888] uppercase tracking-wider">
                            {product.category}
                          </span>
                          <h4 className="font-medium text-black group-hover:text-[#3F3F8F] line-clamp-1 mt-0.5">
                            {product.title}
                          </h4>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-semibold text-black">
                              {formatPrice(product.sale_price ?? product.price)}
                            </span>
                            {product.sale_price && (
                              <span className="text-[10px] text-[#888888] line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-poppins">
                {/* Popular Searches */}
                <div>
                  <h4 className="flex items-center gap-1.5 font-semibold text-black uppercase tracking-wider text-xs mb-3">
                    <TrendingUp className="w-4 h-4 text-[#3F3F8F]" />
                    <span>TRENDING SEARCHES</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearchSubmit(term)}
                        className="px-3 py-1.5 bg-[#F8F8F8] hover:bg-[#EEEEF8] hover:text-[#3F3F8F] border border-[#E7E7E7] rounded-[4px] transition-colors text-xs text-[#444444]"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                        RECENT SEARCHES
                      </h4>
                      <button
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem('tanoah_recent_searches');
                        }}
                        className="text-[10px] text-[#888888] hover:text-red-500 uppercase"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleSearchSubmit(term)}
                          className="px-3 py-1.5 bg-white hover:bg-[#EEEEF8] hover:text-[#3F3F8F] border border-[#D5D5ED] rounded-[4px] transition-colors text-xs text-[#333333]"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
