import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/store/useUIStore';
import { api } from '@/services/api';
import { SEORedirect } from '@/types/seo';

export const SeoRedirectsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [searchParams] = useSearchParams();
  const initialFrom = searchParams.get('from') || '';

  const [redirects, setRedirects] = useState<SEORedirect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialFrom));
  const [editingRedirect, setEditingRedirect] = useState<SEORedirect | null>(null);
  const [fromUrl, setFromUrl] = useState(initialFrom);
  const [toUrl, setToUrl] = useState('');
  const [statusCode, setStatusCode] = useState<number>(301);
  const [reason, setReason] = useState('Manual admin redirect');
  const [isSaving, setIsSaving] = useState(false);

  const fetchRedirects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSeoRedirects();
      setRedirects(data || []);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'Could not load SEO redirects.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRedirects();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRedirect(null);
    setFromUrl('');
    setToUrl('');
    setStatusCode(301);
    setReason('Manual admin redirect');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (redir: SEORedirect) => {
    setEditingRedirect(redir);
    setFromUrl(redir.from_url);
    setToUrl(redir.to_url);
    setStatusCode(redir.status_code || 301);
    setReason(redir.reason || '');
    setIsModalOpen(true);
  };

  const handleSaveRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUrl.trim() || !toUrl.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Both URLs are required.' });
      return;
    }

    setIsSaving(true);
    try {
      const success = await api.saveSeoRedirect({
        id: editingRedirect?.id,
        from_url: fromUrl.trim(),
        to_url: toUrl.trim(),
        status_code: statusCode,
        reason: reason.trim(),
        is_active: true,
      });

      if (success) {
        addToast({
          type: 'success',
          title: editingRedirect ? 'Redirect Updated' : 'Redirect Created',
          description: `${fromUrl} now redirects to ${toUrl} (HTTP ${statusCode}).`,
        });
        setIsModalOpen(false);
        fetchRedirects();
      } else {
        throw new Error('Failed to save redirect.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save redirect.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (redir: SEORedirect) => {
    const updatedStatus = !redir.is_active;
    const success = await api.saveSeoRedirect({
      ...redir,
      is_active: updatedStatus,
    });

    if (success) {
      setRedirects((prev) =>
        prev.map((r) => (r.id === redir.id ? { ...r, is_active: updatedStatus } : r))
      );
      addToast({
        type: 'info',
        title: updatedStatus ? 'Redirect Activated' : 'Redirect Paused',
        description: `${redir.from_url} is now ${updatedStatus ? 'active' : 'inactive'}.`,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this redirect?')) return;
    const success = await api.deleteSeoRedirect(id);
    if (success) {
      setRedirects((prev) => prev.filter((r) => r.id !== id));
      addToast({ type: 'success', title: 'Deleted', description: 'Redirect permanently removed.' });
    }
  };

  const filteredRedirects = redirects.filter(
    (r) =>
      r.from_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.to_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins max-w-6xl pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-[#E7E7E7] gap-3">
          <div className="space-y-1">
            <Link
              to="/admin/seo"
              className="inline-flex items-center gap-1 text-xs text-[#666666] hover:text-black mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to SEO Diagnostics</span>
            </Link>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              301 PERMANENT REDIRECTS MANAGER
            </h1>
            <p className="text-xs text-[#666666]">
              Protect SEO rankings, inbound referral links, and eliminate 404 dead-ends across TANOAH.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchRedirects}
              isLoading={isLoading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              REFRESH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              ADD REDIRECT
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-[4px] border border-[#E7E7E7] shadow-sm">
          <Search className="w-4 h-4 text-[#888888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search redirects by source path, destination URL, or reason..."
            className="w-full text-xs focus:outline-none bg-transparent"
          />
        </div>

        {/* Redirects Table */}
        <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#888888]">Loading redirects...</div>
          ) : filteredRedirects.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#888888] space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#3F3F8F] mx-auto" />
              <p>No redirects found matching your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[10px] uppercase font-semibold text-[#666666] border-b border-[#E7E7E7]">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">From Path</th>
                    <th className="py-3 px-4">To Destination</th>
                    <th className="py-3 px-4">Hits</th>
                    <th className="py-3 px-4">Reason / Creator</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {filteredRedirects.map((redir) => (
                    <tr key={redir.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(redir)}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors ${
                            redir.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                          }`}
                        >
                          {redir.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-black">
                        {redir.from_url}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#3F3F8F] flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-[#888888] shrink-0" />
                        <span className="truncate max-w-xs">{redir.to_url}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-700">
                        {redir.hits}
                      </td>
                      <td className="py-3 px-4 text-[#666666]">
                        <div className="text-black font-medium">{redir.reason || 'General redirect'}</div>
                        <div className="text-[10px] text-[#888888]">by {redir.created_by}</div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(redir)}
                          className="p-1 text-[#666666] hover:text-[#3F3F8F] transition-colors"
                          title="Edit Redirect"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(redir.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Redirect"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Redirect Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingRedirect ? 'Edit Redirect Rule' : 'Create 301 Permanent Redirect'}
        >
          <form onSubmit={handleSaveRedirect} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                From URL Path (Source) *
              </label>
              <input
                type="text"
                required
                value={fromUrl}
                onChange={(e) => setFromUrl(e.target.value)}
                placeholder="/products/old-garment-slug"
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
              <span className="text-[10px] text-[#888888] mt-1 block">
                Relative path beginning with a slash (e.g. <code className="font-mono">/products/old-handle</code>).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                To Destination URL (Target) *
              </label>
              <input
                type="text"
                required
                value={toUrl}
                onChange={(e) => setToUrl(e.target.value)}
                placeholder="/products/new-garment-slug or /collections/all"
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  HTTP Status Code
                </label>
                <select
                  value={statusCode}
                  onChange={(e) => setStatusCode(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                >
                  <option value={301}>301 - Permanent (Recommended for SEO)</option>
                  <option value={302}>302 - Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Product renamed, seasonal collection merged"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSaving}>
                {editingRedirect ? 'Update Redirect' : 'Activate Redirect'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};
