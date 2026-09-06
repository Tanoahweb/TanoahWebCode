import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, CheckCheck, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { formatPrice } from '../../utils/formatters';

interface NotificationOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  total: number;
  status: string;
  createdAt: string;
  isUnread: boolean;
}

const STORAGE_KEY = 'tanoah_admin_last_read_order_time';

export const AdminOrderNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState<NotificationOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTime, setLastReadTime] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    try {
      const rawOrders = await api.getAdminOrders();
      if (!rawOrders) return;

      const mapped: NotificationOrder[] = rawOrders
        .slice(0, 10)
        .map((o: any) => {
          const orderNum = o.order_number || o.orderNumber || o.id;
          const orderDate = o.created_at || o.date || new Date().toISOString();
          const orderTimestamp = new Date(orderDate).getTime();
          const customerName =
            (o.shipping_address?.first_name ? `${o.shipping_address.first_name} ${o.shipping_address.last_name || ''}`.trim() : null) ||
            (o.formData?.firstName ? `${o.formData.firstName} ${o.formData.lastName || ''}`.trim() : null) ||
            o.guest_email ||
            'Customer';

          return {
            id: o.id || orderNum,
            orderNumber: orderNum,
            customerName,
            email: o.guest_email || o.formData?.email || '',
            total: Number(o.grand_total || o.grandTotal || o.subtotal || 0),
            status: o.status || 'processing',
            createdAt: orderDate,
            isUnread: lastReadTime === 0 ? false : orderTimestamp > lastReadTime,
          };
        });

      setOrders(mapped);

      // If lastReadTime was never set, initialize it to the latest order's time so historical orders don't blast unread
      if (lastReadTime === 0 && mapped.length > 0) {
        const latestTime = Math.max(...mapped.map((m) => new Date(m.createdAt).getTime()));
        localStorage.setItem(STORAGE_KEY, String(latestTime));
        setLastReadTime(latestTime);
        setUnreadCount(0);
      } else {
        const unread = mapped.filter((o) => new Date(o.createdAt).getTime() > lastReadTime).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Failed to load order notifications:', err);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      fetchOrders();
    };

    window.addEventListener('tanoah_orders_updated', handleUpdate);

    // Supabase Realtime channel for instant order updates
    const channel = supabase
      .channel('admin_order_bell_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      window.removeEventListener('tanoah_orders_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [lastReadTime]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    setLastReadTime(now);
    setUnreadCount(0);
    setOrders((prev) => prev.map((o) => ({ ...o, isUnread: false })));
  };

  const handleOrderClick = (orderNumber: string) => {
    setIsOpen(false);
    navigate(`/admin/orders/${orderNumber}`);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'confirmed' || s === 'paid') {
      return <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Confirmed</span>;
    }
    if (s === 'pending_payment' || s === 'pending') {
      return <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Pending</span>;
    }
    if (s === 'processing' || s === 'packed') {
      return <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase">Processing</span>;
    }
    if (s === 'shipped' || s === 'out_for_delivery') {
      return <span className="text-[9px] font-semibold bg-purple-50 text-[#3F3F8F] px-1.5 py-0.5 rounded uppercase">Shipped</span>;
    }
    if (s === 'delivered') {
      return <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase">Delivered</span>;
    }
    if (s === 'cancelled') {
      return <span className="text-[9px] font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded uppercase">Cancelled</span>;
    }
    return <span className="text-[9px] font-semibold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase">{status}</span>;
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        aria-label="Order Notifications"
        className={`relative p-2 rounded-full border transition-all ${
          isOpen
            ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
            : 'border-[#E7E7E7] text-neutral-600 hover:bg-[#F8F8F8] hover:text-[#3F3F8F]'
        }`}
        title={unreadCount > 0 ? `${unreadCount} new order notification${unreadCount > 1 ? 's' : ''}` : 'Order Notifications'}
      >
        <Bell className="w-4 h-4" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E7E7E7] rounded-[4px] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-left">
          {/* Popover Header */}
          <div className="p-3.5 bg-neutral-50/80 border-b border-[#E7E7E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-black uppercase tracking-wider font-poppins">
                Order Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-[#EEEEF8] text-[#3F3F8F] px-1.5 py-0.5 rounded">
                  {unreadCount} New
                </span>
              )}
            </div>

            {orders.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-[#3F3F8F] hover:underline font-medium flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Orders List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E7E7E7]">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-600">No orders yet</p>
                <p className="text-[11px] text-neutral-400">
                  New orders will automatically appear here with instant alerts.
                </p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => handleOrderClick(ord.orderNumber)}
                  className={`p-3.5 hover:bg-[#FAFAFA] cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                    ord.isUnread ? 'bg-[#EEEEF8]/30' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#3F3F8F] hover:underline">
                        #{ord.orderNumber}
                      </span>
                      {getStatusBadge(ord.status)}
                      {ord.isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3F3F8F] shrink-0" />
                      )}
                    </div>

                    <div className="text-xs font-medium text-black truncate">
                      {ord.customerName}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#888888]">
                      <span>{formatPrice(ord.total)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {formatRelativeTime(ord.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="self-center shrink-0">
                    <span className="p-1 rounded text-neutral-400 hover:text-[#3F3F8F]">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-2.5 bg-[#F8F8F8] border-t border-[#E7E7E7] text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/orders');
              }}
              className="w-full py-1.5 text-xs text-[#3F3F8F] font-semibold hover:underline flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View All Orders & Fulfillment</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
