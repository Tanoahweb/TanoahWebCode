import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, Check, RefreshCw, Search, Filter } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { Product } from '../../types';

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadCatalog = () => {
    setIsLoading(true);
    api.getProducts().then((liveProducts) => {
      setProducts(liveProducts || []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleStockUpdate = async (variantId: string, newQty: number) => {
    const cleanQty = Math.max(0, newQty);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        variants: (p.variants || []).map((v) => (v.id === variantId ? { ...v, stock_quantity: cleanQty } : v)),
      }))
    );

    await api.updateVariantStock(variantId, cleanQty, 'manual_adjustment');

    addToast({
      type: 'success',
      title: 'Stock Updated',
      description: `Variant inventory quantity updated to ${cleanQty}.`,
    });
  };

  const allVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({ product: p, variant: v }))
  );

  const filteredVariants = allVariants.filter(({ product, variant }) => {
    const isLow = variant.stock_quantity > 0 && variant.stock_quantity <= variant.low_stock_threshold;
    const isOut = variant.stock_quantity === 0;

    if (stockFilter === 'low' && !isLow) return false;
    if (stockFilter === 'out' && !isOut) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(term) ||
      variant.sku.toLowerCase().includes(term) ||
      variant.color_name.toLowerCase().includes(term) ||
      variant.size.toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              INVENTORY & REAL-TIME STOCK
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Manage variant stock levels, update safety thresholds, and track live reserve quantities.
            </p>
          </div>
          <button
            onClick={loadCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E7E7E7] text-neutral-700 hover:bg-[#F8F8F8] text-xs font-semibold rounded-[4px] shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Stock</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E7E7E7] rounded-[4px] shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                stockFilter === 'all'
                  ? 'bg-[#3F3F8F] text-white'
                  : 'bg-[#F8F8F8] text-neutral-600 hover:bg-[#EEEEF8]'
              }`}
            >
              All Variants ({allVariants.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                stockFilter === 'low'
                  ? 'bg-amber-500 text-white'
                  : 'bg-[#F8F8F8] text-amber-700 hover:bg-amber-50'
              }`}
            >
              Low Stock (
              {allVariants.filter((v) => v.variant.stock_quantity > 0 && v.variant.stock_quantity <= v.variant.low_stock_threshold).length}
              )
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                stockFilter === 'out'
                  ? 'bg-red-600 text-white'
                  : 'bg-[#F8F8F8] text-red-700 hover:bg-red-50'
              }`}
            >
              Out of Stock ({allVariants.filter((v) => v.variant.stock_quantity === 0).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, SKU, or color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Garment Title</th>
                  <th className="p-4">SKU Code</th>
                  <th className="p-4">Color & Size</th>
                  <th className="p-4">Threshold</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4 text-right">Adjust Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredVariants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#888888] text-xs">
                      No variants match the current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVariants.map(({ product, variant }) => {
                    const isLow = variant.stock_quantity > 0 && variant.stock_quantity <= variant.low_stock_threshold;
                    const isOut = variant.stock_quantity === 0;

                    return (
                      <tr key={variant.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-4 font-semibold text-black">
                          <div className="line-clamp-1">{product.title}</div>
                        </td>
                        <td className="p-4 font-mono text-[#666666]">{variant.sku}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                              style={{ backgroundColor: variant.color_hex }}
                            />
                            <span>
                              {variant.color_name} / {variant.size}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[#888888]">{variant.low_stock_threshold} units</td>
                        <td className="p-4">
                          <span
                            className={`font-semibold ${
                              isOut
                                ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px]'
                                : isLow
                                ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]'
                                : 'text-emerald-700'
                            }`}
                          >
                            {variant.stock_quantity} available
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStockUpdate(variant.id, Math.max(0, variant.stock_quantity - 1))}
                              className="px-2 py-1 bg-[#F8F8F8] hover:bg-neutral-200 text-black font-semibold rounded-[2px] transition-colors text-xs border border-[#E7E7E7]"
                              title="Decrease by 1"
                            >
                              -1
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={variant.stock_quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleStockUpdate(variant.id, val);
                                }
                              }}
                              className="w-16 p-1 text-center font-mono font-semibold border border-[#E7E7E7] rounded-[2px] focus:outline-none focus:border-[#3F3F8F]"
                            />
                            <button
                              onClick={() => handleStockUpdate(variant.id, variant.stock_quantity + 1)}
                              className="px-2 py-1 bg-[#F8F8F8] hover:bg-neutral-200 text-black font-semibold rounded-[2px] transition-colors text-xs border border-[#E7E7E7]"
                              title="Increase by 1"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleStockUpdate(variant.id, variant.stock_quantity + 5)}
                              className="px-2.5 py-1 bg-[#EEEEF8] hover:bg-[#3F3F8F] hover:text-white text-[#3F3F8F] font-semibold rounded-[2px] transition-colors text-xs ml-1"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleStockUpdate(variant.id, variant.stock_quantity + 20)}
                              className="px-2.5 py-1 bg-[#EEEEF8] hover:bg-[#3F3F8F] hover:text-white text-[#3F3F8F] font-semibold rounded-[2px] transition-colors text-xs"
                            >
                              +20
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
