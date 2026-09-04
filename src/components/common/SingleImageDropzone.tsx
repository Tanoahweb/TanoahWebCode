import React, { useState, useRef } from 'react';
import { Upload, Trash2, RefreshCw, Check, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { formatBytes } from '../../utils/imageUtils';

export interface SingleImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: string; // e.g. '16/9', '4/5', '1/1'
  label?: string;
  helperText?: string;
  className?: string;
  compact?: boolean;
}

export const SingleImageDropzone: React.FC<SingleImageDropzoneProps> = ({
  value,
  onChange,
  aspectRatio = '16/9',
  label = 'Banner Photography',
  helperText = 'Drag & drop image here, or browse files (WebP, PNG, JPEG). Automatically optimized.',
  className = '',
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingsInfo, setSavingsInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setProgressMsg('Optimizing in-browser...');

    try {
      const result = await api.uploadMediaFile(file, {
        mediaType: 'banner',
        onProgress: (p) => {
          setProgressMsg(p.message);
        },
      });

      onChange(result.publicUrl);
      setSavingsInfo(`Optimized: ${formatBytes(result.optimizedSize)} (Saved ${result.percentSaved}%)`);
      setTimeout(() => setSavingsInfo(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image processing failed.');
    } finally {
      setIsUploading(false);
      setProgressMsg('');
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
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  if (compact) {
    return (
      <div className={`space-y-1 text-left font-poppins text-xs ${className}`}>
        {label && (
          <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider">
            {label}
          </label>
        )}

        <div
          className={`relative rounded-[4px] overflow-hidden border border-[#E7E7E7] bg-[#F8F8F8] group transition-all select-none ${
            isDragging ? 'ring-2 ring-[#3F3F8F] bg-[#EEEEF8]' : ''
          }`}
          style={{ aspectRatio }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {value ? (
            <>
              <img
                src={value}
                alt="Card thumbnail"
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="w-full py-1 bg-white hover:bg-neutral-100 text-black text-[10px] font-bold rounded shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[#3F3F8F]" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="w-full py-1 bg-white hover:bg-red-50 text-red-600 text-[10px] font-bold rounded shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:bg-[#F0F0FF] transition-colors border-2 border-dashed border-[#D0D0E0]"
            >
              {isUploading ? (
                <RefreshCw className="w-5 h-5 text-[#3F3F8F] animate-spin mb-1" />
              ) : (
                <Upload className="w-5 h-5 text-[#3F3F8F] mb-1" />
              )}
              <span className="text-[10px] font-bold text-neutral-800 leading-tight">
                {isUploading ? progressMsg : 'Upload / Drop'}
              </span>
              <span className="text-[9px] text-neutral-400 mt-0.5">
                {aspectRatio === '1/1' ? '1:1 Square' : '4:5 Portrait'}
              </span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-1 text-center">
              <RefreshCw className="w-4 h-4 text-[#3F3F8F] animate-spin mb-1" />
              <span className="text-[9px] font-bold text-[#3F3F8F]">{progressMsg || 'Optimizing...'}</span>
            </div>
          )}
        </div>

        {savingsInfo && (
          <div className="text-[9px] text-emerald-700 font-medium truncate">
            ✓ {savingsInfo}
          </div>
        )}

        {errorMsg && (
          <div className="text-[9px] text-red-600 font-medium truncate">
            ✕ {errorMsg}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUploadFile(e.target.files[0]);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 text-left font-poppins text-xs ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-black uppercase tracking-wider">
          {label}
        </label>
      )}

      {value ? (
        /* Image Preview State */
        <div className="relative rounded-[4px] overflow-hidden border border-[#E7E7E7] bg-[#F8F8F8] group">
          <div
            className="w-full relative overflow-hidden"
            style={{ aspectRatio }}
          >
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
            />

            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-white/95 hover:bg-white text-black text-[11px] font-semibold rounded-[4px] shadow flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#3F3F8F]" />
                <span>Replace Image</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-1.5 bg-white/95 hover:bg-white text-red-600 text-[11px] font-semibold rounded-[4px] shadow flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {savingsInfo && (
            <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 font-medium">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{savingsInfo}</span>
            </div>
          )}
        </div>
      ) : (
        /* Empty Drag & Drop Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[4px] p-6 text-center cursor-pointer transition-all duration-200 select-none ${
            isDragging
              ? 'border-[#3F3F8F] bg-[#EEEEF8]/60 scale-[0.99]'
              : 'border-[#E7E7E7] hover:border-[#3F3F8F] bg-[#FAFAFA]'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center border border-[#E7E7E7]">
              {isUploading ? (
                <RefreshCw className="w-5 h-5 text-[#3F3F8F] animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-[#3F3F8F]" />
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-black uppercase tracking-wider block">
                {isUploading ? progressMsg : 'Drag & Drop Image Here'}
              </span>
              <p className="text-[11px] text-[#666666] mt-0.5 max-w-sm mx-auto">
                {helperText}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#E7E7E7] text-[10px] text-[#3F3F8F] font-medium">
              <Sparkles className="w-3 h-3 text-[#3F3F8F]" />
              <span>Auto WebP Compression • High Resolution Master</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600 pt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
};
