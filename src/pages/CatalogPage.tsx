import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom';
import {
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  X,
  Grid3X3,
  Grid2X2,
  Square,
  Check,
  Sparkles,
  ChevronLeft,
  Loader2,
  Layers,
  Tag,
} from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { SAMPLE_PRODUCTS, SAMPLE_COLLECTIONS } from '../data/mockData';
import { formatPrice } from '../utils/formatters';
import { useGsapReveal } from '../hooks/useGsapReveal';
import { api } from '../services/api';
import { Product, Collection, Category, Subcategory, Attribute } from '../types';
import { SEOHead } from '../components/common/SEOHead';
import { generateCollectionJsonLd, normalizeCanonicalUrl } from '../services/seoEngine';

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
  const navigate = useNavigate();
  const searchParam = searchParams.get('search') || '';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Catalog Hierarchy State (Women's Garments)
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<Subcategory[]>([]);
  const [attributesList, setAttributesList] = useState<Attribute[]>([]);

  // Filter selections
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return searchParams.get('category') || '';
  });

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => {
    return searchParams.get('subcategory') || '';
  });

  // Dynamic Attributes Filter state: { [attr_slug]: string[] }
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>(() => {
    const initialAttrs: Record<string, string[]> = {};
    searchParams.forEach((val, key) => {
      if (key.startsWith('attr_')) {
        const attrKey = key.replace('attr_', '');
        initialAttrs[attrKey] = val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    });
    return initialAttrs;
  });

  // Multi-select collection filter state initialized from route or query params
  const [selectedCollections, setSelectedCollections] = useState<string[]>(() => {
    const fromQuery = searchParams.get('collections');
    if (fromQuery) {
      return fromQuery.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    const single = (routeCollection || searchParams.get('collection') || '').toLowerCase();
    return single && single !== 'all' ? [single] : [];
  });

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [collectionsList, setCollectionsList] = useState<Collection[]>(SAMPLE_COLLECTIONS);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(10000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [mobileColumns, setMobileColumns] = useState<1 | 2>(2);

  // Accordion toggle state for Category and Attribute sections
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedAttributeSections, setExpandedAttributeSections] = useState<Record<string, boolean>>({
    fabric: true,
    fit: true,
    sleeve_type: true,
  });

  const catalogTopRef = useRef<HTMLDivElement>(null);
  const containerRef = useGsapReveal({ stagger: 0.06 });

  // Sync if routeCollection changes (e.g. user clicked a navigation link in the header or homepage)
  useEffect(() => {
    if (routeCollection && routeCollection !== 'all') {
      const lower = routeCollection.toLowerCase();
      // Check if routeCollection matches a category slug (e.g. 'saree', 'cord-set', 'tops')
      const matchingCat = categoriesList.find((c) => c.slug.toLowerCase() === lower);
      if (matchingCat) {
        setSelectedCategory(matchingCat.slug);
        setSelectedCollections([]);
      } else {
        setSelectedCollections([lower]);
      }
    } else if (routeCollection === 'all') {
      const fromQuery = searchParams.get('collections');
      if (fromQuery) {
        setSelectedCollections(fromQuery.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
      } else {
        const single = (searchParams.get('collection') || '').toLowerCase();
        setSelectedCollections(single && single !== 'all' ? [single] : []);
      }
    }
  }, [routeCollection, categoriesList]);

  // Load catalog metadata (Categories, Subcategories, Dynamic Attributes, Collections)
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      api.getCategories(false),
      api.getSubcategories(),
      api.getAttributes(true),
      api.getCollections(),
    ]).then(([cats, subs, attrs, cols]) => {
      if (!isMounted) return;
      if (cats && cats.length > 0) setCategoriesList(cats);
      if (subs && subs.length > 0) setSubcategoriesList(subs);
      if (attrs && attrs.length > 0) setAttributesList(attrs);
      if (cols && cols.length > 0) setCollectionsList(cols);
    });

    const handleProductsUpdated = () => setRefreshNonce((n) => n + 1);
    const handleCollectionsUpdated = () => {
      api.getCollections().then((cols) => {
        if (isMounted && cols && cols.length > 0) setCollectionsList(cols);
      });
    };
    const handleCategoriesUpdated = () => {
      Promise.all([
        api.getCategories(false),
        api.getSubcategories(),
      ]).then(([cats, subs]) => {
        if (!isMounted) return;
        if (cats) setCategoriesList(cats);
        if (subs) setSubcategoriesList(subs);
      });
    };
    const handleAttributesUpdated = () => {
      api.getAttributes(true).then((attrs) => {
        if (isMounted && attrs) setAttributesList(attrs);
      });
    };

    window.addEventListener('tanoah_products_updated', handleProductsUpdated);
    window.addEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    window.addEventListener('tanoah_categories_updated', handleCategoriesUpdated);
    window.addEventListener('tanoah_attributes_updated', handleAttributesUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_products_updated', handleProductsUpdated);
      window.removeEventListener('tanoah_collections_updated', handleCollectionsUpdated);
      window.removeEventListener('tanoah_categories_updated', handleCategoriesUpdated);
      window.removeEventListener('tanoah_attributes_updated', handleAttributesUpdated);
    };
  }, []);

  // Filter handlers with URL sync
  const handleSelectAllProducts = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      nextParams.delete('category');
      nextParams.delete('subcategory');
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const handleSelectCategory = (catIdOrSlug: string) => {
    const nextCat = selectedCategory === catIdOrSlug ? '' : catIdOrSlug;
    setSelectedCategory(nextCat);
    setSelectedSubcategory('');
    if (nextCat) {
      setExpandedCategories((prev) => ({ ...prev, [nextCat]: true }));
    }
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      if (nextCat) {
        nextParams.set('category', nextCat);
      } else {
        nextParams.delete('category');
      }
      nextParams.delete('subcategory');
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const handleSelectSubcategory = (subIdOrSlug: string) => {
    const nextSub = selectedSubcategory === subIdOrSlug ? '' : subIdOrSlug;
    setSelectedSubcategory(nextSub);
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      if (nextSub) {
        nextParams.set('subcategory', nextSub);
      } else {
        nextParams.delete('subcategory');
      }
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const handleToggleAttribute = (attrSlug: string, value: string) => {
    const currentValues = selectedAttributes[attrSlug] || [];
    const isAlready = currentValues.includes(value);
    const nextValues = isAlready
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    setSelectedAttributes((prev) => {
      const next = { ...prev };
      if (nextValues.length === 0) {
        delete next[attrSlug];
      } else {
        next[attrSlug] = nextValues;
      }
      return next;
    });

    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      const paramKey = `attr_${attrSlug}`;
      if (nextValues.length === 0) {
        nextParams.delete(paramKey);
      } else {
        nextParams.set(paramKey, nextValues.join(','));
      }
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const handleToggleCollection = (colSlug: string) => {
    const slug = colSlug.toLowerCase();
    setSelectedCollections((prev) => {
      const isAlready = prev.includes(slug);
      const next = isAlready ? prev.filter((s) => s !== slug) : [...prev, slug];

      setSearchParams((params) => {
        const nextParams = new URLSearchParams(params);
        if (next.length === 0) {
          nextParams.delete('collections');
          nextParams.delete('collection');
        } else if (next.length === 1) {
          nextParams.delete('collections');
          nextParams.set('collection', next[0]);
        } else {
          nextParams.delete('collection');
          nextParams.set('collections', next.join(','));
        }
        nextParams.set('page', '1');
        return nextParams;
      });

      return next;
    });
  };

  const handleSelectAllCollections = () => {
    setSelectedCollections([]);
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      nextParams.delete('collections');
      nextParams.delete('collection');
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const resetPageParam = () => {
    if (searchParams.get('page') && searchParams.get('page') !== '1') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        return next;
      });
    }
  };

  // Paginated Product Loading
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api
      .getPaginatedProducts({
        page: pageParam,
        limit: 12,
        collections: selectedCollections.length > 0 ? selectedCollections : undefined,
        collection: selectedCollections.length === 0 ? 'all' : undefined,
        categorySlug: selectedCategory || undefined,
        subcategorySlug: selectedSubcategory || undefined,
        attributes: Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined,
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
    selectedCollections,
    selectedCategory,
    selectedSubcategory,
    selectedAttributes,
    pageParam,
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

  // All active categories
  const activeCategories = useMemo(() => {
    return categoriesList.filter((c) => c.is_active !== false);
  }, [categoriesList]);

  // Dynamic Attribute Facets (combines Master DB attributes with live structured_attributes)
  const dynamicAttributeFacets = useMemo(() => {
    const facets: Record<string, { label: string; values: string[] }> = {};

    // 1. Master DB Attributes
    attributesList.forEach((attr) => {
      const slug = attr.slug.toLowerCase();
      const vals = (attr.values || []).map((v) => v.value);
      facets[slug] = { label: attr.name, values: vals };
    });

    // 2. Standard Garment Attributes
    const standardKeys: Record<string, string> = {
      fabric: 'Fabric',
      fit: 'Fit',
      sleeve_type: 'Sleeve Type',
      occasion: 'Occasion',
      pattern: 'Pattern',
    };

    Object.entries(standardKeys).forEach(([key, label]) => {
      if (!facets[key]) {
        facets[key] = { label, values: [] };
      }
    });

    // 3. Extract distinct values from active products' structured_attributes
    productsList.forEach((p) => {
      if (p.structured_attributes && typeof p.structured_attributes === 'object') {
        Object.entries(p.structured_attributes).forEach(([k, val]) => {
          const key = k.toLowerCase().replace(/\s+/g, '_');
          if (
            typeof val === 'string' &&
            val.trim() &&
            key !== 'collections' &&
            key !== 'size_chart_id' &&
            key !== 'similar_product_ids' &&
            key !== 'similar_category_ids'
          ) {
            if (!facets[key]) {
              const prettyLabel = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              facets[key] = { label: prettyLabel, values: [] };
            }
            const cleanVal = val.trim();
            if (!facets[key].values.some((v) => v.toLowerCase() === cleanVal.toLowerCase())) {
              facets[key].values.push(cleanVal);
            }
          }
        });
      }
    });

    return Object.entries(facets)
      .filter(([_, data]) => data.values.length > 0)
      .map(([key, data]) => ({
        key,
        label: data.label,
        values: data.values.sort((a, b) => a.localeCompare(b)),
      }));
  }, [attributesList, productsList]);

  // Editorial Collection Header calculation
  const activeCollection = useMemo(() => {
    // If a category is selected, generate title
    if (selectedCategory) {
      const catObj = categoriesList.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
      const subObj = subcategoriesList.find((s) => s.slug === selectedSubcategory || s.id === selectedSubcategory);

      let title = '';
      if (catObj && subObj) {
        title = `${catObj.name.toUpperCase()} – ${subObj.name.toUpperCase()}`;
      } else if (catObj) {
        title = catObj.name.toUpperCase();
      }

      return {
        title: title || 'THE COMPLETE WARDROBE',
        description: catObj?.description || 'Explore timeless bespoke women\'s designs, artisanal weaves, and modern silhouettes.',
        banner_image: catObj?.image_url || '/Assets/hero/hero-landscape.jpg',
      };
    }

    // Otherwise use selected collections
    if (selectedCollections.length === 0) {
      return {
        title: 'THE COMPLETE WARDROBE',
        description: 'Explore timeless bespoke women\'s designs, tailored essentials, and modern silhouettes.',
        banner_image: '/Assets/hero/hero-landscape.jpg',
      };
    }
    if (selectedCollections.length === 1) {
      const targetSlug = selectedCollections[0];
      const found = collectionsList.find((c) => c.slug.toLowerCase() === targetSlug);
      if (found) return found;
      if (targetSlug === 'women') {
        return {
          title: "WOMEN'S COLLECTION",
          description: 'Fluid drape dresses, artisanal sarees, silk tops and sculptural tailored silhouettes.',
          banner_image: '/Assets/hero/hero-mobile.jpg',
        };
      }
      if (targetSlug === 'sale') {
        return {
          title: 'SPECIAL ARCHIVAL OFFERS',
          description: 'Seasonal reductions and archival pieces crafted with exceptional heritage precision.',
          banner_image: '/Assets/hero/hero-landscape.jpg',
        };
      }
      if (targetSlug === 'new-arrivals') {
        return {
          title: 'NEW ARRIVALS SS26',
          description: 'The latest silhouettes, handwoven textiles, and modern minimalist essentials.',
          banner_image: '/Assets/hero/hero-mobile.jpg',
        };
      }
      if (targetSlug === 'best-sellers') {
        return {
          title: 'TANOAH BEST SELLERS',
          description: 'Our most sought-after signature pieces, worn and cherished by patrons worldwide.',
          banner_image: '/Assets/hero/hero-landscape.jpg',
        };
      }
      if (targetSlug === 'monochrome') {
        return {
          title: 'THE MONOCHROME EDIT',
          description: 'Pure tonal minimalism in noir black, slate navy, and optical ivory.',
          banner_image: '/Assets/hero/hero-mobile.jpg',
        };
      }
      return {
        title: targetSlug.toUpperCase().replace(/-/g, ' '),
        description: 'Curated artisanal pieces crafted with exceptional heritage precision.',
        banner_image: '/Assets/hero/hero-landscape.jpg',
      };
    }
    // Multiple collections selected
    const titles = selectedCollections.map(
      (slug) => collectionsList.find((c) => c.slug.toLowerCase() === slug)?.title || slug.toUpperCase().replace(/-/g, ' ')
    );
    return {
      title: titles.join(' & '),
      description: `Curated showcase combining pieces from ${selectedCollections.length} collections: ${titles.join(', ')}.`,
      banner_image: '/Assets/hero/hero-landscape.jpg',
    };
  }, [selectedCategory, selectedSubcategory, selectedCollections, categoriesList, subcategoriesList, collectionsList]);

  // Available filter choices
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

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === pageParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearAllFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedAttributes({});
    setSelectedCollections([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange(10000);
    setInStockOnly(false);
    setSearchParams({});
    if (routeCollection && routeCollection !== 'all') {
      navigate('/collections/all');
    }
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedSubcategory) ||
    Object.keys(selectedAttributes).length > 0 ||
    selectedCollections.length > 0 ||
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
        canonical={normalizeCanonicalUrl(`/collections/${selectedCollections.length === 1 ? selectedCollections[0] : 'all'}`)}
        type="website"
        jsonLd={generateCollectionJsonLd(activeCollection.title, productsList, `/collections/${selectedCollections.length === 1 ? selectedCollections[0] : 'all'}`)}
      />

      {/* Editorial Catalog Hero Banner */}
      <div className="relative bg-[#FAFAFA] border-b border-[#E7E7E7] py-12 md:py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Breadcrumb path */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#888888] tracking-widest uppercase mb-4">
            <Link to="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/collections/all" className="hover:text-black transition-colors">
              Shop
            </Link>
            {selectedCategory && (
              <>
                <span>/</span>
                <span className="text-black font-semibold">
                  {categoriesList.find((c) => c.slug === selectedCategory || c.id === selectedCategory)?.name || selectedCategory}
                </span>
              </>
            )}
            {selectedSubcategory && (
              <>
                <span>/</span>
                <span className="text-black font-semibold">
                  {subcategoriesList.find((s) => s.slug === selectedSubcategory || s.id === selectedSubcategory)?.name || selectedSubcategory}
                </span>
              </>
            )}
          </div>

          <h1 className="font-wondra text-3xl sm:text-5xl lg:text-6xl text-black tracking-tight uppercase">
            {activeCollection.title}
          </h1>

          <p className="text-xs sm:text-sm text-[#666666] max-w-xl mx-auto mt-3 font-light leading-relaxed">
            {activeCollection.description}
          </p>

          <div className="mt-6 text-[11px] text-[#888888] tracking-wider uppercase font-medium">
            Showing {productsList.length} {productsList.length === 1 ? 'Piece' : 'Pieces'}
          </div>
        </div>
      </div>

      {/* Main Catalog Body */}
      <div ref={catalogTopRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              className={`p-1 rounded transition-colors ${gridColumns === 2 ? 'text-[#3F3F8F] bg-white shadow-xs font-bold' : 'hover:text-black'}`}
              title="2 Columns (Large)"
            >
              2 COL
            </button>
            <button
              onClick={() => setGridColumns(3)}
              className={`p-1 rounded transition-colors ${gridColumns === 3 ? 'text-[#3F3F8F] bg-white shadow-xs font-bold' : 'hover:text-black'}`}
              title="3 Columns (Standard)"
            >
              3 COL
            </button>
            <button
              onClick={() => setGridColumns(4)}
              className={`p-1 rounded transition-colors ${gridColumns === 4 ? 'text-[#3F3F8F] bg-white shadow-xs font-bold' : 'hover:text-black'}`}
              title="4 Columns (Compact)"
            >
              4 COL
            </button>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pill */}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  Category: {categoriesList.find((c) => c.slug === selectedCategory || c.id === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => handleSelectCategory('')} title="Remove Category">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Subcategory Pill */}
              {selectedSubcategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  Subcategory: {subcategoriesList.find((s) => s.slug === selectedSubcategory || s.id === selectedSubcategory)?.name || selectedSubcategory}
                  <button onClick={() => handleSelectSubcategory('')} title="Remove Subcategory">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Dynamic Attribute Pills */}
              {Object.entries(selectedAttributes).flatMap(([attrKey, vals]) =>
                vals.map((val) => (
                  <span
                    key={`${attrKey}-${val}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase"
                  >
                    {attrKey.replace(/_/g, ' ')}: {val}
                    <button onClick={() => handleToggleAttribute(attrKey, val)} title={`Remove ${val}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}

              {/* Collection Pills */}
              {selectedCollections.map((colSlug) => {
                const colObj = collectionsList.find((c) => c.slug.toLowerCase() === colSlug);
                const colTitle = colObj?.title || colSlug.toUpperCase().replace(/-/g, ' ');
                return (
                  <span
                    key={colSlug}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase"
                  >
                    {colTitle}
                    <button onClick={() => handleToggleCollection(colSlug)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

              {/* Size Pills */}
              {selectedSizes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  Size: {s}
                  <button onClick={() => { setSelectedSizes(selectedSizes.filter((x) => x !== s)); resetPageParam(); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Color Pills */}
              {selectedColors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  Color: {c}
                  <button onClick={() => { setSelectedColors(selectedColors.filter((x) => x !== c)); resetPageParam(); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* In Stock Pill */}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  In Stock Only
                  <button onClick={() => { setInStockOnly(false); resetPageParam(); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Price Pill */}
              {priceRange < 10000 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-[11px] rounded-[2px] font-medium uppercase">
                  Under {formatPrice(priceRange)}
                  <button onClick={() => { setPriceRange(10000); resetPageParam(); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleClearAllFilters}
                className="text-[11px] text-[#3F3F8F] hover:underline font-semibold uppercase tracking-wider ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Right Side: Sort Controls */}
          <div className="flex items-center gap-3 ml-auto">
            <label htmlFor="catalog-sort" className="text-[#888888] uppercase tracking-wider text-[11px] font-medium hidden sm:inline">
              SORT BY:
            </label>
            <div className="relative inline-block">
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  resetPageParam();
                }}
                className="appearance-none bg-white border border-[#E7E7E7] text-black text-xs uppercase tracking-wider py-1.5 pl-3 pr-8 rounded-[3px] cursor-pointer focus:outline-none focus:border-[#3F3F8F]"
              >
                <option value="featured">Featured & Curated</option>
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#666666] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content Layout: Left Sidebar Filters + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          {/* Desktop Left Sidebar Filter (Col 3) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6 pr-4 text-xs font-poppins text-left">
            {/* 1. CATEGORIES (With 1st Default Option: "All Products") */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  <span>CATEGORIES</span>
                </h4>
                {(selectedCategory || selectedSubcategory) && (
                  <button
                    onClick={handleSelectAllProducts}
                    className="text-[10px] text-[#666666] hover:text-[#3F3F8F] uppercase"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1 text-[#444444]">
                {/* 1st Default Option: All Products */}
                <div
                  className={`flex items-center justify-between py-1.5 px-2 rounded-[3px] cursor-pointer transition-colors ${
                    !selectedCategory && !selectedSubcategory
                      ? 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold'
                      : 'hover:bg-neutral-50 text-[#444444]'
                  }`}
                  onClick={handleSelectAllProducts}
                >
                  <span className="truncate">All Products</span>
                  {!selectedCategory && !selectedSubcategory && (
                    <Check className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  )}
                </div>

                {/* Categories List */}
                {activeCategories.map((cat) => {
                  const isCatSelected = selectedCategory === cat.slug || selectedCategory === cat.id;
                  const catSubs = subcategoriesList.filter((s) => s.category_id === cat.id);
                  const isExpanded = isCatSelected || Boolean(expandedCategories[cat.id]);

                  return (
                    <div key={cat.id || cat.slug} className="space-y-1">
                      <div
                        className={`flex items-center justify-between py-1.5 px-2 rounded-[3px] cursor-pointer transition-colors ${
                          isCatSelected
                            ? 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold'
                            : 'hover:bg-neutral-50'
                        }`}
                        onClick={() => handleSelectCategory(cat.slug || cat.id)}
                      >
                        <span className="truncate">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          {isCatSelected && <Check className="w-3.5 h-3.5 text-[#3F3F8F]" />}
                          {catSubs.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [cat.id]: !prev[cat.id],
                                }));
                              }}
                              className="p-0.5 text-neutral-400 hover:text-black"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subcategories list under this category */}
                      {isExpanded && catSubs.length > 0 && (
                        <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#EEEEF8] ml-2">
                          {catSubs.map((sub) => {
                            const isSubSelected =
                              selectedSubcategory === sub.slug || selectedSubcategory === sub.id;
                            return (
                              <button
                                key={sub.id || sub.slug}
                                onClick={() => handleSelectSubcategory(sub.slug || sub.id)}
                                className={`w-full text-left py-1 px-1.5 rounded text-[11px] flex items-center justify-between transition-colors ${
                                  isSubSelected
                                    ? 'text-[#3F3F8F] font-semibold bg-[#EEEEF8]/60'
                                    : 'text-[#666666] hover:text-black'
                                }`}
                              >
                                <span className="truncate">• {sub.name}</span>
                                {isSubSelected && <Check className="w-3 h-3 text-[#3F3F8F]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. DYNAMIC GARMENT ATTRIBUTES */}
            {dynamicAttributeFacets.length > 0 && (
              <div className="space-y-4 pb-6 border-b border-[#E7E7E7]">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
                    <span>GARMENT ATTRIBUTES</span>
                  </h4>
                  {Object.keys(selectedAttributes).length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedAttributes({});
                        setSearchParams((params) => {
                          const nextParams = new URLSearchParams(params);
                          Array.from(nextParams.keys())
                            .filter((k) => k.startsWith('attr_'))
                            .forEach((k) => nextParams.delete(k));
                          nextParams.set('page', '1');
                          return nextParams;
                        });
                      }}
                      className="text-[10px] text-[#666666] hover:text-[#3F3F8F] uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {dynamicAttributeFacets.map((facet) => {
                    const isExpanded = expandedAttributeSections[facet.key] !== false;
                    const selectedForFacet = selectedAttributes[facet.key] || [];

                    return (
                      <div key={facet.key} className="border border-[#E7E7E7] rounded-[4px] p-2.5 bg-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAttributeSections((prev) => ({
                              ...prev,
                              [facet.key]: !isExpanded,
                            }))
                          }
                          className="w-full flex items-center justify-between font-medium text-[11px] text-black uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{facet.label}</span>
                            {selectedForFacet.length > 0 && (
                              <span className="w-4 h-4 rounded-full bg-[#3F3F8F] text-white text-[9px] flex items-center justify-center font-bold">
                                {selectedForFacet.length}
                              </span>
                            )}
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 pt-2 border-t border-[#EAEAEA] flex flex-wrap gap-1.5">
                            {facet.values.map((val) => {
                              const isChecked = selectedForFacet.includes(val);
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleToggleAttribute(facet.key, val)}
                                  className={`px-2 py-1 rounded text-[10px] tracking-wider uppercase transition-all flex items-center gap-1 ${
                                    isChecked
                                      ? 'bg-[#3F3F8F] text-white font-medium shadow-xs'
                                      : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400'
                                  }`}
                                >
                                  {isChecked && <Check className="w-2.5 h-2.5" />}
                                  <span>{val}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. COLLECTIONS & EDITS */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  <span>COLLECTIONS & EDITS</span>
                </h4>
                {selectedCollections.length > 0 && (
                  <button
                    onClick={handleSelectAllCollections}
                    className="text-[10px] text-[#666666] hover:text-[#3F3F8F] uppercase"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {collectionsList
                  .filter((c) => c.is_active !== false && c.slug !== 'men')
                  .map((col) => {
                    const slug = col.slug.toLowerCase();
                    const isChecked = selectedCollections.includes(slug);
                    return (
                      <label
                        key={col.id || col.slug}
                        className="flex items-center gap-2.5 py-1 px-1 rounded hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCollection(slug)}
                          className="w-3.5 h-3.5 rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                        />
                        <span className={`text-xs ${isChecked ? 'font-semibold text-[#3F3F8F]' : 'text-neutral-700'}`}>
                          {col.title}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* 4. PRICE RANGE SLIDER */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  PRICE RANGE
                </h4>
                <span className="text-[11px] text-[#3F3F8F] font-semibold">
                  Up to {formatPrice(priceRange)}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  resetPageParam();
                }}
                className="w-full accent-[#3F3F8F] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#888888]">
                <span>₹500</span>
                <span>₹10,000+</span>
              </div>
            </div>

            {/* 5. SIZES */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                SIZES
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {allSizes.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSizes((prev) =>
                          prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                        );
                        resetPageParam();
                      }}
                      className={`px-2.5 py-1 text-xs border rounded-[3px] transition-all ${
                        isSelected
                          ? 'border-[#3F3F8F] bg-[#3F3F8F] text-white font-medium'
                          : 'border-[#E7E7E7] text-neutral-700 hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. COLORS */}
            <div className="space-y-3 pb-6 border-b border-[#E7E7E7]">
              <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                COLORS
              </h4>
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => {
                        setSelectedColors((prev) =>
                          prev.includes(color.name)
                            ? prev.filter((c) => c !== color.name)
                            : [...prev, color.name]
                        );
                        resetPageParam();
                      }}
                      className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center relative ${
                        isSelected ? 'ring-2 ring-[#3F3F8F] ring-offset-2' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3 h-3 ${
                            color.hex.toLowerCase() === '#ffffff' || color.hex.toLowerCase() === '#fff'
                              ? 'text-black'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. IN STOCK ONLY */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    resetPageParam();
                  }}
                  className="w-4 h-4 rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                />
                <span className="text-xs text-neutral-700 select-none">In Stock Only</span>
              </label>
            </div>
          </div>

          {/* Product Grid Area (Col 9) */}
          <div className="col-span-1 lg:col-span-9">
            {isLoading ? (
              <div className="min-h-[450px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#3F3F8F] animate-spin" />
                <p className="text-xs uppercase tracking-widest text-[#888888]">
                  Loading Collection Pieces...
                </p>
              </div>
            ) : productsList.length === 0 ? (
              <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-[#FAFAFA] border border-[#E7E7E7] rounded-sm">
                <SlidersHorizontal className="w-10 h-10 text-neutral-300 mb-3" />
                <h3 className="font-wondra text-xl text-black uppercase tracking-wider mb-2">
                  No Pieces Match Your Selection
                </h3>
                <p className="text-xs text-[#666666] max-w-md font-light mb-6">
                  Try adjusting your category, attributes, or price filters to explore other exquisite designs in our wardrobe.
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="px-6 py-2.5 bg-[#3F3F8F] text-white text-xs uppercase tracking-widest font-semibold hover:bg-black transition-colors rounded-[3px]"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Responsive Grid layout */}
                <div
                  ref={containerRef}
                  className={`grid gap-x-4 gap-y-8 ${
                    mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  } ${
                    gridColumns === 2
                      ? 'lg:grid-cols-2'
                      : gridColumns === 3
                      ? 'lg:grid-cols-3'
                      : 'lg:grid-cols-4'
                  }`}
                >
                  {productsList.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-14 pt-8 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-poppins">
                    <span className="text-[#888888] tracking-wider uppercase text-[11px]">
                      Showing {startItem}–{endItem} of {totalCount} Pieces
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePageChange(pageParam - 1)}
                        disabled={pageParam <= 1}
                        className="px-3 py-1.5 border border-[#E7E7E7] rounded-[3px] text-black disabled:opacity-30 disabled:cursor-not-allowed hover:border-black transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      {paginationPages.map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-2 text-neutral-400">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = pageNum === pageParam;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => handlePageChange(pageNum as number)}
                            className={`w-8 h-8 rounded-[3px] font-medium transition-all ${
                              isCurrent
                                ? 'bg-[#3F3F8F] text-white shadow-xs'
                                : 'border border-[#E7E7E7] text-neutral-700 hover:border-black'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(pageParam + 1)}
                        disabled={pageParam >= totalPages}
                        className="px-3 py-1.5 border border-[#E7E7E7] rounded-[3px] text-black disabled:opacity-30 disabled:cursor-not-allowed hover:border-black transition-colors flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
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
              {/* Categories & Subcategories Mobile */}
              <div className="space-y-3 pb-5 border-b border-[#E7E7E7]">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                    CATEGORIES
                  </h4>
                  {(selectedCategory || selectedSubcategory) && (
                    <button
                      onClick={handleSelectAllProducts}
                      className="text-[10px] text-[#666666] hover:text-[#3F3F8F] uppercase"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {/* 1st Option: All Products */}
                  <button
                    onClick={handleSelectAllProducts}
                    className={`w-full text-left py-1.5 px-2 rounded-[3px] flex items-center justify-between text-xs ${
                      !selectedCategory && !selectedSubcategory
                        ? 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold'
                        : 'text-[#444444]'
                    }`}
                  >
                    <span>All Products</span>
                    {!selectedCategory && !selectedSubcategory && (
                      <Check className="w-3.5 h-3.5 text-[#3F3F8F]" />
                    )}
                  </button>

                  {/* Categories */}
                  {activeCategories.map((cat) => {
                    const isCatSelected = selectedCategory === cat.slug || selectedCategory === cat.id;
                    const catSubs = subcategoriesList.filter((s) => s.category_id === cat.id);

                    return (
                      <div key={cat.id || cat.slug} className="space-y-1">
                        <button
                          onClick={() => handleSelectCategory(cat.slug || cat.id)}
                          className={`w-full text-left py-1.5 px-2 rounded-[3px] flex items-center justify-between text-xs ${
                            isCatSelected
                              ? 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold'
                              : 'text-[#444444]'
                          }`}
                        >
                          <span>{cat.name}</span>
                          {isCatSelected && <Check className="w-3.5 h-3.5 text-[#3F3F8F]" />}
                        </button>
                        {isCatSelected && catSubs.length > 0 && (
                          <div className="pl-4 space-y-1 border-l-2 border-[#EEEEF8] ml-2">
                            {catSubs.map((sub) => {
                              const isSubSelected =
                                selectedSubcategory === sub.slug || selectedSubcategory === sub.id;
                              return (
                                <button
                                  key={sub.id || sub.slug}
                                  onClick={() => handleSelectSubcategory(sub.slug || sub.id)}
                                  className={`w-full text-left py-1 px-1.5 rounded text-[11px] flex items-center justify-between ${
                                    isSubSelected
                                      ? 'text-[#3F3F8F] font-semibold bg-[#EEEEF8]/60'
                                      : 'text-[#666666]'
                                  }`}
                                >
                                  <span>• {sub.name}</span>
                                  {isSubSelected && <Check className="w-3 h-3 text-[#3F3F8F]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Attributes Mobile */}
              {dynamicAttributeFacets.length > 0 && (
                <div className="space-y-4 pb-5 border-b border-[#E7E7E7]">
                  <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                    GARMENT ATTRIBUTES
                  </h4>
                  {dynamicAttributeFacets.map((facet) => {
                    const selectedForFacet = selectedAttributes[facet.key] || [];
                    return (
                      <div key={facet.key} className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#666666] uppercase">
                          {facet.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {facet.values.map((val) => {
                            const isChecked = selectedForFacet.includes(val);
                            return (
                              <button
                                key={val}
                                onClick={() => handleToggleAttribute(facet.key, val)}
                                className={`px-2.5 py-1 rounded text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1 ${
                                  isChecked
                                    ? 'bg-[#3F3F8F] text-white font-medium'
                                    : 'border border-[#E7E7E7] text-black bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                                <span>{val}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Collections & Edits Mobile */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  COLLECTIONS & EDITS
                </h4>
                <div className="space-y-1">
                  {collectionsList
                    .filter((c) => c.is_active !== false && c.slug !== 'men')
                    .map((col) => {
                      const slug = col.slug.toLowerCase();
                      const isChecked = selectedCollections.includes(slug);
                      return (
                        <label
                          key={col.id || col.slug}
                          className="flex items-center gap-2 py-1 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCollection(slug)}
                            className="w-4 h-4 rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                          />
                          <span className={`text-xs ${isChecked ? 'font-semibold text-[#3F3F8F]' : 'text-neutral-700'}`}>
                            {col.title}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Price Range Mobile */}
              <div className="space-y-3 pb-5 border-b border-[#E7E7E7]">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                    PRICE RANGE
                  </h4>
                  <span className="text-xs text-[#3F3F8F] font-semibold">
                    Up to {formatPrice(priceRange)}
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={priceRange}
                  onChange={(e) => {
                    setPriceRange(Number(e.target.value));
                    resetPageParam();
                  }}
                  className="w-full accent-[#3F3F8F]"
                />
              </div>

              {/* Sizes Mobile */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  SIZES
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {allSizes.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setSelectedSizes((prev) =>
                            prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                          );
                          resetPageParam();
                        }}
                        className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                          isSelected
                            ? 'border-[#3F3F8F] bg-[#3F3F8F] text-white font-medium'
                            : 'border-[#E7E7E7] text-neutral-700'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors Mobile */}
              <div className="space-y-2 pb-5 border-b border-[#E7E7E7]">
                <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                  COLORS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allColors.map((color) => {
                    const isSelected = selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => {
                          setSelectedColors((prev) =>
                            prev.includes(color.name)
                              ? prev.filter((c) => c !== color.name)
                              : [...prev, color.name]
                          );
                          resetPageParam();
                        }}
                        className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center relative ${
                          isSelected ? 'ring-2 ring-[#3F3F8F] ring-offset-2' : 'border-neutral-300'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check
                            className={`w-3 h-3 ${
                              color.hex.toLowerCase() === '#ffffff' || color.hex.toLowerCase() === '#fff'
                                ? 'text-black'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In Stock Only Mobile */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      resetPageParam();
                    }}
                    className="w-4 h-4 rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                  />
                  <span className="text-xs text-neutral-700 select-none">In Stock Only</span>
                </label>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E7E7E7] bg-[#F8F8F8] flex items-center gap-3">
              <button
                onClick={handleClearAllFilters}
                className="flex-1 py-2.5 border border-[#E7E7E7] bg-white text-black font-semibold rounded uppercase tracking-wider text-xs hover:bg-neutral-50 transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 py-2.5 bg-[#3F3F8F] text-white font-semibold rounded uppercase tracking-wider text-xs hover:bg-black transition-colors"
              >
                Apply ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CatalogPage;
