import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Filter, SlidersHorizontal, ChevronDown, X, Grid3X3, Grid2X2, Square, Check, Sparkles } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { SAMPLE_PRODUCTS, SAMPLE_COLLECTIONS } from '../data/mockData';
import { formatPrice } from '../utils/formatters';
import { useGsapReveal } from '../hooks/useGsapReveal';
import { api } from '../services/api';
import { Product, Collection } from '../types';

export const CatalogPage: React.FC = () => {
  const { collection: routeCollection } = useParams<{ collection: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCollection = (routeCollection || searchParams.get('collection') || 'all').toLowerCase();
  const typeParam = searchParams.get('type') || '';
  const searchParam = searchParams.get('search') || '';

  const [productsList, setProductsList] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [collectionsList, setCollectionsList] = useState<Collection[]>(SAMPLE_COLLECTIONS);

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

  const containerRef = useGsapReveal({ stagger: 0.06 });

  useEffect(() => {
    let isMounted = true;
    const fetchCatalogData = () => {
      api.getProducts().then((data) => {
        if (isMounted && data) setProductsList(data);
      });
      api.getCollections().then((cols) => {
        if (isMounted && cols && cols.length > 0) setCollectionsList(cols);
      });
    };

    fetchCatalogData();
    window.addEventListener('tanoah_products_updated', fetchCatalogData);
    window.addEventListener('tanoah_collections_updated', fetchCatalogData);

    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_products_updated', fetchCatalogData);
      window.removeEventListener('tanoah_collections_updated', fetchCatalogData);
    };
  }, []);

  useEffect(() => {
    if (typeParam) {
      setSelectedTypes([typeParam]);
    }
  }, [typeParam]);

  const activeCollection = collectionsList.find(
    (c) => c.slug.toLowerCase() === currentCollection
  ) || (
    currentCollection === 'men' ? {
      title: "MEN'S ATELIER",
      description: 'Handcrafted luxury tailoring, structured tees, relaxed linen shirts and trousers.',
      banner_image: '/Assets/hero/hero-landscape.jpg',
    } : currentCollection === 'women' ? {
      title: "WOMEN'S ATELIER",
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
      title: 'ATELIER BEST SELLERS',
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

  // Extract all available filters from dataset
  const allProductTypes = Array.from(new Set(productsList.map((p) => p.product_type)));
  const allSizes = Array.from(
    new Set(productsList.flatMap((p) => p.variants.map((v) => v.size)))
  );
  const allColors = Array.from(
    new Map(
      productsList.flatMap((p) => p.variants).map((v) => [v.color_name, { name: v.color_name, hex: v.color_hex }])
    ).values()
  );

  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      // Collection filter (Route Param)
      if (currentCollection !== 'all') {
        if (currentCollection === 'men') {
          const isMen = product.gender === 'men' || product.gender === 'unisex' || product.category_name?.toLowerCase().includes('men');
          if (!isMen) return false;
        } else if (currentCollection === 'women') {
          const isWomen = product.gender === 'women' || product.gender === 'unisex' || product.category_name?.toLowerCase().includes('women');
          if (!isWomen) return false;
        } else if (currentCollection === 'sale') {
          const isSale = Boolean(product.sale_price) || (product.compare_at_price && product.compare_at_price > product.base_price) || product.tags?.some((t) => t.toLowerCase() === 'sale');
          if (!isSale) return false;
        } else if (currentCollection === 'new-arrivals') {
          const isNew = product.is_new_arrival || product.tags?.some((t) => t.toLowerCase().includes('new'));
          if (!isNew) return false;
        } else if (currentCollection === 'best-sellers') {
          const isBest = product.is_best_seller || product.tags?.some((t) => t.toLowerCase().includes('best'));
          if (!isBest) return false;
        } else {
          // Custom Collection matching by collections array, slug, tag, or category
          const matchesCollection =
            product.collections?.some((c) => c.toLowerCase() === currentCollection) ||
            product.category_name?.toLowerCase() === currentCollection ||
            product.tags?.some((t) => t.toLowerCase() === currentCollection || t.toLowerCase().includes(currentCollection));
          if (!matchesCollection) return false;
        }
      }

      // Search query filter
      if (searchParam) {
        const q = searchParam.toLowerCase();
        const matches =
          product.title.toLowerCase().includes(q) ||
          product.brand.toLowerCase().includes(q) ||
          product.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Gender filter
      if (selectedGender !== 'all' && product.gender && product.gender !== selectedGender && product.gender !== 'unisex') {
        return false;
      }

      // Product type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(product.product_type)) {
        return false;
      }

      // In stock only filter
      if (inStockOnly) {
        const hasStock = product.variants.some((v) => v.stock_quantity > 0);
        if (!hasStock) return false;
      }

      // Price filter
      const minPrice = Math.min(...product.variants.map((v) => v.sale_price ?? v.price));
      if (minPrice > priceRange) {
        return false;
      }

      // Size filter
      if (selectedSizes.length > 0) {
        const hasSize = product.variants.some(
          (v) => selectedSizes.includes(v.size) && v.stock_quantity > 0
        );
        if (!hasSize) return false;
      }

      // Color filter
      if (selectedColors.length > 0) {
        const hasColor = product.variants.some((v) => selectedColors.includes(v.color_name));
        if (!hasColor) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') {
        return (a.sale_price ?? a.base_price) - (b.sale_price ?? b.base_price);
      }
      if (sortBy === 'price-high') {
        return (b.sale_price ?? b.base_price) - (a.sale_price ?? a.base_price);
      }
      if (sortBy === 'newest') {
        return (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0);
      }
      if (sortBy === 'bestseller') {
        return (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0);
      }
      if (sortBy === 'discount') {
        const discA = a.compare_at_price ? (a.compare_at_price - a.base_price) / a.compare_at_price : 0;
        const discB = b.compare_at_price ? (b.compare_at_price - b.base_price) / b.compare_at_price : 0;
        return discB - discA;
      }
      if (sortBy === 'alpha-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'alpha-desc') {
        return b.title.localeCompare(a.title);
      }
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [productsList, currentCollection, searchParam, selectedGender, selectedTypes, inStockOnly, priceRange, selectedSizes, selectedColors, sortBy]);

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

  return (
    <div className="w-full bg-white font-poppins min-h-screen">
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
            Showing {filteredProducts.length} Items
          </div>
        </div>
      </div>

      {/* Main Catalog Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
                  <button onClick={() => setSelectedGender('all')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTypes.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  {t}
                  <button onClick={() => setSelectedTypes(selectedTypes.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
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
                onChange={(e) => setSortBy(e.target.value)}
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
                  onChange={(e) => setInStockOnly(e.target.checked)}
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
                      onChange={() => setSelectedGender(g)}
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
                max="6000"
                step="500"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
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
            {filteredProducts.length === 0 ? (
              <div className="py-24 text-center space-y-4 bg-[#F8F8F8] rounded-[4px] border border-[#E7E7E7]">
                <h3 className="font-wondra text-2xl text-black">NO SILHOUETTES FOUND</h3>
                <p className="text-xs text-[#666666] max-w-sm mx-auto">
                  No products match your active filter criteria. Try adjusting your filters or price range.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-[#3F3F8F] text-white text-xs font-semibold rounded-[4px] uppercase tracking-wider"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
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
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
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
                    onChange={(e) => setInStockOnly(e.target.checked)}
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
                        onChange={() => setSelectedGender(g)}
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
                  onChange={(e) => setPriceRange(Number(e.target.value))}
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
                Show ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
