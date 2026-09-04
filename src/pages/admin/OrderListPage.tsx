import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Truck, CheckCircle2, X } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { formatPrice } from '../../utils/formatters';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';

const DEFAULT_ORDERS = [
  {
    id: 'ord-1',
    orderNumber: 'TAN-849201',
    customer: 'Aditya Sharma',
    email: 'aditya@example.com',
    total: 3998,
    paymentStatus: 'paid',
    fulfillmentStatus: 'packed',
    date: '2026-09-02',
  },
  {
    id: 'ord-2',
    orderNumber: 'TAN-849198',
    customer: 'Meera Iyer',
    email: 'meera@example.com',
    total: 5499,
    paymentStatus: 'paid',
    fulfillmentStatus: 'processing',
    date: '2026-09-02',
  },
  {
    id: 'ord-3',
    orderNumber: 'TAN-849194',
    customer: 'Karan Mehta',
    email: 'karan@example.com',
    total: 11297,
    paymentStatus: 'paid',
    fulfillmentStatus: 'shipped',
    date: '2026-09-01',
  },
];

export const OrderListPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [orders, setOrders] = useState(DEFAULT_ORDERS);

  useEffect(() => {
    let isMounted = true;
    api.getAdminOrders().then((liveOrders) => {
      if (isMounted && liveOrders && liveOrders.length > 0) {
        const formatted = liveOrders.map((o: any) => ({
          id: o.id || o.order_number || o.orderNumber,
          orderNumber: o.order_number || o.orderNumber || o.id,
          customer:
            (o.shipping_address?.first_name ? `${o.shipping_address.first_name} ${o.shipping_address.last_name || ''}`.trim() : null) ||
            (o.formData?.firstName ? `${o.formData.firstName} ${o.formData.lastName || ''}`.trim() : null) ||
            o.guest_email ||
            'Customer',
          email: o.guest_email || o.formData?.email || '',
          total: Number(o.grand_total || o.grandTotal || o.subtotal || 0),
          paymentStatus: o.payment_status || 'paid',
          fulfillmentStatus: o.status || 'processing',
          date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : (o.date || new Date().toISOString().split('T')[0]),
        }));
        setOrders(formatted);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, fulfillmentStatus: newStatus } : o))
    );
    await api.updateOrderStatus(orderId, newStatus, `BD${Math.floor(10000000 + Math.random() * 90000000)}IN`);
    addToast({
      type: 'success',
      title: 'Order Status Updated',
      description: `Order ${orderId} marked as ${newStatus.toUpperCase()}.`,
    });
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
                  <th className="p-4 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 font-mono font-bold">
                      <Link to={`/admin/orders/${ord.orderNumber}`} className="text-[#3F3F8F] hover:underline">
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
                    <td className="p-4 text-right">
                      <select
                        value={ord.fulfillmentStatus}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
