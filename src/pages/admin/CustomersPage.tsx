import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatPrice } from '../../utils/formatters';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalOrders: number;
  lifetimeValue: number;
  isVip: boolean;
  lastOrderDate: string;
}

import { api } from '../../services/api';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'vip'>('all');

  const loadCustomers = async () => {
    try {
      const live = await api.getCustomers();
      setCustomers(live || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleUpdate = () => {
      loadCustomers();
    };

    window.addEventListener('tanoah_orders_updated', handleUpdate);
    return () => {
      window.removeEventListener('tanoah_orders_updated', handleUpdate);
    };
  }, []);

  const filtered = customers.filter((c) => {
    const matchesTab = activeTab === 'all' || (activeTab === 'vip' && c.isVip);
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = 'ID,Name,Email,Phone,City,TotalOrders,LifetimeValue,IsVIP,LastOrderDate\n';
    const rows = customers
      .map(
        (c) =>
          `"${c.id}","${c.name}","${c.email}","${c.phone}","${c.city}",${c.totalOrders},${c.lifetimeValue},${c.isVip},"${c.lastOrderDate}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanoah_clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const totalRevenue = customers.reduce((sum, c) => sum + c.lifetimeValue, 0);
  const avgLtv = customers.length > 0 ? Math.round(totalRevenue / customers.length) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              CLIENTS & PRIVATE DIRECTORY
            </h1>
            <p className="text-[#666666] mt-0.5">
              Client purchasing profiles, lifetime value (LTV), repeat purchase velocity, and address books.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            EXPORT CLIENTS (CSV)
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              TOTAL REGISTERED CLIENTS
            </span>
            <div className="text-2xl font-bold text-black font-mono">{customers.length}</div>
            <p className="text-[11px] text-emerald-700 mt-1">100% Verified Buyer Rate</p>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              AVERAGE LIFETIME VALUE (LTV)
            </span>
            <div className="text-2xl font-bold text-[#3F3F8F] font-mono">{formatPrice(avgLtv)}</div>
            <p className="text-[11px] text-[#888888] mt-1">Per unique customer account</p>
          </div>

          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
              VIP PATRONS
            </span>
            <div className="text-2xl font-bold text-black font-mono">
              {customers.filter((c) => c.isVip).length}
            </div>
            <p className="text-[11px] text-[#888888] mt-1">LTV exceeding ₹10,000</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 border border-[#E7E7E7] rounded-[4px] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-[4px] border border-[#E7E7E7]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold uppercase transition-colors ${
                activeTab === 'all' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              All Clients ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold uppercase transition-colors ${
                activeTab === 'vip' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              VIP Patrons ({customers.filter((c) => c.isVip).length})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Client Name & Status</th>
                  <th className="p-4">Contact Coordinates</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Orders</th>
                  <th className="p-4 text-right">Lifetime Value (LTV)</th>
                  <th className="p-4 text-right">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#3F3F8F] border-t-transparent rounded-full animate-spin" />
                        <span>Loading customer profiles...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-500">
                      <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <div className="font-semibold text-black text-sm">No customers found</div>
                      <p className="text-neutral-400 text-xs mt-1">Verified customer profiles will appear here as orders are placed.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-black">{c.name}</span>
                        {c.isVip && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#EEEEF8] text-[#3F3F8F] px-1.5 py-0.5 rounded">
                            <Crown className="w-3 h-3" /> VIP
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-[#666666]">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-[#888888]" />
                        <span>{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-[#888888]" />
                        <span>{c.phone}</span>
                      </div>
                    </td>

                    <td className="p-4 text-[#666666]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#888888]" />
                        <span>{c.city}</span>
                      </div>
                    </td>

                    <td className="p-4 text-center font-semibold text-black font-mono">
                      {c.totalOrders}
                    </td>

                    <td className="p-4 text-right font-bold text-black font-mono">
                      {formatPrice(c.lifetimeValue)}
                    </td>

                    <td className="p-4 text-right text-[#888888] font-mono">
                      {new Date(c.lastOrderDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
