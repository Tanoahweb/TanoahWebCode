import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, ArrowUpDown, Copy, Ruler } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SAMPLE_PRODUCTS } from '../../data/mockData';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

import { api } from '../../services/api';
import { useUIStore } from '../../store/useUIStore';
import { Product, Collection, Category, Subcategory } from '../../types';

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const loadProducts = () => {
    api.getProducts('all').then((data) => {
      if (data) {
        setProducts(data);
      }
    });
  };

  const loadCollections = () => {
    api.getCollections().then((cols) => {
      if (cols) {
        setCollections(cols);
      }
    });
  };

  const loadCategoriesAndSubs = () => {
    Promise.all([
      api.getCategories(false),
      api.getSubcategories(),
    ]).then(([cats, subs]) => {
      if (cats) setCategories(cats);
      if (subs) setSubcategories(subs);
    }).catch((err) => {
      console.warn('Failed to load categories/subcategories in ProductList:', err);
    });
  };

  React.useEffect(() => {
    loadProducts();
    loadCollections();
    loadCategoriesAndSubs();
    window.addEventListener('tanoah_products_updated', loadProducts);
    window.addEventListener('tanoah_collections_updated', loadCollections);
    window.addEventListener('tanoah_categories_updated', loadCategoriesAndSubs);
    return () => {
      window.removeEventListener('tanoah_products_updated', loadProducts);
      window.removeEventListener('tanoah_collections_updated', loadCollections);
      window.removeEventListener('tanoah_categories_updated', loadCategoriesAndSubs);
    };
  }, []);

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Are you sure you want to remove "${product.title}" from catalog?`)) {
      await api.deleteProduct(product.id);
      loadProducts();
      addToast({
        type: 'success',
        title: 'Product Deleted',
        description: `${product.title} has been deleted from catalog.`,
      });
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    setDuplicatingId(product.id);
    try {
      const res = await api.duplicateProduct(product);
      if (res.success && res.product?.id) {
        addToast({
          type: 'success',
          title: 'Product Duplicated',
          description: `"${res.product.title}" created as Draft (Hidden). Redirecting to edit...`,
        });
        navigate(`/admin/products/${res.product.id}`);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Duplication Failed',
        description: err.message || 'Failed to duplicate product.',
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    const matchesCollection =
      collectionFilter === 'all' ||
      p.collections?.some((c) => c.toLowerCase() === collectionFilter.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase() === collectionFilter.toLowerCase()) ||
      (p.product_type && p.product_type.toLowerCase().includes(collectionFilter.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' ||
      p.category_id === categoryFilter ||
      p.category?.slug === categoryFilter ||
      (p.category_name && p.category_name.toLowerCase() === categoryFilter.toLowerCase()) ||
      categories.find((c) => c.slug === categoryFilter)?.id === p.category_id;

    const matchesSubcategory =
      subcategoryFilter === 'all' ||
      p.subcategory_id === subcategoryFilter ||
      p.subcategory?.slug === subcategoryFilter ||
      (p.subcategory_name && p.subcategory_name.toLowerCase() === subcategoryFilter.toLowerCase()) ||
      subcategories.find((s) => s.slug === subcategoryFilter)?.id === p.subcategory_id;

    return matchesSearch && matchesStatus && matchesCollection && matchesCategory && matchesSubcategory;
  });

  const filteredSubcategoriesForDropdown = subcategories.filter((sub) => {
    if (categoryFilter === 'all') return true;
    const selectedCat = categories.find((c) => c.slug === categoryFilter || c.id === categoryFilter);
    return selectedCat ? sub.category_id === selectedCat.id : true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              PRODUCT CATALOG &amp; VARIANTS
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Manage product pricing, SKU matrices, multi-color swatches and publication states.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/size-charts">
              <Button variant="outline" size="md" icon={<Ruler className="w-4 h-4" />}>
                SIZE CHARTS
              </Button>
            </Link>
            <Link to="/admin/products/new">
              <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
                ADD PRODUCT
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 border border-[#E7E7E7] rounded-[4px] shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by title, SKU, or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-2 pl-8 pr-3 focus:outline-none focus:border-[#3F3F8F]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Garment Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#888888] uppercase text-[10px] font-semibold">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter('all');
                }}
                className="border border-[#E7E7E7] rounded-[4px] py-2 px-3 focus:outline-none focus:border-[#3F3F8F] bg-white font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Garment Subcategory Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#888888] uppercase text-[10px] font-semibold">Subcategory:</span>
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="border border-[#E7E7E7] rounded-[4px] py-2 px-3 focus:outline-none focus:border-[#3F3F8F] bg-white font-medium cursor-pointer"
              >
                <option value="all">All Subcategories</option>
                {filteredSubcategoriesForDropdown.map((s) => (
                  <option key={s.id || s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Curated Collection Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#888888] uppercase text-[10px] font-semibold">Collection:</span>
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="border border-[#E7E7E7] rounded-[4px] py-2 px-3 focus:outline-none focus:border-[#3F3F8F] bg-white font-medium cursor-pointer"
              >
                <option value="all">All Collections</option>
                {collections.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#888888] uppercase text-[10px] font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-[#E7E7E7] rounded-[4px] py-2 px-3 focus:outline-none focus:border-[#3F3F8F] bg-white font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {(categoryFilter !== 'all' || subcategoryFilter !== 'all' || collectionFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSubcategoryFilter('all');
                  setCollectionFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="text-[10px] uppercase font-semibold text-[#888888] hover:text-[#3F3F8F] underline ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category &amp; Collections</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Variants</th>
                  <th className="p-4">Total Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filtered.map((product) => {
                  const variants = product.variants || [];
                  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
                  const isLow = variants.some((v) => (Number(v.stock_quantity) || 0) <= (Number(v.low_stock_threshold) || 5));

                  return (
                    <tr key={product.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-4">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                        >
                          <div className="w-12 h-16 bg-neutral-100 rounded-[2px] overflow-hidden shrink-0 border border-[#E7E7E7]">
                            <img
                              src={product.images[0]?.image_url || '/Assets/products/placeholder-product.svg'}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-black text-sm group-hover:text-[#3F3F8F] transition-colors">
                              {product.title}
                            </div>
                            <div className="text-[10px] text-[#888888] font-mono">
                              SKU: {variants[0]?.sku || 'TAN-TANOAH'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 text-[#666666]">
                        <div className="space-y-1.5">
                          {(product.category_name || product.category?.name) && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#FAF5FF] text-[#7E22CE] border border-[#F3E8FF] rounded text-[9px] font-semibold uppercase tracking-wider">
                                Cat: {product.category_name || product.category?.name}
                              </span>
                              {(product.subcategory_name || product.subcategory?.name) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#D1FAE5] rounded text-[9px] font-semibold uppercase tracking-wider">
                                  Sub: {product.subcategory_name || product.subcategory?.name}
                                </span>
                              )}
                            </div>
                          )}
                          {product.collections && product.collections.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.collections.map((slug) => {
                                const matchCol = collections.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
                                return (
                                  <span
                                    key={slug}
                                    className="inline-block px-2 py-0.5 bg-[#EEEEF8] text-[#3F3F8F] rounded text-[10px] font-semibold"
                                  >
                                    {matchCol?.title || slug}
                                  </span>
                                );
                              })}
                            </div>
                          ) : !(product.category_name || product.category?.name) ? (
                            <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-black">
                        {formatPrice(product.sale_price ?? product.base_price)}
                        {product.sale_price && (
                          <span className="block text-[10px] text-[#888888] line-through font-normal">
                            {formatPrice(product.base_price)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[#666666]">
                        {variants.length} combinations
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold ${totalStock === 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-black'}`}>
                          {totalStock} in stock
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            product.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : product.status === 'draft'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {product.status === 'draft' ? 'Draft (Hidden)' : product.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link
                          to={`/products/${product.slug}`}
                          target="_blank"
                          className="inline-block p-1 text-neutral-500 hover:text-black"
                          title="View on Storefront"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="inline-block p-1 text-neutral-500 hover:text-[#3F3F8F]"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(product)}
                          disabled={duplicatingId === product.id}
                          className="inline-block p-1 text-neutral-500 hover:text-[#3F3F8F] transition-colors disabled:opacity-40"
                          title="Duplicate Product (Handles unique IDs, slug, & variant SKUs)"
                        >
                          <Copy className={`w-4 h-4 ${duplicatingId === product.id ? 'animate-pulse text-[#3F3F8F]' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="inline-block p-1 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
