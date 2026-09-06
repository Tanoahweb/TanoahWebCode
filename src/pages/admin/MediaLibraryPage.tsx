import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Filter,
  HardDrive,
  AlertCircle,
  Sparkles,
  Layers,
  FileText,
  Info,
  RefreshCw,
  X,
  CheckSquare,
  CheckCircle2,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { MediaItem } from '../../types';
import { formatBytes, getTransformedImageUrl } from '../../utils/imageUtils';
import { ProductImage } from '../../components/common/ProductImage';

export const MediaLibraryPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in_use' | 'orphan'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'product' | 'banner' | 'brand'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedAsset, setSelectedAsset] = useState<MediaItem | null>(null);

  // Delete Confirmation Modal State
  const [assetToDelete, setAssetToDelete] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [forceBulkDelete, setForceBulkDelete] = useState(false);

  // Upload & Drag-and-Drop state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const items = await api.getMediaList();
      setMediaList(items);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Fetch Failed',
        description: err.message || 'Failed to load media assets.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleCopyUrl = (asset: MediaItem) => {
    const copyTarget = getTransformedImageUrl(asset.r2_key, { width: 1200, quality: 88 });
    navigator.clipboard.writeText(copyTarget);
    setCopiedId(asset.id);
    addToast({
      type: 'success',
      title: 'CDN URL Copied',
      description: `Optimized Cloudflare delivery URL for ${asset.original_filename} copied to clipboard.`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressMsg(`Optimizing & uploading ${i + 1}/${fileArray.length}: ${file.name}`);

      try {
        const result = await api.uploadMediaFile(file, {
          preserveOriginal: false,
          mediaType: selectedCategory !== 'all' ? selectedCategory : 'product',
        });
        successCount++;
        if (result.isDuplicate) {
          addToast({
            type: 'info',
            title: 'Deduplicated Asset',
            description: `${file.name} matched existing SHA-256 hash. Reused master WebP.`,
          });
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Upload Failed',
          description: `Could not process ${file.name}: ${err.message}`,
        });
      }
    }

    setIsUploading(false);
    setUploadProgressMsg('');
    await loadMedia();

    if (successCount > 0) {
      addToast({
        type: 'success',
        title: 'Assets Stored in R2',
        description: `${successCount} image(s) optimized & registered in media registry.`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const confirmDeleteMedia = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);

    try {
      const result = await api.deleteMedia(assetToDelete.id, assetToDelete.r2_key, false);

      if (!result.safeToDelete) {
        addToast({
          type: 'error',
          title: 'Reference Conflict',
          description: result.message,
        });
        setIsDeleting(false);
        setAssetToDelete(null);
        return;
      }

      addToast({
        type: 'info',
        title: 'Asset Deleted',
        description: `${assetToDelete.original_filename} safely removed from Cloudflare R2.`,
      });

      setMediaList((prev) => prev.filter((m) => m.id !== assetToDelete.id));
      if (selectedAsset?.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Error',
        description: err.message || 'Failed to delete asset.',
      });
    } finally {
      setIsDeleting(false);
      setAssetToDelete(null);
    }
  };

  const filteredMedia = mediaList.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.media_type === selectedCategory;
    const matchesSearch =
      (m.original_filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.stored_filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.r2_key || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'in_use' && !m.is_orphan && (m.product_reference_count ?? 1) > 0) ||
      (filterType === 'orphan' && (m.is_orphan || (m.product_reference_count ?? 0) === 0));

    return matchesCat && matchesSearch && matchesFilter;
  });

  const totalStorageBytes = mediaList.reduce((acc, m) => acc + (Number(m.file_size) || 0), 0);
  const orphanCount = mediaList.filter((m) => m.is_orphan || (m.product_reference_count ?? 0) === 0).length;

  // Multi-Selection Computations & Handlers
  const selectedAssets = useMemo(() => {
    return mediaList.filter((m) => selectedIds.has(m.id || m.r2_key));
  }, [mediaList, selectedIds]);

  const selectedBytes = useMemo(() => {
    return selectedAssets.reduce((sum, m) => sum + (Number(m.file_size) || 0), 0);
  }, [selectedAssets]);

  const inUseSelectedCount = useMemo(() => {
    return selectedAssets.filter((m) => !m.is_orphan && (m.product_reference_count ?? 0) > 0).length;
  }, [selectedAssets]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMedia.length && filteredMedia.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map((m) => m.id || m.r2_key)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const itemsToDelete = selectedAssets.map((m) => ({
        id: m.id,
        r2_key: m.r2_key,
      }));

      const result = await api.deleteBulkMedia(itemsToDelete, forceBulkDelete);
      if (result.failedCount > 0 && !forceBulkDelete) {
        addToast({
          type: 'info',
          title: 'Partial Bulk Delete',
          description: `${result.deletedCount} deleted. ${result.failedCount} asset(s) skipped because they are in active use.`,
        });
      } else {
        addToast({
          type: 'success',
          title: 'Bulk Delete Complete',
          description: `Successfully removed ${result.deletedCount} asset(s) from Cloudflare R2 and catalog.`,
        });
      }

      setSelectedIds(new Set());
      setIsBulkModalOpen(false);
      setForceBulkDelete(false);
      await loadMedia();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Bulk Deletion Failed',
        description: err.message || 'Failed to delete selected assets.',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              MEDIA & CLOUDFLARE R2 LIBRARY
            </h1>
            <p className="text-[#666666] mt-0.5">
              Single-master WebP storage, on-the-fly Cloudflare Transformations, and SHA-256 deduplication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={loadMedia}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              SYNC
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                disabled={isUploading}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#3F3F8F] hover:bg-[#343476] text-white font-semibold rounded-[4px] shadow-sm uppercase tracking-wider text-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'OPTIMIZING...' : 'UPLOAD TO R2'}</span>
              </div>
            </label>
          </div>
        </div>

        {/* Upload Status Banner */}
        {isUploading && (
          <div className="p-3 bg-[#EEEEF8] text-[#3F3F8F] border border-[#3F3F8F]/30 rounded-[4px] flex items-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
            <span className="font-semibold">{uploadProgressMsg}</span>
          </div>
        )}

        {/* Cloudflare R2 Bucket Live Status Bar */}
        <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-black">
                Bucket:{' '}
                <span className="font-mono text-[#3F3F8F]">tanoah-media</span>
              </div>
              <div className="text-[11px] text-[#666666]">
                Dynamic Edge CDN:{' '}
                <span className="font-mono text-neutral-800">https://images.tanoah.com</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#666666]">
            <span>
              <strong>{mediaList.length}</strong> Masters
            </span>
            <span>•</span>
            <span>
              <strong>{formatBytes(totalStorageBytes)}</strong> R2 Storage
            </span>
            <span>•</span>
            <span className={orphanCount > 0 ? 'text-amber-600 font-semibold' : 'text-neutral-500'}>
              {orphanCount} Unassigned
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              Live Pipeline
            </span>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => dropzoneInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[6px] p-8 text-center cursor-pointer transition-all duration-200 select-none ${
            isDragging
              ? 'border-[#3F3F8F] bg-[#EEEEF8]/60 scale-[0.99]'
              : 'border-[#E7E7E7] hover:border-[#3F3F8F] bg-white'
          }`}
        >
          <input
            ref={dropzoneInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#EEEEF8] text-[#3F3F8F] shadow-xs flex items-center justify-center border border-[#E7E7E7]">
              {isUploading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-black uppercase tracking-wider block">
                {isUploading ? uploadProgressMsg : 'Drag & Drop Images Directly Into Media Library'}
              </span>
              <p className="text-[11px] text-[#666666] mt-0.5">
                Drop individual or batch product photography anywhere here, or click to browse. In-browser WebP optimization & SHA-256 deduplication applied automatically.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-[10px] text-[#3F3F8F] font-medium">
              <Sparkles className="w-3 h-3 text-[#3F3F8F]" />
              <span>Lossless WebP Compression • Zero CLS Delivery • Cloudflare R2 Ready</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename, R2 key, or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Usage Filter */}
            <div className="flex rounded-[4px] border border-[#E7E7E7] overflow-hidden bg-white">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  filterType === 'all' ? 'bg-[#3F3F8F] text-white' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                All ({mediaList.length})
              </button>
              <button
                onClick={() => setFilterType('in_use')}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  filterType === 'in_use' ? 'bg-[#3F3F8F] text-white' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                In Use ({mediaList.length - orphanCount})
              </button>
              <button
                onClick={() => setFilterType('orphan')}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  filterType === 'orphan' ? 'bg-[#3F3F8F] text-white' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Unassigned ({orphanCount})
              </button>
            </div>

            {/* Selection Mode Toggle Button */}
            <Button
              variant={isSelectionMode || selectedIds.size > 0 ? 'primary' : 'outline'}
              size="sm"
              type="button"
              onClick={() => {
                if (isSelectionMode && selectedIds.size > 0) {
                  setSelectedIds(new Set());
                }
                setIsSelectionMode(!isSelectionMode);
              }}
              icon={<CheckSquare className="w-4 h-4" />}
            >
              {isSelectionMode || selectedIds.size > 0 ? 'EXIT SELECTION' : 'SELECT IMAGES'}
            </Button>
          </div>
        </div>

        {/* Sticky Multi-Select Action Bar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-4 z-30 bg-[#1A1A2E] text-white p-4 rounded-[6px] shadow-xl border border-[#3F3F8F]/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#3F3F8F] flex items-center justify-center text-white shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {selectedIds.size} image{selectedIds.size > 1 ? 's' : ''} selected
                  <span className="text-xs text-neutral-400 font-normal ml-2">
                    ({formatBytes(selectedBytes)} to reclaim)
                  </span>
                </div>
                <div className="text-[11px]">
                  {inUseSelectedCount > 0 ? (
                    <span className="text-amber-400 font-medium">
                      ⚠️ {inUseSelectedCount} selected image(s) currently linked to active products
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">
                      ✓ All selected images are safe to delete (unassigned)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded transition-colors font-medium"
              >
                {selectedIds.size === filteredMedia.length ? 'Deselect All' : 'Select All Filtered'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded transition-colors font-medium"
              >
                Clear
              </button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkModalOpen(true)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                DELETE SELECTED ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}

        {/* Media Grid */}
        {filteredMedia.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[4px] border border-[#E7E7E7] space-y-3">
            <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto" />
            <div className="font-semibold text-black">No Media Assets Found</div>
            <p className="text-[#666666] text-xs">
              Upload high-definition photos or try different search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMedia.map((asset) => {
              const assetKey = asset.id || asset.r2_key;
              const isSelected = selectedIds.has(assetKey);

              return (
                <div
                  key={assetKey}
                  onClick={() => {
                    if (isSelectionMode || selectedIds.size > 0) {
                      toggleSelect(assetKey);
                    } else {
                      setSelectedAsset(asset);
                    }
                  }}
                  className={`group relative rounded-[4px] overflow-hidden border bg-white shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3F3F8F] ring-2 ring-[#3F3F8F] bg-[#EEEEF8]/20'
                      : 'border-[#E7E7E7] hover:border-[#3F3F8F]'
                  }`}
                >
                  <div className="relative aspect-[4/5] bg-[#F8F8F8] overflow-hidden">
                    <ProductImage
                      src={asset.r2_key}
                      alt={asset.original_filename || 'image'}
                      preset="thumbnail"
                      aspectRatio="4/5"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      wrapperClassName="w-full h-full"
                    />

                    {/* Checkbox Selector */}
                    <div
                      className={`absolute top-2 left-2 z-20 transition-opacity ${
                        isSelectionMode || selectedIds.size > 0 || isSelected
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(assetKey);
                      }}
                    >
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer shadow-md ${
                          isSelected
                            ? 'bg-[#3F3F8F] text-white border-2 border-[#3F3F8F]'
                            : 'bg-white/90 hover:bg-white text-transparent border-2 border-neutral-400 hover:border-[#3F3F8F]'
                        }`}
                        title={isSelected ? 'Deselect image' : 'Select image'}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'text-white' : 'text-transparent'}`} />
                      </div>
                    </div>

                    {/* Usage Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      {(asset.product_reference_count ?? 1) > 0 && !asset.is_orphan ? (
                        <span className="bg-[#3F3F8F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          {asset.product_reference_count} Used
                        </span>
                      ) : (
                        <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Quick Action Overlay (bottom right) */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(asset);
                        }}
                        className="p-1.5 bg-white/95 hover:bg-white text-black rounded shadow"
                        title="Copy CDN Link"
                      >
                        {copiedId === assetKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetToDelete(asset);
                        }}
                        className="p-1.5 bg-white/95 hover:bg-white text-red-500 rounded shadow"
                        title="Safe Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-white border-t border-[#E7E7E7] space-y-0.5">
                    <div className="font-semibold text-black truncate" title={asset.original_filename}>
                      {asset.original_filename}
                    </div>
                    <div className="flex justify-between text-[10px] text-[#888888]">
                      <span>{formatBytes(asset.file_size || 0)}</span>
                      <span className="uppercase">{(asset.mime_type || 'image/webp').replace('image/', '')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Asset Details Modal */}
        {selectedAsset && (
          <Modal
            isOpen={Boolean(selectedAsset)}
            onClose={() => setSelectedAsset(null)}
            title="MEDIA ASSET METADATA"
          >
            <div className="space-y-4 text-xs font-poppins text-left">
              <div className="relative aspect-[4/5] max-h-72 w-full mx-auto rounded-[4px] overflow-hidden bg-[#F8F8F8] border border-[#E7E7E7]">
                <ProductImage
                  src={selectedAsset.r2_key}
                  alt={selectedAsset.original_filename}
                  preset="productMain"
                  aspectRatio="4/5"
                  className="w-full h-full object-contain"
                  wrapperClassName="w-full h-full"
                />
              </div>

              <div className="space-y-2 bg-[#FAFAFA] p-3 rounded-[4px] border border-[#E7E7E7]">
                <div className="flex justify-between">
                  <span className="text-[#888888]">Original Filename:</span>
                  <span className="font-semibold text-black">{selectedAsset.original_filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">R2 Key:</span>
                  <span className="font-mono text-[#3F3F8F] text-[11px] truncate max-w-[240px]">
                    {selectedAsset.r2_key}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Master Dimensions:</span>
                  <span className="font-semibold text-black">
                    {selectedAsset.width || 2400} × {selectedAsset.height || 3000} (4:5 Portrait)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Optimized Master Size:</span>
                  <span className="font-semibold text-black">{formatBytes(selectedAsset.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">SHA-256 Content Hash:</span>
                  <span className="font-mono text-[10px] text-[#666666] truncate max-w-[200px]">
                    {selectedAsset.file_hash}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Active Product References:</span>
                  <span className="font-bold text-[#3F3F8F]">
                    {selectedAsset.product_reference_count || 0} product(s)
                  </span>
                </div>
              </div>

              {/* Dynamic CDN URL Options */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-black uppercase tracking-wider text-[11px]">
                  Cloudflare Image Transformation Delivery Links
                </span>
                <div className="space-y-1">
                  {[
                    { label: 'Thumbnail (150px)', w: 150, q: 80 },
                    { label: 'Product Card (480px)', w: 480, q: 85 },
                    { label: 'PDP Main (1200px)', w: 1200, q: 88 },
                    { label: 'PDP HD Zoom (2400px)', w: 2400, q: 90 },
                  ].map((preset) => {
                    const url = getTransformedImageUrl(selectedAsset.r2_key, {
                      width: preset.w,
                      quality: preset.q,
                    });
                    return (
                      <div
                        key={preset.w}
                        className="flex items-center justify-between p-2 rounded bg-white border border-[#E7E7E7] text-[11px]"
                      >
                        <span className="font-medium text-black">{preset.label}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              addToast({
                                type: 'success',
                                title: 'URL Copied',
                                description: `${preset.label} link copied.`,
                              });
                            }}
                            className="text-[#3F3F8F] hover:underline font-semibold"
                          >
                            Copy URL
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#666666] hover:text-black"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedAsset(null)}>
                  CLOSE
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setAssetToDelete(selectedAsset);
                  }}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  DELETE ASSET
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {assetToDelete && (
          <Modal
            isOpen={Boolean(assetToDelete)}
            onClose={() => setAssetToDelete(null)}
            title="CONFIRM SAFE DELETION"
          >
            <div className="space-y-4 text-xs font-poppins text-left">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-[4px] text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">Safe Reference-Counted Delete</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Are you sure you want to remove <strong>{assetToDelete.original_filename}</strong> from
                    Cloudflare R2?
                  </p>
                  {(assetToDelete.product_reference_count ?? 0) > 0 && (
                    <p className="text-[11px] text-red-700 font-semibold">
                      ⚠️ This asset is currently linked to {assetToDelete.product_reference_count} product
                      image(s). Deletion will be rejected unless you unlink it from those products first.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAssetToDelete(null)}>
                  CANCEL
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isDeleting}
                  onClick={confirmDeleteMedia}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  CONFIRM REMOVE
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {isBulkModalOpen && (
          <Modal
            isOpen={isBulkModalOpen}
            onClose={() => {
              if (!isBulkDeleting) setIsBulkModalOpen(false);
            }}
            title="CONFIRM BULK DELETION"
          >
            <div className="space-y-4 text-xs font-poppins text-left">
              <div
                className={`p-4 rounded-[4px] border ${
                  inUseSelectedCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      inUseSelectedCount > 0 ? 'text-amber-600' : 'text-red-600'
                    }`}
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="font-semibold text-sm">
                      Delete {selectedIds.size} Media Asset{selectedIds.size > 1 ? 's' : ''}?
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      This will permanently delete <strong>{selectedIds.size} file(s)</strong> (reclaiming{' '}
                      <strong>{formatBytes(selectedBytes)}</strong>) from Cloudflare R2 bucket (
                      <code className="font-mono bg-black/10 px-1 py-0.5 rounded">tanoah-media</code>) and
                      mark them deleted in Supabase.
                    </p>

                    {inUseSelectedCount > 0 && (
                      <div className="p-3 bg-white/90 rounded border border-amber-300 text-[11px] space-y-2 mt-2">
                        <p className="text-red-700 font-semibold">
                          ⚠️ {inUseSelectedCount} of the selected image(s) are currently linked to active products!
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-black">
                          <input
                            type="checkbox"
                            checked={forceBulkDelete}
                            onChange={(e) => setForceBulkDelete(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                          />
                          <span>Force delete active product images anyway</span>
                        </label>
                        {!forceBulkDelete && (
                          <p className="text-[#666666] text-[10px]">
                            With safe mode active, only unassigned images will be deleted. The {inUseSelectedCount} in-use image(s) will be protected.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  CANCEL
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isBulkDeleting}
                  onClick={handleBulkDelete}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  {forceBulkDelete
                    ? `FORCE DELETE ALL (${selectedIds.size})`
                    : inUseSelectedCount > 0
                    ? `DELETE UNASSIGNED ONLY (${selectedIds.size - inUseSelectedCount})`
                    : `CONFIRM DELETE (${selectedIds.size})`}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};
