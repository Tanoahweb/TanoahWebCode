import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Edit2,
  ExternalLink,
  Layers,
  X,
  PanelBottom,
  Truck,
  RotateCcw,
  ShieldCheck,
  Award,
  ArrowRight as ArrowRightIcon,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { FooterMenuColumn, FooterMenuItem, FooterSubLink } from '../../types/navigation';
import { Collection } from '../../types';

interface FooterNavigationEditorProps {
  draftFooterColumns: FooterMenuColumn[];
  setDraftFooterColumns: React.Dispatch<React.SetStateAction<FooterMenuColumn[]>>;
  draftBottomLinks: FooterSubLink[];
  setDraftBottomLinks: React.Dispatch<React.SetStateAction<FooterSubLink[]>>;
  availableCollections: Collection[];
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

const STORE_PRESET_PAGES = [
  { label: 'All Collections', url: '/collections/all' },
  { label: 'New Arrivals SS26', url: '/collections/new-arrivals' },
  { label: "Men's Apparel", url: '/collections/men' },
  { label: "Women's Apparel", url: '/collections/women' },
  { label: 'Best Sellers', url: '/collections/best-sellers' },
  { label: 'Sale & Archives', url: '/collections/sale' },
  { label: 'Editorial Lookbook', url: '/lookbook' },
  { label: 'Editorial Journal / Blog', url: '/blog' },
  { label: 'Track Your Order', url: '/tracking' },
  { label: 'Contact Customer Care', url: '/pages/contact' },
  { label: 'About TANOAH', url: '/pages/about' },
  { label: 'Fit & Size Guide', url: '/pages/size-guide' },
  { label: 'Shipping Policy', url: '/pages/shipping-policy' },
  { label: 'Refund Policy', url: '/pages/refund-policy' },
  { label: 'Privacy Policy', url: '/pages/privacy-policy' },
  { label: 'Terms & Conditions', url: '/pages/terms' },
  { label: 'Frequently Asked Questions', url: '/pages/faq' },
  { label: 'Store Locator', url: '/pages/store-locator' },
  { label: 'Accessibility Statement', url: '/pages/accessibility' },
  { label: 'XML Sitemap', url: '/sitemap.xml', open_in_new_tab: true },
];

export const FooterNavigationEditor: React.FC<FooterNavigationEditorProps> = ({
  draftFooterColumns,
  setDraftFooterColumns,
  draftBottomLinks,
  setDraftBottomLinks,
  availableCollections,
  onSave,
  isSaving,
}) => {
  const { addToast } = useUIStore();

  // Column Modal State
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<FooterMenuColumn | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [colIsActive, setColIsActive] = useState(true);

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [targetColId, setTargetColId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<FooterMenuItem | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIsOpenInNewTab, setLinkIsOpenInNewTab] = useState(false);
  const [linkIsActive, setLinkIsActive] = useState(true);

  // Bottom Sub-Link Modal State
  const [isBottomModalOpen, setIsBottomModalOpen] = useState(false);
  const [editingBottomLink, setEditingBottomLink] = useState<FooterSubLink | null>(null);
  const [bottomLabel, setBottomLabel] = useState('');
  const [bottomUrl, setBottomUrl] = useState('');
  const [bottomIsOpenInNewTab, setBottomIsOpenInNewTab] = useState(false);
  const [bottomIsActive, setBottomIsActive] = useState(true);

  // ================= COLUMN HANDLERS =================
  const handleOpenAddCol = () => {
    setEditingCol(null);
    setColTitle('');
    setColIsActive(true);
    setIsColModalOpen(true);
  };

  const handleOpenEditCol = (col: FooterMenuColumn) => {
    setEditingCol(col);
    setColTitle(col.title);
    setColIsActive(col.is_active !== false);
    setIsColModalOpen(true);
  };

  const handleSaveColModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Column title is required.' });
      return;
    }

