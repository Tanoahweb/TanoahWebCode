import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Truck, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { formatPrice } from '../../utils/formatters';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';

export const OrderListPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const liveOrders = await api.getAdminOrders();
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const formatted = (liveOrders || [])
        .filter((o: any) => {
          const num = o.order_number || o.orderNumber || o.id;
          // Drop rows where order number is a UUID without customer info
          if (isUUID(num) && !o.shipping_address && !o.guest_email && (!o.items || o.items.length === 0)) {
            return false;
          }
          return true;
        })
        .map((o: any) => {
          const realOrderNum = o.order_number || o.orderNumber || o.id;
          return {
            id: o.id || realOrderNum,
            orderNumber: realOrderNum,
            customer:
              (o.shipping_address?.first_name ? `${o.shipping_address.first_name} ${o.shipping_address.last_name || ''}`.trim() : null) ||
              (o.formData?.firstName ? `${o.formData.firstName} ${o.formData.lastName || ''}`.trim() : null) ||
              o.guest_email ||
              'Customer',
            email: o.guest_email || o.formData?.email || '',
            total: Number(o.grand_total || o.grandTotal || o.subtotal || 0),
            paymentStatus: o.payment_status || 'paid',
            fulfillmentStatus: o.status || 'processing',
            trackingNumber: o.tracking_number || o.trackingNumber || '',
            courierName: o.courier_name || 'India Post (Speed Post)',
            date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : (o.date || new Date().toISOString().split('T')[0]),
          };
        });
      setOrders(formatted);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const handleUpdate = () => {
      loadOrders();
    };

    window.addEventListener('tanoah_orders_updated', handleUpdate);
    return () => {
      window.removeEventListener('tanoah_orders_updated', handleUpdate);
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const existing = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    const realOrderNumber = existing?.orderNumber || orderId;
    const currentTracking = (existing?.trackingNumber || '').trim();

    // Mandate India Post Consignment No. when admin tries to change the status to Shipped or any status after Shipped (Except cancelled)
    const isDispatchStatus = ['shipped', 'out_for_delivery', 'delivered'].includes(newStatus.toLowerCase());
    if (isDispatchStatus && !currentTracking) {
      addToast({
        type: 'error',
        title: 'Consignment No. Required',
        description: `India Post Consignment No. is mandatory before marking order ${realOrderNumber} as ${newStatus.toUpperCase()}. Please enter the consignment number first.`,
      });
      // Abort change; select input remains at its current state
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, fulfillmentStatus: newStatus, trackingNumber: currentTracking } : o))
    );

    const res = await api.updateOrderStatus(realOrderNumber, newStatus, currentTracking, 'India Post (Speed Post)');
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Status Updated',
        description: `Order ${realOrderNumber} marked as ${newStatus.toUpperCase()}.`,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: res.message || 'Failed to update order status.',
      });
    }
  };

  const handleConsignmentChange = async (orderId: string, consignmentNo: string) => {
    const trimmed = consignmentNo.trim().toUpperCase();
    const existing = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    const realOrderNumber = existing?.orderNumber || orderId;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, trackingNumber: trimmed } : o))
    );

    const res = await api.updateOrderStatus(realOrderNumber, existing?.fulfillmentStatus || 'processing', trimmed, 'India Post (Speed Post)');
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Consignment Saved',
        description: `India Post Consignment ${trimmed || 'cleared'} for order ${realOrderNumber}.`,
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins">
        <div>
          <h1 className="font-wondra text-2xl sm:text-3xl text-black">
            ORDER FULFILLMENT & DISPATCH
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Track customer orders, manage shipping labels, update statuses, and issue invoice manifests.
          </p>
        </div>

        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Fulfillment Status</th>
                  <th className="p-4">India Post Consignment</th>
                  <th className="p-4 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#3F3F8F] border-t-transparent rounded-full animate-spin" />
                        <span>Loading live orders from Supabase...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-neutral-500">
                      <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <div className="font-semibold text-black text-sm">No orders found</div>
                      <p className="text-neutral-400 text-xs mt-1">When customers place orders, they will appear here dynamically in real-time.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 font-mono font-bold">
                      <Link to={`/admin/orders/${ord.orderNumber}`} className="text-[#3F3F8F] hover:underline" title="Click to open full Order Details & Dispatch Management">
                        {ord.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-[#666666]">{ord.date}</td>
                    <td className="p-4">
                      <div className="font-semibold text-black">{ord.customer}</div>
                      <div className="text-[10px] text-[#888888]">{ord.email}</div>
                    </td>
                    <td className="p-4 font-semibold text-black">{formatPrice(ord.total)}</td>
                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-purple-50 text-[#3F3F8F] text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                        {ord.fulfillmentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={
                            ['shipped', 'delivered', 'out_for_delivery'].includes(ord.fulfillmentStatus.toLowerCase()) && !ord.trackingNumber
                              ? 'Required (ED123..)'
                              : 'e.g. ED123456789IN'
                          }
                          defaultValue={ord.trackingNumber || ''}
                          key={`${ord.orderNumber}-${ord.trackingNumber || ''}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim().toUpperCase();
                            if (val !== (ord.trackingNumber || '')) {
                              handleConsignmentChange(ord.orderNumber || ord.id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-36 p-1.5 border rounded-[4px] font-mono text-xs focus:outline-none uppercase bg-white placeholder:normal-case placeholder:font-sans ${
                            ['shipped', 'delivered', 'out_for_delivery'].includes(ord.fulfillmentStatus.toLowerCase()) && !ord.trackingNumber
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-[#E7E7E7]'
                          }`}
                        />
                        {ord.trackingNumber && (
                          <a
                            href="https://www.indiapost.gov.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Track live on indiapost.gov.in"
                            className="text-[#3F3F8F] hover:text-black p-1 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={ord.fulfillmentStatus}
                        onChange={(e) => handleStatusChange(ord.orderNumber || ord.id, e.target.value)}
                        className="p-1.5 border border-[#E7E7E7] rounded-[4px] bg-white text-xs font-semibold focus:outline-none focus:border-[#3F3F8F] cursor-pointer uppercase"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
