import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, ArrowUpDown } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SAMPLE_PRODUCTS } from '../../data/mockData';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

import { api } from '../../services/api';
import { useUIStore } from '../../store/useUIStore';
import { Product } from '../../types';

export const ProductListPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadProducts = () => {
    api.getProducts().then((data) => {
      if (data) {
        setProducts(data);
      }
    });
  };

  React.useEffect(() => {
    loadProducts();
    window.addEventListener('tanoah_products_updated', loadProducts);
    return () => {
      window.removeEventListener('tanoah_products_updated', loadProducts);
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

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              PRODUCT CATALOG & VARIANTS
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Manage product pricing, SKU matrices, multi-color swatches and publication states.
            </p>
          </div>

          <Link to="/admin/products/new">
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
              ADD PRODUCT
            </Button>
          </Link>
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
        </div>

        {/* Product Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category</th>
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
                              SKU: {variants[0]?.sku || 'TAN-ATELIER'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 text-[#666666] font-medium">{product.category_name || 'Men'}</td>
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
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                          {product.status}
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
