import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import {
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  Grid3X3,
  Grid2X2,
  Square,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { SAMPLE_PRODUCTS, SAMPLE_COLLECTIONS } from '../data/mockData';
import { formatPrice } from '../utils/formatters';
import { useGsapReveal } from '../hooks/useGsapReveal';
import { api } from '../services/api';
import { Product, Collection } from '../types';
import { SEOHead } from '../components/common/SEOHead';
import { generateCollectionJsonLd, normalizeCanonicalUrl } from '../services/seoEngine';

const DEFAULT_PRODUCT_TYPES = [
  'T-Shirt',
  'Oversized Tee',
  'Shirt',
  'Trousers',
  'Dress',
  'Sarees',
  'Kurtas',
  'A-Line top',
  'Co-ord Set',
  'Jacket',
];

const DEFAULT_CATALOG_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const DEFAULT_CATALOG_COLORS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Beige', hex: '#D4C4A8' },
  { name: 'Navy', hex: '#1E293B' },
  { name: 'Olive', hex: '#4A5D4E' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Brown', hex: '#5D4037' },
  { name: 'Rust', hex: '#9C4124' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Lavender', hex: '#967BB6' },
];

const getPaginationPages = (currentPage: number, total: number): (number | string)[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (currentPage >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total];
};

export const CatalogPage: React.FC = () => {
  const { collection: routeCollection } = useParams<{ collection: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCollection = (routeCollection || searchParams.get('collection') || 'all').toLowerCase();
  const typeParam = searchParams.get('type') || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [collectionsList, setCollectionsList] = useState<Collection[]>(SAMPLE_COLLECTIONS);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(typeParam ? [typeParam] : []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(10000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [mobileColumns, setMobileColumns] = useState<1 | 2>(2);

  const catalogTopRef = useRef<HTMLDivElement>(null);
  const containerRef = useGsapReveal({ stagger: 0.06 });

  // Collections & Realtime Updates
  useEffect(() => {
    let isMounted = true;
    api.getCollections().then((cols) => {
      if (isMounted && cols && cols.length > 0) setCollectionsList(cols);
    });

    const handleProductsUpdated = () => setRefreshNonce((n) => n + 1);
    const handleCollectionsUpdated = () => {
      api.getCollections().then((cols) => {
        if (isMounted && cols && cols.length > 0) setCollectionsList(cols);
      });
    };

    window.addEventListener('tanoah_products_updated', handleProductsUpdated);
    window.addEventListener('tanoah_collections_updated', handleCollectionsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_products_updated', handleProductsUpdated);
      window.removeEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    };
  }, []);

  useEffect(() => {
    if (typeParam) {
      setSelectedTypes([typeParam]);
    }
  }, [typeParam]);

  // Paginated Product Loading (12 per batch, reducing unwanted API calls)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api
      .getPaginatedProducts({
        page: pageParam,
        limit: 12,
        collection: currentCollection,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        gender: selectedGender !== 'all' ? selectedGender : undefined,
        search: searchParam || undefined,
        maxPrice: priceRange < 10000 ? priceRange : undefined,
        sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
        colors: selectedColors.length > 0 ? selectedColors : undefined,
        inStockOnly,
        sortBy,
        statusFilter: 'active',
      })
      .then((res) => {
        if (isMounted) {
          setProductsList(res.products);
          setTotalCount(res.totalCount);
          setTotalPages(res.totalPages);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching paginated catalog products:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    currentCollection,
    pageParam,
    selectedGender,
    selectedTypes,
    priceRange,
    inStockOnly,
    selectedSizes,
    selectedColors,
    sortBy,
    searchParam,
    refreshNonce,
  ]);

  // Keep page URL parameter valid if total pages shrinks
  useEffect(() => {
    if (!isLoading && totalPages > 0 && pageParam > totalPages) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        return next;
      });
    }
  }, [isLoading, totalPages, pageParam, setSearchParams]);

  const activeCollection = collectionsList.find(
    (c) => c.slug.toLowerCase() === currentCollection
  ) || (
    currentCollection === 'men' ? {
      title: "MEN'S COLLECTION",
      description: 'Handcrafted luxury tailoring, structured tees, relaxed linen shirts and trousers.',
      banner_image: '/Assets/hero/hero-landscape.jpg',
    } : currentCollection === 'women' ? {
      title: "WOMEN'S COLLECTION",
      description: 'Fluid drape dresses, artisanal sarees, silk tops and sculptural tailored silhouettes.',
      banner_image: '/Assets/hero/hero-mobile.jpg',
    } : currentCollection === 'sale' ? {
      title: 'SPECIAL ARCHIVAL OFFERS',
      description: 'Seasonal reductions and archival pieces crafted with exceptional heritage precision.',
      banner_image: '/Assets/hero/hero-landscape.jpg',
    } : currentCollection === 'new-arrivals' ? {
      title: 'NEW ARRIVALS SS26',
      description: 'The latest silhouettes, handwoven textiles, and modern minimalist essentials.',
      banner_image: '/Assets/hero/hero-mobile.jpg',
    } : currentCollection === 'best-sellers' ? {
      title: 'TANOAH BEST SELLERS',
      description: 'Our most sought-after signature pieces, worn and cherished by patrons worldwide.',
      banner_image: '/Assets/hero/hero-landscape.jpg',
    } : currentCollection === 'monochrome' ? {
      title: 'THE MONOCHROME EDIT',
      description: 'Pure tonal minimalism in noir black, slate navy, and optical ivory.',
      banner_image: '/Assets/hero/hero-mobile.jpg',
    } : {
      title: 'THE COMPLETE WARDROBE',
      description: 'Explore all timeless bespoke designs, tailored essentials, and modern silhouettes.',
      banner_image: '/Assets/hero/hero-landscape.jpg',
    }
  );

  // Available filter choices (curated defaults combined with live loaded product traits)
  const allProductTypes = useMemo(() => {
    const fromLoaded = productsList.map((p) => p.product_type).filter(Boolean);
    return Array.from(new Set([...DEFAULT_PRODUCT_TYPES, ...fromLoaded]));
  }, [productsList]);

  const allSizes = useMemo(() => {
    const fromLoaded = productsList.flatMap((p) => p.variants.map((v) => v.size)).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATALOG_SIZES, ...fromLoaded]));
  }, [productsList]);

  const allColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    DEFAULT_CATALOG_COLORS.forEach((c) => map.set(c.name.toLowerCase(), c));
    productsList.flatMap((p) => p.variants).forEach((v) => {
      if (v.color_name) {
        map.set(v.color_name.toLowerCase(), { name: v.color_name, hex: v.color_hex || '#000000' });
      }
    });
    return Array.from(map.values());
  }, [productsList]);

  const resetPageParam = () => {
    if (searchParams.get('page') && searchParams.get('page') !== '1') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        return next;
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === pageParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const clearAllFilters = () => {
    setSelectedGender('all');
    setSelectedTypes([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange(10000);
    setInStockOnly(false);
    setSearchParams({});
  };

  const hasActiveFilters =
    selectedGender !== 'all' ||
    selectedTypes.length > 0 ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    inStockOnly ||
    priceRange < 10000 ||
    Boolean(searchParam);

  const startItem = totalCount === 0 ? 0 : (pageParam - 1) * 12 + 1;
  const endItem = Math.min(totalCount, pageParam * 12);
  const paginationPages = useMemo(() => getPaginationPages(pageParam, totalPages), [pageParam, totalPages]);

  return (
    <div className="w-full bg-white font-poppins min-h-screen">
      <SEOHead
        title={`${activeCollection.title} | TANOAH`}
        description={activeCollection.description}
        canonical={normalizeCanonicalUrl(`/collections/${currentCollection}`)}
        type="website"
        jsonLd={generateCollectionJsonLd(activeCollection.title, productsList, `/collections/${currentCollection}`)}
      />
      {/* Editorial Collection Header Banner */}
      <div className="relative bg-[#F8F8F8] py-16 sm:py-24 border-b border-[#E7E7E7] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Breadcrumb */}
          <div className="flex justify-center items-center gap-2 text-[11px] text-[#666666] tracking-widest uppercase mb-4">
            <Link to="/" className="hover:text-black">Home</Link>
            <span>/</span>
            <Link to="/collections/all" className="hover:text-black">Collections</Link>
            <span>/</span>
            <span className="text-[#3F3F8F] font-semibold">{activeCollection.title}</span>
          </div>

          <h1 className="font-wondra text-3xl sm:text-5xl lg:text-6xl text-black tracking-tight uppercase">
            {activeCollection.title}
          </h1>

          <p className="text-xs sm:text-sm text-[#666666] max-w-xl mx-auto mt-3 font-light leading-relaxed">
            {activeCollection.description}
          </p>

          <div className="mt-4 text-[11px] text-[#888888] tracking-wider uppercase font-medium">
            Showing {productsList.length} {productsList.length === 1 ? 'Item' : 'Items'}
          </div>
        </div>
      </div>

      {/* Main Catalog Body */}
      <div ref={catalogTopRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Filter and Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7E7E7] text-xs">
          {/* Mobile Actions: Filter Button + Mobile Grid Switcher */}
          <div className="lg:hidden flex items-center justify-between w-full sm:w-auto gap-3">
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] font-semibold text-black uppercase tracking-wider text-xs active:bg-[#EEEEF8] transition-colors"
            >
              <Filter className="w-4 h-4 text-[#3F3F8F]" />
              <span>Filters {hasActiveFilters && '(Active)'}</span>
            </button>

            {/* Mobile 1-col vs 2-col switcher */}
            <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-[4px] border border-[#E7E7E7]">
              <button
                onClick={() => setMobileColumns(1)}
                className={`p-1.5 rounded transition-colors ${mobileColumns === 1 ? 'text-[#3F3F8F] bg-white shadow-xs font-semibold' : 'text-[#666666] hover:text-black'}`}
                title="1 Column (Large Editorial)"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileColumns(2)}
                className={`p-1.5 rounded transition-colors ${mobileColumns === 2 ? 'text-[#3F3F8F] bg-white shadow-xs font-semibold' : 'text-[#666666] hover:text-black'}`}
                title="2 Columns (Compact Grid)"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Grid Layout Switcher (2, 3, 4 Columns) */}
          <div className="hidden lg:flex items-center gap-2 text-[#666666] bg-[#F8F8F8] px-2.5 py-1.5 rounded-[4px] border border-[#E7E7E7]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888888] mr-1">GRID:</span>
            <button
              onClick={() => setGridColumns(2)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${gridColumns === 2 ? 'text-[#3F3F8F] bg-white shadow-xs' : 'hover:text-black'}`}
              title="2 Columns (Editorial Lookbook)"
            >
              2 COL
            </button>
            <button
              onClick={() => setGridColumns(3)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${gridColumns === 3 ? 'text-[#3F3F8F] bg-white shadow-xs' : 'hover:text-black'}`}
              title="3 Columns (Balanced Showcase)"
            >
              3 COL
            </button>
            <button
              onClick={() => setGridColumns(4)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${gridColumns === 4 ? 'text-[#3F3F8F] bg-white shadow-xs' : 'hover:text-black'}`}
              title="4 Columns (High Density)"
            >
              4 COL
            </button>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedGender !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  {selectedGender}
                  <button onClick={() => { setSelectedGender('all'); resetPageParam(); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTypes.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  {t}
                  <button onClick={() => { setSelectedTypes(selectedTypes.filter((x) => x !== t)); resetPageParam(); }}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-[#666666] hover:text-red-500 underline uppercase"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[#888888] uppercase tracking-wider hidden sm:inline">
              SORT BY:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  resetPageParam();
                }}
                className="appearance-none bg-white border border-[#E7E7E7] rounded-[4px] px-3 py-2 pr-8 text-xs font-medium text-black focus:outline-none focus:border-[#3F3F8F] uppercase cursor-pointer"
              >
                <option value="featured">Featured Releases</option>
                <option value="newest">Newest Arrivals</option>
                <option value="bestseller">Best Selling</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="discount">Highest Discount %</option>
                <option value="alpha-asc">Alphabetical: A–Z</option>
                <option value="alpha-desc">Alphabetical: Z–A</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#666666] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content Layout: Left Sidebar Filters + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          {/* Desktop Left Sidebar Filter (Col 3) */}
          <div className="hidden lg:block lg:col-span-3 space-y-8 pr-4 text-xs font-poppins text-left">
            {/* Availability / In-Stock Section */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                AVAILABILITY
              </h4>
              <label className="flex items-center gap-2 cursor-pointer hover:text-[#3F3F8F] text-[#444444]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    resetPageParam();
                  }}
                  className="accent-[#3F3F8F] rounded"
                />
                <span className="font-medium">In-Stock Only</span>
              </label>
            </div>

            {/* Gender Section */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                DEPARTMENT
              </h4>
              <div className="space-y-2 text-[#444444]">
                {['all', 'men', 'women', 'unisex'].map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer hover:text-[#3F3F8F]">
                    <input
                      type="radio"
                      name="gender"
                      checked={selectedGender === g}
                      onChange={() => {
                        setSelectedGender(g);
                        resetPageParam();
                      }}
                      className="accent-[#3F3F8F]"
                    />
                    <span className="uppercase">{g === 'all' ? 'All Collections' : g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Type Section */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                PRODUCT TYPE
              </h4>
              <div className="space-y-2 text-[#444444]">
                {allProductTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer hover:text-[#3F3F8F]">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes([...selectedTypes, type]);
                        } else {
                          setSelectedTypes(selectedTypes.filter((t) => t !== type));
                        }
                        resetPageParam();
                      }}
                      className="accent-[#3F3F8F]"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  MAX PRICE
                </h4>
                <span className="font-semibold text-[#3F3F8F]">{formatPrice(priceRange)}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  resetPageParam();
                }}
                className="w-full accent-[#3F3F8F] cursor-pointer"
              />
            </div>

            {/* Size Section */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                SIZE
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {allSizes.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSizes(selectedSizes.filter((s) => s !== size));
                        } else {
                          setSelectedSizes([...selectedSizes, size]);
                        }
                        resetPageParam();
                      }}
                      className={`py-2 text-xs font-medium uppercase rounded-[4px] border transition-all ${
                        isSelected
                          ? 'border-[#3F3F8F] bg-[#3F3F8F] text-white'
                          : 'border-[#E7E7E7] text-black hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-3">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                COLOR PALETTE
              </h4>
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedColors(selectedColors.filter((c) => c !== color.name));
                        } else {
                          setSelectedColors([...selectedColors, color.name]);
                        }
                        resetPageParam();
                      }}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        isSelected
                          ? 'border-[#3F3F8F] scale-125 ring-2 ring-[#3F3F8F]/40'
                          : 'border-neutral-300 hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Product Grid Area (Col 9) */}
          <div className="lg:col-span-9">
            {isLoading ? (
              <div
                className={`grid ${
                  mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'
                } ${
                  gridColumns === 2
                    ? 'lg:grid-cols-2'
                    : gridColumns === 3
                    ? 'lg:grid-cols-3'
                    : 'lg:grid-cols-4'
                } gap-4 sm:gap-6 lg:gap-8`}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`skel-${idx}`} className="animate-pulse space-y-3">
                    <div className="bg-[#F0F0F0] rounded-[4px] aspect-3/4 w-full" />
                    <div className="h-3 bg-[#F0F0F0] rounded w-3/4" />
                    <div className="h-3 bg-[#F0F0F0] rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : productsList.length === 0 ? (
              <div className="py-24 text-center space-y-4 bg-[#F8F8F8] rounded-[4px] border border-[#E7E7E7]">
                <h3 className="font-wondra text-2xl text-black">NO SILHOUETTES FOUND</h3>
                <p className="text-xs text-[#666666] max-w-sm mx-auto">
                  No products match your active filter criteria. Try adjusting your filters or price range.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-[#3F3F8F] text-white text-xs font-semibold rounded-[4px] uppercase tracking-wider hover:bg-[#343476] transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  ref={containerRef}
                  className={`grid ${
                    mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  } ${
                    gridColumns === 2
                      ? 'lg:grid-cols-2'
                      : gridColumns === 3
                      ? 'lg:grid-cols-3'
                      : 'lg:grid-cols-4'
                  } gap-4 sm:gap-6 lg:gap-8`}
                >
                  {productsList.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Luxury Pagination Bar */}
                {totalPages > 1 && (
                  <div className="mt-12 pt-8 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#666666] tracking-wider uppercase font-medium">
                      Showing <span className="font-semibold text-black">{startItem}</span>–<span className="font-semibold text-black">{endItem}</span> of <span className="font-semibold text-black">{totalCount}</span> pieces
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePageChange(pageParam - 1)}
                        disabled={pageParam <= 1 || isLoading}
                        aria-label="Previous Page"
                        className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-[4px] border border-[#E7E7E7] text-black bg-white hover:border-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#E7E7E7] transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Prev
                      </button>

                      <div className="flex items-center gap-1">
                        {paginationPages.map((p, idx) => {
                          if (typeof p === 'string') {
                            return (
                              <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-[#888888] select-none">
                                …
                              </span>
                            );
                          }
                          const isActive = p === pageParam;
                          return (
                            <button
                              key={`page-${p}`}
                              onClick={() => handlePageChange(p)}
                              disabled={isLoading}
                              className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-[4px] border transition-colors ${
                                isActive
                                  ? 'bg-[#3F3F8F] text-white border-[#3F3F8F] shadow-xs'
                                  : 'bg-white text-black border-[#E7E7E7] hover:border-black'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(pageParam + 1)}
                        disabled={pageParam >= totalPages || isLoading}
                        aria-label="Next Page"
                        className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-[4px] border border-[#E7E7E7] text-black bg-white hover:border-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#E7E7E7] transition-colors"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Slide-out Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Sliding Drawer Container */}
          <div className="relative z-10 w-full max-w-sm bg-white h-full shadow-2xl flex flex-col font-poppins text-xs overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E7E7] bg-[#F8F8F8]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#3F3F8F]" />
                <span className="font-wondra text-lg text-black">FILTER GARMENTS</span>
                {hasActiveFilters && (
                  <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 hover:text-[#3F3F8F] transition-colors"
                aria-label="Close Filters"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left">
              {/* Availability */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  AVAILABILITY
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-[#444444]">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      resetPageParam();
                    }}
                    className="accent-[#3F3F8F] w-4 h-4 rounded"
                  />
                  <span className="font-medium text-xs">In-Stock Pieces Only</span>
                </label>
              </div>

              {/* Department */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  DEPARTMENT
                </h4>
                <div className="space-y-2 text-[#444444]">
                  {['all', 'men', 'women', 'unisex'].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer hover:text-[#3F3F8F]">
                      <input
                        type="radio"
                        name="mobile_gender"
                        checked={selectedGender === g}
                        onChange={() => {
                          setSelectedGender(g);
                          resetPageParam();
                        }}
                        className="accent-[#3F3F8F] w-4 h-4"
                      />
                      <span className="uppercase text-xs">{g === 'all' ? 'All Collections' : g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Type */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  PRODUCT TYPE
                </h4>
                <div className="space-y-2 text-[#444444]">
                  {allProductTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer hover:text-[#3F3F8F]">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTypes([...selectedTypes, type]);
                          } else {
                            setSelectedTypes(selectedTypes.filter((t) => t !== type));
                          }
                          resetPageParam();
                        }}
                        className="accent-[#3F3F8F] w-4 h-4 rounded"
                      />
                      <span className="text-xs">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <div className="flex justify-between items-center text-xs">
                  <h4 className="font-semibold text-black uppercase tracking-wider">
                    MAXIMUM PRICE
                  </h4>
                  <span className="font-semibold text-[#3F3F8F] font-mono">
                    {formatPrice(priceRange)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={10000}
                  step={250}
                  value={priceRange}
                  onChange={(e) => {
                    setPriceRange(Number(e.target.value));
                    resetPageParam();
                  }}
                  className="w-full accent-[#3F3F8F] cursor-pointer"
                />
              </div>

              {/* Sizes */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  SIZE
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {allSizes.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSizes(selectedSizes.filter((s) => s !== size));
                          } else {
                            setSelectedSizes([...selectedSizes, size]);
                          }
                          resetPageParam();
                        }}
                        className={`py-2 text-xs font-medium uppercase rounded-[4px] border transition-all ${
                          isSelected
                            ? 'border-[#3F3F8F] bg-[#3F3F8F] text-white'
                            : 'border-[#E7E7E7] text-black'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  COLOR PALETTE
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {allColors.map((color) => {
                    const isSelected = selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedColors(selectedColors.filter((c) => c !== color.name));
                          } else {
                            setSelectedColors([...selectedColors, color.name]);
                          }
                          resetPageParam();
                        }}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          isSelected
                            ? 'border-[#3F3F8F] scale-110 ring-2 ring-[#3F3F8F]/40'
                            : 'border-neutral-300'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-[#E7E7E7] bg-[#FAFAFA] flex gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 border border-[#E7E7E7] text-black font-semibold text-xs uppercase tracking-wider rounded-[4px] hover:bg-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 py-3 bg-[#3F3F8F] hover:bg-[#343476] text-white font-semibold text-xs uppercase tracking-wider rounded-[4px] transition-colors shadow-sm"
              >
                Show ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
