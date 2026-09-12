import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, ArrowUpRight, CheckCircle2, DollarSign } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { formatPrice } from '../../utils/formatters';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { Product } from '../../types';

export const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [loadedOrders, loadedProducts] = await Promise.all([
        api.getAdminOrders(),
        api.getProducts(),
      ]);
      setOrders(loadedOrders || []);
      setProducts(loadedProducts || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('tanoah_orders_updated', handleUpdate);
    window.addEventListener('tanoah_products_updated', handleUpdate);

    // Supabase Realtime channel for live order updates
    const channel = supabase
      .channel('admin_dashboard_orders_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('tanoah_orders_updated', handleUpdate);
      window.removeEventListener('tanoah_products_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute purely dynamic live business metrics
  const nonCancelledOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => {
    const val = Number(o.grand_total || o.grandTotal || o.subtotal || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const activeOrdersCount = nonCancelledOrders.length;
  const aov = nonCancelledOrders.length > 0 ? Math.round(totalRevenue / nonCancelledOrders.length) : 0;

  const uniqueClients = new Set(
    orders.map((o) => (o.guest_email || o.formData?.email || '').toLowerCase().trim()).filter(Boolean)
  ).size;

  const lowStockVariants = products.flatMap((p) =>
    (p.variants || [])
      .filter((v) => v.stock_quantity <= v.low_stock_threshold)
      .map((v) => ({ product: p, variant: v }))
  );

  const recentOrders = orders.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-8 text-left font-poppins">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              EXECUTIVE STORE OVERVIEW
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Live business metrics, sales volume, and real-time inventory alerts.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/products/new"
              className="px-4 py-2 bg-[#3F3F8F] text-white rounded-[4px] font-semibold text-xs hover:bg-[#343476] transition-colors"
            >
              + Add New Product
            </Link>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[#888888] text-[11px] font-semibold uppercase">
              <span>STORE REVENUE</span>
              <DollarSign className="w-4 h-4 text-[#3F3F8F]" />
            </div>
            <div className="text-2xl font-bold text-black">
              {isLoading ? (
                <div className="h-8 w-28 bg-neutral-100 animate-pulse rounded" />
              ) : (
                formatPrice(totalRevenue)
              )}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Gross Volume
            </div>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[#888888] text-[11px] font-semibold uppercase">
              <span>TOTAL ORDERS</span>
              <ShoppingBag className="w-4 h-4 text-[#3F3F8F]" />
            </div>
            <div className="text-2xl font-bold text-black">
              {isLoading ? (
                <div className="h-8 w-16 bg-neutral-100 animate-pulse rounded" />
              ) : (
                orders.length
              )}
            </div>
            <div className="text-[10px] text-[#3F3F8F] font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {activeOrdersCount} active orders
            </div>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[#888888] text-[11px] font-semibold uppercase">
              <span>AVERAGE BASKET (AOV)</span>
              <TrendingUp className="w-4 h-4 text-[#3F3F8F]" />
            </div>
            <div className="text-2xl font-bold text-black">
              {isLoading ? (
                <div className="h-8 w-24 bg-neutral-100 animate-pulse rounded" />
              ) : (
                formatPrice(aov)
              )}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              Calculated across {activeOrdersCount} orders
            </div>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[#888888] text-[11px] font-semibold uppercase">
              <span>CLIENT BASE</span>
              <Users className="w-4 h-4 text-[#3F3F8F]" />
            </div>
            <div className="text-2xl font-bold text-black">
              {isLoading ? (
                <div className="h-8 w-16 bg-neutral-100 animate-pulse rounded" />
              ) : (
                uniqueClients
              )}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              {uniqueClients === 1 ? '1 verified customer profile' : `${uniqueClients} verified customer profiles`}
            </div>
          </div>
        </div>

        {/* Inventory Warning & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Orders (Col 8) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-wondra text-lg text-black">RECENT DISPATCH PIPELINE</h3>
              <Link to="/admin/orders" className="text-xs text-[#3F3F8F] font-semibold hover:underline flex items-center gap-1">
                View All Orders <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {recentOrders.map((o: any) => {
                    const orderNum = o.order_number || o.orderNumber || o.id;
                    const customerName =
                      (o.shipping_address?.first_name ? `${o.shipping_address.first_name} ${o.shipping_address.last_name || ''}`.trim() : null) ||
                      (o.formData?.firstName ? `${o.formData.firstName} ${o.formData.lastName || ''}`.trim() : null) ||
                      o.guest_email ||
                      'Customer';
                    const itemsCount = o.items?.length || 1;
                    const totalVal = Number(o.grand_total || o.grandTotal || o.subtotal || 0);

                    return (
                      <tr key={orderNum} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3 font-mono font-bold text-black">{orderNum}</td>
                        <td className="p-3 truncate max-w-[150px]">{customerName}</td>
                        <td className="p-3">{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</td>
                        <td className="p-3 font-semibold text-black">{formatPrice(totalVal)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                            o.status === 'delivered' || o.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {o.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-3">
                          <Link to={`/admin/orders/${orderNum}`} className="text-[#3F3F8F] font-semibold hover:underline">
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts (Col 4) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-wondra text-lg text-black">LOW STOCK ALERTS</h3>
            </div>

            <div className="space-y-3">
              {lowStockVariants.length === 0 ? (
                <div className="p-4 bg-neutral-50 rounded text-center text-[#888888] text-xs">
                  All items are well stocked above safety threshold.
                </div>
              ) : (
                lowStockVariants.slice(0, 4).map(({ product, variant }) => (
                  <div key={variant.id} className="p-3 bg-[#FFF8E1]/40 border border-[#FFE082] rounded-[4px] flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-black line-clamp-1">{product.title}</div>
                      <div className="text-[10px] text-[#666666]">
                        {variant.color_name} • Size {variant.size} • <span className="font-mono">{variant.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-700">
                        {variant.stock_quantity === 0 ? 'SOLD OUT' : `${variant.stock_quantity} Left`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              to="/admin/inventory"
              className="block text-center py-2.5 bg-[#F8F8F8] hover:bg-[#EEEEF8] text-[#3F3F8F] rounded-[4px] font-semibold text-xs uppercase tracking-wider transition-colors"
            >
              Manage Inventory Stock
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
