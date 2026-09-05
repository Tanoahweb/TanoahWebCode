import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  ArrowRight,
  Filter,
  Search,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useUIStore } from '../../store/useUIStore';

interface ReturnTicket {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  return_type: 'return' | 'exchange';
  reason: string;
  customer_description?: string;
  product_title: string;
  variant_info: string;
  status: 'requested' | 'approved' | 'item_received' | 'completed' | 'rejected';
  created_at: string;
}

const INITIAL_TICKETS: ReturnTicket[] = [
  {
    id: 'ret_101',
    order_number: 'TAN-849201',
    customer_name: 'Aditya Sharma',
    customer_email: 'aditya.sharma@example.com',
    return_type: 'exchange',
    reason: 'Size Too Large',
    customer_description: 'The Medium fits looser than expected. Would like to exchange for size Small in Noir Black.',
    product_title: 'Signature Heavyweight Oversized Tee',
    variant_info: 'Noir Black / M -> Exchange for S',
    status: 'requested',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'ret_102',
    order_number: 'TAN-719382',
    customer_name: 'Mira Nair',
    customer_email: 'mira.nair@example.com',
    return_type: 'return',
    reason: 'Fabric Preference',
    customer_description: 'Looking for a slightly heavier drape for autumn.',
    product_title: 'French Linen Relaxed Camp Shirt',
    variant_info: 'Ecru Sand / M',
    status: 'approved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ret_103',
    order_number: 'TAN-659102',
    customer_name: 'Karan Patel',
    customer_email: 'karan.patel@example.com',
    return_type: 'exchange',
    reason: 'Color Exchange',
    customer_description: 'Exchanging Slate Navy for Charcoal Grey.',
    product_title: 'Tailored Wide-Leg Pleated Trouser',
    variant_info: 'Slate Navy / 32 -> Exchange for Charcoal',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

import { api } from '../../services/api';

export const ReturnsQueuePage: React.FC = () => {
  const { addToast } = useUIStore();
  const [tickets, setTickets] = useState<ReturnTicket[]>(INITIAL_TICKETS);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadTickets = async () => {
    const live = await api.getReturnTickets();
    if (live && live.length > 0) {
      setTickets(live);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleUpdateStatus = async (ticketId: string, newStatus: ReturnTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    await api.updateReturnTicketStatus(ticketId, newStatus);

    addToast({
      type: 'success',
      title: 'Ticket Updated',
      description: `Return ticket ${ticketId} status updated to ${newStatus.toUpperCase()}.`,
    });
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesTab = activeTab === 'all' || t.status === activeTab;
    const matchesSearch =
      t.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.product_title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = tickets.filter((t) => t.status === 'requested').length;
  const approvedCount = tickets.filter((t) => t.status === 'approved').length;
  const completedCount = tickets.filter((t) => t.status === 'completed').length;

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              RETURNS & EXCHANGES HUB
            </h1>
            <p className="text-[#666666] mt-0.5">
              Review customer size exchange requests, approve reverse courier pickups, and authorize store credits.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              ACTION REQUIRED (PENDING)
            </span>
            <div className="text-2xl font-bold text-amber-600 font-mono">{pendingCount}</div>
            <p className="text-[11px] text-[#888888] mt-1">Awaiting atelier approval</p>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              REVERSE PICKUP IN TRANSIT
            </span>
            <div className="text-2xl font-bold text-[#3F3F8F] font-mono">{approvedCount}</div>
            <p className="text-[11px] text-[#888888] mt-1">Scheduled with India Post reverse parcel</p>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              RESOLVED EXCHANGES
            </span>
            <div className="text-2xl font-bold text-emerald-700 font-mono">{completedCount}</div>
            <p className="text-[11px] text-[#888888] mt-1">Replacements shipped & closed</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 border border-[#E7E7E7] rounded-[4px] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-[4px] border border-[#E7E7E7]">
            {['all', 'requested', 'approved', 'item_received', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold uppercase transition-colors ${
                  activeTab === tab ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
                }`}
              >
                {tab === 'all' ? 'All Tickets' : tab === 'requested' ? 'Pending' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search by order # or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Order Ref & Client</th>
                  <th className="p-4">Request Type</th>
                  <th className="p-4">Garment & Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FAFAFA]">
                    <td className="p-4">
                      <Link to={`/admin/orders/${t.order_number}`} className="font-mono font-bold text-[#3F3F8F] hover:underline block">
                        {t.order_number}
                      </Link>
                      <div className="font-semibold text-black mt-0.5">{t.customer_name}</div>
                      <div className="text-[10px] text-[#888888]">{t.customer_email}</div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.return_type === 'exchange' ? 'bg-[#EEEEF8] text-[#3F3F8F]' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {t.return_type === 'exchange' ? 'Size Exchange' : 'Return for Refund'}
                      </span>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="font-semibold text-black">{t.product_title}</div>
                      <div className="text-[11px] text-[#666666]">{t.variant_info}</div>
                      <div className="text-[10px] text-black font-medium mt-1">Reason: {t.reason}</div>
                      {t.customer_description && (
                        <p className="text-[10px] text-[#888888] italic mt-0.5 line-clamp-2">
                          "{t.customer_description}"
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-[2px] ${
                        t.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'approved'
                          ? 'bg-[#EEEEF8] text-[#3F3F8F]'
                          : t.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      {t.status === 'requested' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(t.id, 'approved')}
                            className="text-[10px] py-1 px-2.5"
                          >
                            APPROVE PICKUP
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateStatus(t.id, 'rejected')}
                            className="text-[10px] py-1 px-2.5 text-red-600 hover:text-red-700"
                          >
                            REJECT
                          </Button>
                        </>
                      )}

                      {t.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(t.id, 'item_received')}
                          className="text-[10px] py-1 px-2.5"
                        >
                          MARK RECEIVED
                        </Button>
                      )}

                      {t.status === 'item_received' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(t.id, 'completed')}
                          className="text-[10px] py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800"
                        >
                          COMPLETE & DISPATCH
                        </Button>
                      )}

                      {t.status === 'completed' && (
                        <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      )}
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
