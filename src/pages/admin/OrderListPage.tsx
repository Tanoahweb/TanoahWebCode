import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Truck, CheckCircle2, X, ExternalLink, Printer } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { formatPrice } from '../../utils/formatters';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { PackingSlipModal } from '../../components/admin/PackingSlipModal';
import { DispatchFromAddressConfig } from '../../types';

export const OrderListPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<any | null>(null);
  const [dispatchFromAddress, setDispatchFromAddress] = useState<DispatchFromAddressConfig | undefined>(() => {
    try {
      const saved = localStorage.getItem('tanoah_dispatch_from_address');
      if (saved) return JSON.parse(saved);
    } catch {}
    return undefined;
  });

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
          const sAddr = o.shipping_address || o.formData || {};
          return {
            id: o.id || realOrderNum,
            orderNumber: realOrderNum,
            customer:
              (sAddr.first_name ? `${sAddr.first_name} ${sAddr.last_name || ''}`.trim() : null) ||
              (sAddr.firstName ? `${sAddr.firstName} ${sAddr.lastName || ''}`.trim() : null) ||
              o.guest_email ||
              'Customer',
            email: o.guest_email || sAddr.email || '',
            phone: sAddr.phone || o.guest_phone || '',
            total: Number(o.grand_total || o.grandTotal || o.subtotal || 0),
            paymentStatus: o.payment_status || 'paid',
            fulfillmentStatus: o.status || 'processing',
            trackingNumber: o.tracking_number || o.trackingNumber || '',
            courierName: o.courier_name || 'India Post (Speed Post)',
            date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : (o.date || new Date().toISOString().split('T')[0]),
            shippingAddress: {
              firstName: sAddr.first_name || sAddr.firstName || 'Customer',
              lastName: sAddr.last_name || sAddr.lastName || '',
              phone: sAddr.phone || o.guest_phone || '+91 8714141849',
              email: o.guest_email || sAddr.email || '',
              address: sAddr.address || 'Address on file',
              apartment: sAddr.apartment || '',
              city: sAddr.city || 'Thrissur',
              state: sAddr.state || 'Kerala',
              postalCode: sAddr.postal_code || sAddr.postalCode || '680301',
            },
          };
        });
      setOrders(formatted);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.getStoreSettings().then((s) => {
      if (s?.dispatch_from_address) {
        setDispatchFromAddress(s.dispatch_from_address);
      }
    });
  }, []);

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
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Fulfillment Status</th>
                  <th className="p-4 w-48 min-w-[190px]">India Post Consignment</th>
                  <th className="p-4 text-right w-60 min-w-[240px] whitespace-nowrap">Update Status & Slip</th>
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
                  orders.map((ord) => {
                    const hasTracking = Boolean(ord.trackingNumber && ord.trackingNumber.trim());
                    return (
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
                        <td className="p-4 w-48 min-w-[190px]">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder={
                                ['shipped', 'delivered', 'out_for_delivery'].includes(ord.fulfillmentStatus.toLowerCase()) && !hasTracking
                                  ? 'Required (ED123..)'
                                  : 'e.g. ED123456789IN'
                              }
                              value={ord.trackingNumber || ''}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setOrders((prev) =>
                                  prev.map((o) =>
                                    o.id === ord.id || o.orderNumber === ord.orderNumber
                                      ? { ...o, trackingNumber: val }
                                      : o
                                  )
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.trim().toUpperCase();
                                handleConsignmentChange(ord.orderNumber || ord.id, val);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className={`w-36 h-[34px] p-1.5 border rounded-[4px] font-mono text-xs focus:outline-none uppercase bg-white placeholder:normal-case placeholder:font-sans shrink-0 ${
                                !hasTracking
                                  ? 'border-neutral-300 focus:border-[#3F3F8F]'
                                  : 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-500'
                              }`}
                            />
                            <div className="w-6 h-[34px] flex items-center justify-center shrink-0">
                              {ord.trackingNumber ? (
                                <a
                                  href="https://www.indiapost.gov.in/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Track live on indiapost.gov.in"
                                  className="text-[#3F3F8F] hover:text-black p-1 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right w-60 min-w-[240px]">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedPrintOrder(ord)}
                              title="Print Shipping Label / Packing Slip (TO & FROM Address only)"
                              className="h-[34px] px-2.5 text-[10px] uppercase font-semibold flex items-center justify-center gap-1 shrink-0 whitespace-nowrap border border-[#E7E7E7] hover:border-[#3F3F8F] bg-white hover:bg-[#F8F8F8] text-neutral-800"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#3F3F8F]" />
                              <span>Slip</span>
                            </Button>
                            <select
                              value={ord.fulfillmentStatus}
                              onChange={(e) => handleStatusChange(ord.orderNumber || ord.id, e.target.value)}
                              title={!hasTracking ? 'India Post Consignment No. required to select Shipped or Delivered' : 'Update Fulfillment Status'}
                              className="w-36 min-w-[144px] max-w-[144px] h-[34px] p-1.5 border border-[#E7E7E7] rounded-[4px] bg-white text-xs font-semibold focus:outline-none focus:border-[#3F3F8F] cursor-pointer uppercase shrink-0"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="packed">Packed</option>
                              <option value="shipped" disabled={!hasTracking}>
                                Shipped {!hasTracking ? '(Locked)' : ''}
                              </option>
                              <option value="delivered" disabled={!hasTracking}>
                                Delivered {!hasTracking ? '(Locked)' : ''}
                              </option>
                              <option value="cancelled">Cancelled</option>
                            </select>
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

      {/* Printable Minimalist Packing Slip Modal */}
      {selectedPrintOrder && (
        <PackingSlipModal
          isOpen={Boolean(selectedPrintOrder)}
          onClose={() => setSelectedPrintOrder(null)}
          orderNumber={selectedPrintOrder.orderNumber}
          orderDate={selectedPrintOrder.date}
          consignmentNo={selectedPrintOrder.trackingNumber}
          courierName={selectedPrintOrder.courierName}
          toAddress={selectedPrintOrder.shippingAddress}
          fromAddress={dispatchFromAddress}
        />
      )}
    </AdminLayout>
  );
};
