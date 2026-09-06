import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Plus,
  ShieldCheck,
  Zap,
  Layers,
  FileText,
  Trash2,
  Info,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/store/useUIStore';
import { api } from '@/services/api';
import { SEOAuditSummary, SEO404Log } from '@/types/seo';

export const SeoDashboardPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [report, setReport] = useState<SEOAuditSummary | null>(null);
  const [logs404, setLogs404] = useState<SEO404Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 404 Redirect Modal
  const [active404Modal, setActive404Modal] = useState<SEO404Log | null>(null);
  const [redirectDestination, setRedirectDestination] = useState('');
  const [redirectReason, setRedirectReason] = useState('Resolving 404 broken link');
  const [isCreatingRedirect, setIsCreatingRedirect] = useState(false);

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const [auditData, logsData] = await Promise.all([
        api.getSeoAuditReport(),
        api.getSeo404Logs(),
      ]);
      setReport(auditData);
      setLogs404(logsData);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Audit Error',
        description: err.message || 'Could not load SEO diagnostic report.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const handleOpenRedirectModal = (log: SEO404Log) => {
    setActive404Modal(log);
    setRedirectDestination('/collections/all');
    setRedirectReason(`Resolving 404 for ${log.url}`);
  };

  const handleCreateRedirectFrom404 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active404Modal || !redirectDestination.trim()) return;

    setIsCreatingRedirect(true);
    try {
      const success = await api.saveSeoRedirect({
        from_url: active404Modal.url,
        to_url: redirectDestination.trim(),
        status_code: 301,
        reason: redirectReason.trim(),
        created_by: 'admin_404_resolver',
        is_active: true,
      });

      if (success) {
        await api.resolve404Log(active404Modal.id);
        addToast({
          type: 'success',
          title: '301 Redirect Active',
          description: `${active404Modal.url} now permanently redirects to ${redirectDestination}.`,
        });
        setActive404Modal(null);
        fetchAudit();
      } else {
        throw new Error('Could not save 301 redirect');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        description: err.message || 'Failed to create redirect.',
      });
    } finally {
      setIsCreatingRedirect(false);
    }
  };

  const handleDelete404Log = async (id: string) => {
    const success = await api.delete404Log(id);
    if (success) {
      setLogs404((prev) => prev.filter((l) => l.id !== id));
      addToast({ type: 'info', title: 'Log Dismissed', description: '404 record removed.' });
    }
  };

  const score = report?.score ?? 85;
  const scoreColor =
    score >= 90
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : score >= 70
      ? 'text-[#3F3F8F] bg-[#EEEEF8] border-[#3F3F8F]/20'
      : 'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins max-w-6xl pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-[#E7E7E7] gap-3">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              TECHNICAL SEO &amp; HEALTH AUDIT
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Automated crawling diagnostics, Schema.org validation, and 404 traffic recovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/seo/redirects"
              className="px-3 py-2 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold uppercase tracking-wider text-[#3F3F8F] hover:bg-[#3F3F8F]/5 flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>301 Redirects Manager</span>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchAudit}
              isLoading={isLoading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              RUN AUDIT
            </Button>
          </div>
        </div>

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SEO Health Score */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#888888] uppercase tracking-wider font-semibold block">
                Catalog SEO Health Score
              </span>
              <div className="text-2xl font-bold text-black mt-1 font-mono">{score} / 100</div>
              <span className="text-[11px] text-[#666666] mt-0.5 block">
                {score >= 90 ? 'Excellent' : score >= 75 ? 'Good standing' : 'Needs attention'}
              </span>
            </div>
            <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-bold text-lg ${scoreColor}`}>
              {score}%
            </div>
          </div>

          {/* Active 301 Redirects */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-semibold block">
              Active 301 Redirects
            </span>
            <div className="text-2xl font-bold text-black mt-1 font-mono">
              {report?.activeRedirects ?? 0}
            </div>
            <span className="text-[11px] text-[#137333] mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Protecting Backlinks
            </span>
          </div>

          {/* Missing Meta Descriptions */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-semibold block">
              Short / Default Descriptions
            </span>
            <div className="text-2xl font-bold text-black mt-1 font-mono">
              {report?.missingMetaDescriptions ?? 0}
            </div>
            <span className="text-[11px] text-[#888888] mt-0.5 block">
              Auto-fallbacks active
            </span>
          </div>

          {/* Unresolved 404 Logs */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider font-semibold block">
              Unresolved 404 Broken Paths
            </span>
            <div className="text-2xl font-bold text-black mt-1 font-mono">
              {report?.unresolved404s ?? 0}
            </div>
            <span className="text-[11px] text-amber-600 mt-0.5 block">
              Salvageable traffic
            </span>
          </div>
        </div>

        {/* 404 Error Monitor & Converter */}
        <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E7E7E7] flex justify-between items-center">
            <div>
              <h2 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>404 ERROR DETECTOR &amp; 1-CLICK REDIRECT CONVERTER</span>
              </h2>
              <p className="text-[11px] text-[#666666] mt-0.5">
                Real-time log of broken URLs hit by visitors and search bots. Convert high-hit 404s into 301 redirects to recover lost traffic.
              </p>
            </div>
          </div>

          {logs404.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Zero broken 404 paths recorded. Your site links are clean and healthy!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[10px] uppercase font-semibold text-[#666666] border-b border-[#E7E7E7]">
                  <tr>
                    <th className="py-3 px-4">Requested Broken URL</th>
                    <th className="py-3 px-4">Hits</th>
                    <th className="py-3 px-4">Last Occurred</th>
                    <th className="py-3 px-4">Referrer</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {logs404.map((log) => {
                    const isResolved = Boolean(log.resolved_to_redirect_id);
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-black">
                          {log.url}
                          {isResolved && (
                            <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-sans">
                              Redirect Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                          {log.hits}
                        </td>
                        <td className="py-3 px-4 text-[#666666]">
                          {new Date(log.last_occurred_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 text-[#888888] truncate max-w-xs">
                          {log.referrer || 'Direct / Bookmark'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {!isResolved ? (
                            <button
                              onClick={() => handleOpenRedirectModal(log)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#3F3F8F] bg-[#EEEEF8] hover:bg-[#3F3F8F] hover:text-white rounded-[2px] transition-colors"
                            >
                              Create 301 Redirect
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDelete404Log(log.id)}
                            className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Delete log entry"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actionable SEO Diagnostic Checklist */}
        <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E7E7E7]">
            <h2 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3F3F8F]" />
              <span>ACTIONABLE SEO AUDIT CHECKLIST</span>
            </h2>
            <p className="text-[11px] text-[#666666] mt-0.5">
              Identified improvements to maximize organic Google and Google Shopping rankings.
            </p>
          </div>

          {report?.issues.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All SEO standards met. Zero critical diagnostics found.
            </div>
          ) : (
            <div className="divide-y divide-[#E7E7E7]">
              {report?.issues.map((issue) => (
                <div key={issue.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {issue.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-[#3F3F8F] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className="text-xs font-semibold text-black">{issue.title}</h3>
                      <p className="text-[11px] text-[#666666] mt-0.5">{issue.description}</p>
                    </div>
                  </div>

                  {issue.fix_url && (
                    <Link
                      to={issue.fix_url}
                      className="px-3 py-1 text-[11px] font-semibold text-black border border-[#E7E7E7] hover:border-black rounded-[2px] shrink-0 uppercase tracking-wider"
                    >
                      {issue.fix_label || 'Fix'}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Convert 404 to 301 Redirect Modal */}
      {active404Modal && (
        <Modal
          isOpen={true}
          onClose={() => setActive404Modal(null)}
          title="Create 301 Redirect for Broken Link"
        >
          <form onSubmit={handleCreateRedirectFrom404} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Requested URL (404 Path)
              </label>
              <input
                type="text"
                disabled
                value={active404Modal.url}
                className="w-full p-2.5 bg-neutral-100 border border-[#E7E7E7] rounded-[4px] font-mono text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Destination URL (Permanent 301 Target) *
              </label>
              <input
                type="text"
                required
                value={redirectDestination}
                onChange={(e) => setRedirectDestination(e.target.value)}
                placeholder="/collections/all or /products/new-handle"
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
              />
              <span className="text-[10px] text-[#888888] mt-1 block">
                Relative path (e.g. <code className="font-mono">/collections/all</code>) or full URL.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Redirect Reason / Note
              </label>
              <input
                type="text"
                value={redirectReason}
                onChange={(e) => setRedirectReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]">
              <Button variant="outline" size="sm" type="button" onClick={() => setActive404Modal(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isCreatingRedirect}>
                Activate 301 Redirect
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};