    if (editingCol) {
      setDraftFooterColumns((prev) =>
        prev.map((c) =>
          c.id === editingCol.id
            ? { ...c, title: colTitle.trim().toUpperCase(), is_active: colIsActive }
            : c
        )
      );
      addToast({
        type: 'success',
        title: 'Column Updated',
        description: `Column "${colTitle.trim().toUpperCase()}" has been updated.`,
      });
    } else {
      const newCol: FooterMenuColumn = {
        id: `foot_col_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: colTitle.trim().toUpperCase(),
        sort_order: draftFooterColumns.length,
        is_active: colIsActive,
        links: [],
      };
      setDraftFooterColumns((prev) => [...prev, newCol]);
      addToast({
        type: 'success',
        title: 'Column Created',
        description: `Added new footer column "${newCol.title}".`,
      });
    }
    setIsColModalOpen(false);
  };

  const handleDeleteCol = (colId: string) => {
    const col = draftFooterColumns.find((c) => c.id === colId);
    if (!col) return;
    setDraftFooterColumns((prev) =>
      prev.filter((c) => c.id !== colId).map((c, idx) => ({ ...c, sort_order: idx }))
    );
    addToast({
      type: 'info',
      title: 'Column Removed',
      description: `Removed column "${col.title}".`,
    });
  };

  const handleMoveCol = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftFooterColumns.length) return;
    const updated = [...draftFooterColumns];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setDraftFooterColumns(updated.map((c, idx) => ({ ...c, sort_order: idx })));
  };

  const handleToggleColActive = (colId: string) => {
    setDraftFooterColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, is_active: !c.is_active } : c))
    );
  };

  // ================= LINK HANDLERS =================
  const handleOpenAddLink = (colId: string) => {
    setTargetColId(colId);
    setEditingLink(null);
    setLinkLabel('');
    setLinkUrl('/');
    setLinkIsOpenInNewTab(false);
    setLinkIsActive(true);
    setIsLinkModalOpen(true);
  };

  const handleOpenEditLink = (colId: string, link: FooterMenuItem) => {
    setTargetColId(colId);
    setEditingLink(link);
    setLinkLabel(link.label);
    setLinkUrl(link.url);
    setLinkIsOpenInNewTab(!!link.open_in_new_tab);
    setLinkIsActive(link.is_active !== false);
    setIsLinkModalOpen(true);
  };

  const handleSaveLinkModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetColId) return;
    if (!linkLabel.trim() || !linkUrl.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Label and URL are required.' });
      return;
    }

    if (editingLink) {
      setDraftFooterColumns((prev) =>
        prev.map((col) => {
          if (col.id !== targetColId) return col;
          return {
            ...col,
            links: col.links.map((lnk) =>
              lnk.id === editingLink.id
                ? {
                    ...lnk,
                    label: linkLabel.trim(),
                    url: linkUrl.trim(),
                    open_in_new_tab: linkIsOpenInNewTab,
                    is_active: linkIsActive,
                  }
                : lnk
            ),
          };
        })
      );
      addToast({
        type: 'success',
        title: 'Link Updated',
        description: `Updated link "${linkLabel.trim()}".`,
      });
    } else {
      const targetCol = draftFooterColumns.find((c) => c.id === targetColId);
      const newLink: FooterMenuItem = {
        id: `fl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        label: linkLabel.trim(),
        url: linkUrl.trim(),
        open_in_new_tab: linkIsOpenInNewTab,
        is_active: linkIsActive,
        sort_order: targetCol ? targetCol.links.length : 0,
      };
      setDraftFooterColumns((prev) =>
        prev.map((col) =>
          col.id === targetColId ? { ...col, links: [...col.links, newLink] } : col
        )
      );
      addToast({
        type: 'success',
        title: 'Link Added',
        description: `Added "${newLink.label}".`,
      });
    }
    setIsLinkModalOpen(false);
  };

  const handleDeleteLink = (colId: string, linkId: string) => {
    setDraftFooterColumns((prev) =>
      prev.map((col) => {
        if (col.id !== colId) return col;
        return {
          ...col,
          links: col.links.filter((l) => l.id !== linkId).map((l, idx) => ({ ...l, sort_order: idx })),
        };
      })
    );
    addToast({ type: 'info', title: 'Link Removed', description: 'Menu item removed from column.' });
  };

  const handleMoveLink = (colId: string, index: number, direction: 'up' | 'down') => {
    const col = draftFooterColumns.find((c) => c.id === colId);
    if (!col) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= col.links.length) return;
    const updatedLinks = [...col.links];
    const [moved] = updatedLinks.splice(index, 1);
    updatedLinks.splice(targetIdx, 0, moved);
    setDraftFooterColumns((prev) =>
      prev.map((c) =>
        c.id === colId ? { ...c, links: updatedLinks.map((l, idx) => ({ ...l, sort_order: idx })) } : c
      )
    );
  };

  const handleToggleLinkActive = (colId: string, linkId: string) => {
    setDraftFooterColumns((prev) =>
      prev.map((c) => {
        if (c.id !== colId) return c;
        return {
          ...c,
          links: c.links.map((l) => (l.id === linkId ? { ...l, is_active: !l.is_active } : l)),
        };
      })
    );
  };

  // ================= BOTTOM LINKS HANDLERS =================
  const handleOpenAddBottom = () => {
    setEditingBottomLink(null);
    setBottomLabel('');
    setBottomUrl('/pages/');
    setBottomIsOpenInNewTab(false);
    setBottomIsActive(true);
    setIsBottomModalOpen(true);
  };

  const handleOpenEditBottom = (link: FooterSubLink) => {
    setEditingBottomLink(link);
    setBottomLabel(link.label);
    setBottomUrl(link.url);
    setBottomIsOpenInNewTab(!!link.open_in_new_tab);
    setBottomIsActive(link.is_active !== false);
    setIsBottomModalOpen(true);
  };

  const handleSaveBottomModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomLabel.trim() || !bottomUrl.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Label and URL are required.' });
      return;
    }

    if (editingBottomLink) {
      setDraftBottomLinks((prev) =>
        prev.map((l) =>
          l.id === editingBottomLink.id
            ? {
                ...l,
                label: bottomLabel.trim().toUpperCase(),
                url: bottomUrl.trim(),
                open_in_new_tab: bottomIsOpenInNewTab,
                is_active: bottomIsActive,
              }
            : l
        )
      );
      addToast({
        type: 'success',
        title: 'Bottom Link Updated',
        description: `Updated "${bottomLabel.trim().toUpperCase()}".`,
      });
    } else {
      const newLink: FooterSubLink = {
        id: `fbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        label: bottomLabel.trim().toUpperCase(),
        url: bottomUrl.trim(),
        open_in_new_tab: bottomIsOpenInNewTab,
        is_active: bottomIsActive,
        sort_order: draftBottomLinks.length,
      };
      setDraftBottomLinks((prev) => [...prev, newLink]);
      addToast({
        type: 'success',
        title: 'Bottom Link Added',
        description: `Added "${newLink.label}".`,
      });
    }
    setIsBottomModalOpen(false);
  };

  const handleDeleteBottom = (linkId: string) => {
    setDraftBottomLinks((prev) =>
      prev.filter((l) => l.id !== linkId).map((l, idx) => ({ ...l, sort_order: idx }))
    );
    addToast({ type: 'info', title: 'Link Removed', description: 'Sub-footer link removed.' });
  };

  const handleMoveBottom = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftBottomLinks.length) return;
    const updated = [...draftBottomLinks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setDraftBottomLinks(updated.map((l, idx) => ({ ...l, sort_order: idx })));
  };

  const handleToggleBottomActive = (linkId: string) => {
    setDraftBottomLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, is_active: !l.is_active } : l))
    );
  };

  // Preview active columns and bottom links
  const activePreviewCols = draftFooterColumns.filter((c) => c.is_active);
  const activePreviewBottomLinks = draftBottomLinks.filter((l) => l.is_active);
  const targetCol = draftFooterColumns.find((c) => c.id === targetColId);

  return (
    <div className="space-y-8 font-poppins text-xs">
      {/* 1. Interactive Live Footer Preview */}
      <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#3F3F8F]" />
            <span className="font-semibold text-black uppercase tracking-wider text-[11px]">
              Live Storefront Footer Preview (Customer-Facing Appearance)
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            LIVE SYNCED &bull; {activePreviewCols.length} ACTIVE COLUMNS
          </span>
        </div>

        {/* The Live Footer Replica */}
        <div className="bg-[#3F3F8F] text-white p-6 sm:p-8 select-none">
          {/* Trust Badges Banner */}
          <div className="border-b border-white/10 pb-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-white/10 text-white shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-[10px] font-semibold uppercase tracking-wider">COMPLIMENTARY SHIPPING</h6>
                <p className="text-[9px] text-white/70">On all domestic orders over ₹1,999</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-white/10 text-white shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-[10px] font-semibold uppercase tracking-wider">QUALITY GUARANTEE</h6>
                <p className="text-[9px] text-white/70">Transit damage covered · 24h verification</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-white/10 text-white shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-[10px] font-semibold uppercase tracking-wider">SECURE PAYMENTS</h6>
                <p className="text-[9px] text-white/70">UPI, Cards, NetBanking SSL</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-white/10 text-white shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-[10px] font-semibold uppercase tracking-wider">100% AUTHENTIC</h6>
                <p className="text-[9px] text-white/70">Artisanal tailoring & premium fabrics</p>
              </div>
            </div>
          </div>

          {/* Main Footer Links Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Brand Story Column */}
            <div className="md:col-span-4 space-y-4">
              <img
                src="/Assets/brand/logo-white.png"
                alt="TANOAH"
                className="h-8 w-auto object-contain"
              />
              <p className="text-[11px] text-white/80 leading-relaxed max-w-xs">
                TANOAH embodies contemporary luxury fashion, marrying timeless tailoring with bold modern silhouettes.
              </p>
              <div className="pt-2">
                <div className="text-[10px] tracking-wider uppercase font-semibold text-white mb-1.5">
                  SUBSCRIBE TO TANOAH PRIVÉ
                </div>
                <div className="flex items-center border border-white/30 rounded-[4px] bg-white/5 max-w-xs overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] text-white/50 grow">Enter your email address</div>
                  <div className="px-3 py-1.5 bg-white text-[#3F3F8F]">
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Columns Preview */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {activePreviewCols.length === 0 ? (
                <div className="col-span-3 py-8 text-center text-white/60 border border-dashed border-white/20 rounded">
                  No active columns to display. Activate or create a column below.
                </div>
              ) : (
                activePreviewCols.map((col, idx) => {
                  const activeLinks = (col.links || []).filter((l) => l.is_active);
                  const isLastCol = idx === activePreviewCols.length - 1;

                  return (
                    <div key={col.id} className="space-y-3">
                      <h4 className="font-wondra text-sm tracking-wider text-white uppercase border-b border-white/10 pb-1.5 flex items-center justify-between">
                        <span>{col.title}</span>
                        <span className="text-[9px] font-mono text-white/50 font-normal">
                          {activeLinks.length} items
                        </span>
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-white/80">
                        {activeLinks.length === 0 ? (
                          <li className="text-white/40 italic text-[10px]">No visible links in column</li>
                        ) : (
                          activeLinks.map((link) => (
                            <li key={link.id} className="flex items-center gap-1.5 hover:text-white transition-colors">
                              <span>&bull;</span>
                              <span className="truncate">{link.label}</span>
                              {link.open_in_new_tab && (
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              )}
                            </li>
                          ))
                        )}
                      </ul>

                      {isLastCol && (
                        <div className="pt-3 border-t border-white/10 mt-4 text-[10px] text-white/70">
                          <span className="font-semibold text-white uppercase block mb-0.5">
                            CUSTOMER CARE DESK
                          </span>
                          <div>connectus.tanoah@gmail.com</div>
                          <div>+91 8714141849 (Mon–Sat 10am–7pm)</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Row Preview */}
          <div className="border-t border-white/10 mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-white/60 gap-3">
            <div>© {new Date().getFullYear()} TANOAH. ALL RIGHTS RESERVED.</div>
            <div className="flex flex-wrap items-center gap-4">
              {activePreviewBottomLinks.map((l) => (
                <span key={l.id} className="hover:text-white uppercase flex items-center gap-1">
                  {l.label}
                  {l.open_in_new_tab && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Columns Management Studio */}
      <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-[#E7E7E7] gap-3">
          <div>
            <h3 className="font-semibold text-black uppercase tracking-wider text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3F3F8F]" />
              <span>Footer Navigation Columns ({draftFooterColumns.length})</span>
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Customize column headings, order, visibility, and the curated link items within each column.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleOpenAddCol}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            ADD NEW COLUMN
          </Button>
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {draftFooterColumns.map((col, colIdx) => {
            const isColVisible = col.is_active !== false;

            return (
              <div
                key={col.id}
                className={`rounded-[6px] border transition-all flex flex-col justify-between ${
                  isColVisible
                    ? 'border-[#E7E7E7] bg-white shadow-xs'
                    : 'border-dashed border-neutral-300 bg-neutral-50/70'
                }`}
              >
                {/* Column Card Header */}
                <div className="p-4 border-b border-[#E7E7E7] bg-[#FAFAFA]/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={colIdx === 0}
                        onClick={() => handleMoveCol(colIdx, 'left')}
                        title="Move column left"
                        className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-neutral-100"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={colIdx === draftFooterColumns.length - 1}
                        onClick={() => handleMoveCol(colIdx, 'right')}
                        title="Move column right"
                        className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-neutral-100"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-black uppercase tracking-wider text-xs truncate">
                          {col.title}
                        </h4>
                        <span className="text-[10px] font-mono font-semibold text-[#3F3F8F] bg-[#EEEEF8] px-1.5 py-0.2 rounded">
                          {col.links?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleColActive(col.id)}
                      title={isColVisible ? 'Column is Visible. Click to hide.' : 'Column is Hidden. Click to show.'}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors border ${
                        isColVisible
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      {isColVisible ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-neutral-400" />
                          <span className="hidden sm:inline">Hidden</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCol(col)}
                      title="Edit Column Title"
                      className="p-1.5 text-neutral-400 hover:text-[#3F3F8F] hover:bg-white rounded border border-transparent hover:border-[#E7E7E7]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCol(col.id)}
                      title="Delete Column"
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Column Items List */}
                <div className="p-3 space-y-2 flex-grow min-h-[160px] max-h-[380px] overflow-y-auto">
                  {col.links && col.links.length > 0 ? (
                    col.links.map((link, linkIdx) => {
                      const isLinkVisible = link.is_active !== false;

                      return (
                        <div
                          key={link.id}
                          className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors ${
                            isLinkVisible
                              ? 'bg-white border-[#E7E7E7] hover:border-neutral-300'
                              : 'bg-neutral-50 border-dashed border-neutral-300 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={linkIdx === 0}
                                onClick={() => handleMoveLink(col.id, linkIdx, 'up')}
                                title="Move up"
                                className="text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                disabled={linkIdx === col.links.length - 1}
                                onClick={() => handleMoveLink(col.id, linkIdx, 'down')}
                                title="Move down"
                                className="text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-black text-xs truncate">
                                  {link.label}
                                </span>
                                {link.open_in_new_tab && (
                                  <span
                                    title="Opens in new tab"
                                    className="text-[9px] bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded font-mono flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#666666] font-mono truncate max-w-[200px]">
                                {link.url}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleLinkActive(col.id, link.id)}
                              title={isLinkVisible ? 'Active. Click to hide' : 'Hidden. Click to show'}
                              className={`p-1 rounded transition-colors ${
                                isLinkVisible
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-neutral-400 hover:bg-neutral-100'
                              }`}
                            >
                              {isLinkVisible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLink(col.id, link)}
                              title="Edit Link"
                              className="p-1 text-neutral-400 hover:text-[#3F3F8F] hover:bg-neutral-100 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(col.id, link.id)}
                              title="Remove Link"
                              className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-neutral-400 border border-dashed border-[#E7E7E7] rounded text-[11px]">
                      No links in this column yet.
                    </div>
                  )}
                </div>

                {/* Column Card Footer: Add Item Button */}
                <div className="p-3 border-t border-[#E7E7E7] bg-[#FAFAFA]/70">
                  <button
                    type="button"
                    onClick={() => handleOpenAddLink(col.id)}
                    className="w-full py-2 px-3 border border-dashed border-[#3F3F8F]/40 hover:border-[#3F3F8F] text-[#3F3F8F] font-semibold rounded text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-[#EEEEF8]/40"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD LINK TO {col.title}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Sub-Footer Bottom Legal Links */}
      <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#E7E7E7] gap-3">
          <div>
            <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
              <PanelBottom className="w-4 h-4 text-[#3F3F8F]" />
              <span>Sub-Footer Copyright &amp; Legal Links ({draftBottomLinks.length})</span>
            </h3>
            <p className="text-[11px] text-[#666666] mt-0.5">
              The horizontal legal and compliance links shown at the very bottom bar of your store (e.g. PRIVACY, TERMS, SHIPPING, SITEMAP).
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleOpenAddBottom}
            icon={<Plus className="w-3 h-3" />}
          >
            ADD SUB-LINK
          </Button>
        </div>

        {/* Sub-links row cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {draftBottomLinks.map((link, idx) => {
            const isVisible = link.is_active !== false;

            return (
              <div
                key={link.id}
                className={`p-3 rounded-[4px] border flex items-center justify-between gap-3 transition-colors ${
                  isVisible
                    ? 'bg-white border-[#E7E7E7] hover:border-neutral-300'
                    : 'bg-neutral-50 border-dashed border-neutral-300 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveBottom(idx, 'up')}
                      title="Move up"
                      className="text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draftBottomLinks.length - 1}
                      onClick={() => handleMoveBottom(idx, 'down')}
                      title="Move down"
                      className="text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-black text-xs uppercase tracking-wider truncate">
                        {link.label}
                      </span>
                      {link.open_in_new_tab && (
                        <span className="text-[8px] bg-neutral-100 text-neutral-600 px-1 rounded font-mono">
                          NEW TAB
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#666666] font-mono truncate">
                      {link.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleBottomActive(link.id)}
                    title={isVisible ? 'Visible. Click to hide' : 'Hidden. Click to show'}
                    className={`p-1 rounded transition-colors ${
                      isVisible
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-neutral-400 hover:bg-neutral-100'
                    }`}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditBottom(link)}
                    title="Edit Sub-Link"
                    className="p-1 text-neutral-400 hover:text-[#3F3F8F] hover:bg-neutral-100 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBottom(link.id)}
                    title="Remove Sub-Link"
                    className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Add / Edit Column Modal */}
      {isColModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 text-left space-y-4 font-poppins text-xs animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-bold text-black uppercase tracking-wider text-sm">
                {editingCol ? 'Edit Footer Column' : 'Add New Footer Column'}
              </h3>
              <button
                type="button"
                onClick={() => setIsColModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveColModal} className="space-y-4">
              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Column Title *
                </label>
                <input
                  type="text"
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="e.g. COLLECTIONS, CLIENT SERVICES, THE MAISON, HELP"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-bold uppercase focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              {/* Column Visibility */}
              <div className="p-3.5 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-black">
                    {colIsActive ? (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>Column Visibility</span>
                  </div>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    {colIsActive ? 'Visible in customer storefront footer.' : 'Temporarily hidden from storefront.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setColIsActive(!colIsActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors border ${
                    colIsActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {colIsActive ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsColModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingCol ? 'Update Column' : 'Create Column'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add / Edit Column Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 text-left space-y-4 font-poppins text-xs animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wider text-sm">
                  {editingLink ? 'Edit Footer Link' : 'Add Link to Column'}
                </h3>
                {targetCol && (
                  <p className="text-[10px] text-[#3F3F8F] font-semibold mt-0.5 uppercase">
                    Target Column: {targetCol.title}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLinkModal} className="space-y-4">
              {/* Preset Selector Dropdown */}
              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Quick Preset / Choose Page
                </label>
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const val = e.target.value;
                    const preset = STORE_PRESET_PAGES.find((p) => p.url === val);
                    if (preset) {
                      setLinkLabel(preset.label);
                      setLinkUrl(preset.url);
                      if (preset.open_in_new_tab) setLinkIsOpenInNewTab(true);
                      return;
                    }
                    const col = availableCollections.find((c) => c.slug === val);
                    if (col) {
                      setLinkLabel(col.title);
                      setLinkUrl(`/collections/${col.slug}`);
                    }
                  }}
                  defaultValue=""
                  className="w-full p-2.5 bg-neutral-50 border border-[#E7E7E7] rounded-[4px] text-xs text-neutral-700 focus:outline-none focus:border-[#3F3F8F] cursor-pointer"
                >
                  <option value="">-- Autofill from Common Store Pages or Collections --</option>
                  <optgroup label="Popular Store Pages">
                    {STORE_PRESET_PAGES.map((p) => (
                      <option key={p.url} value={p.url}>
                        {p.label} ({p.url})
                      </option>
                    ))}
                  </optgroup>
                  {availableCollections.length > 0 && (
                    <optgroup label="Store Collections">
                      {availableCollections.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.title} (/collections/{c.slug})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Link Label *
                </label>
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. Track Your Order, Editorial Lookbook"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Destination URL / Path *
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /tracking or /collections/men or https://..."
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#E7E7E7]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={linkIsOpenInNewTab}
                    onChange={(e) => setLinkIsOpenInNewTab(e.target.checked)}
                    className="w-4 h-4 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Open link in new browser tab (_blank)</span>
                </label>
              </div>

              {/* Link Visibility */}
              <div className="p-3.5 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-black">
                    {linkIsActive ? (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>Link Visibility</span>
                  </div>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    {linkIsActive ? 'Visible in column.' : 'Hidden from customers.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLinkIsActive(!linkIsActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors border ${
                    linkIsActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {linkIsActive ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsLinkModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingLink ? 'Update Link' : 'Add Link'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Sub-Footer Bottom Link Modal */}
      {isBottomModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 text-left space-y-4 font-poppins text-xs animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-bold text-black uppercase tracking-wider text-sm">
                {editingBottomLink ? 'Edit Sub-Footer Link' : 'Add Sub-Footer Link'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBottomModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBottomModal} className="space-y-4">
              {/* Preset Selector Dropdown */}
              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Preset Legal / Compliance Pages
                </label>
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const preset = STORE_PRESET_PAGES.find((p) => p.url === e.target.value);
                    if (preset) {
                      setBottomLabel(preset.label.toUpperCase());
                      setBottomUrl(preset.url);
                      if (preset.open_in_new_tab) setBottomIsOpenInNewTab(true);
                    }
                  }}
                  defaultValue=""
                  className="w-full p-2.5 bg-neutral-50 border border-[#E7E7E7] rounded-[4px] text-xs text-neutral-700 focus:outline-none focus:border-[#3F3F8F] cursor-pointer"
                >
                  <option value="">-- Choose from standard legal / policy pages --</option>
                  <option value="/pages/privacy-policy">PRIVACY POLICY (/pages/privacy-policy)</option>
                  <option value="/pages/terms">TERMS &amp; CONDITIONS (/pages/terms)</option>
                  <option value="/pages/shipping-policy">SHIPPING POLICY (/pages/shipping-policy)</option>
                  <option value="/pages/refund-policy">REFUND POLICY (/pages/refund-policy)</option>
                  <option value="/pages/accessibility">ACCESSIBILITY STATEMENT (/pages/accessibility)</option>
                  <option value="/sitemap.xml">XML SITEMAP (/sitemap.xml)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Link Label *
                </label>
                <input
                  type="text"
                  value={bottomLabel}
                  onChange={(e) => setBottomLabel(e.target.value)}
                  placeholder="e.g. PRIVACY, TERMS, SITEMAP"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-bold uppercase focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Destination URL / Path *
                </label>
                <input
                  type="text"
                  value={bottomUrl}
                  onChange={(e) => setBottomUrl(e.target.value)}
                  placeholder="e.g. /pages/privacy-policy"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#E7E7E7]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={bottomIsOpenInNewTab}
                    onChange={(e) => setBottomIsOpenInNewTab(e.target.checked)}
                    className="w-4 h-4 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Open link in new browser tab (_blank)</span>
                </label>
              </div>

              {/* Visibility */}
              <div className="p-3.5 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-black">
                    {bottomIsActive ? (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>Link Visibility</span>
                  </div>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    {bottomIsActive ? 'Visible on sub-footer bar.' : 'Hidden from sub-footer bar.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBottomIsActive(!bottomIsActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors border ${
                    bottomIsActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {bottomIsActive ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsBottomModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingBottomLink ? 'Update Sub-Link' : 'Add Sub-Link'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
