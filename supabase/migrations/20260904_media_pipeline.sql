-- Migration: 20260904_media_pipeline.sql
-- Description: Centralized media registry with SHA-256 deduplication and product_images relational link

-- 1. Create centralized media table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/webp',
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'product',
  storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  preserved_original_key TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_media_file_hash ON public.media (file_hash);
CREATE INDEX IF NOT EXISTS idx_media_r2_key ON public.media (r2_key);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media (media_type);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON public.media (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_deleted_at ON public.media (deleted_at);

-- 2. Upgrade product_images table with media_id FK and variant/color columns if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_images' AND column_name = 'media_id'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN media_id UUID REFERENCES public.media(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_images' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_images' AND column_name = 'color_name'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN color_name TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_images' AND column_name = 'position'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN position INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_images_media_id ON public.product_images (media_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON public.product_images (variant_id);

-- 3. Enable RLS on media table
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Allow public read of non-deleted media
DROP POLICY IF EXISTS "Public can view active media" ON public.media;
CREATE POLICY "Public can view active media" ON public.media
  FOR SELECT USING (deleted_at IS NULL);

-- Allow authenticated/service role full access
DROP POLICY IF EXISTS "Full access to media for authenticated users" ON public.media;
CREATE POLICY "Full access to media for authenticated users" ON public.media
  FOR ALL USING (true) WITH CHECK (true);

-- 4. View for active media reference count (for safe deletion & orphan detection)
CREATE OR REPLACE VIEW public.media_usage_stats AS
SELECT 
  m.id AS media_id,
  m.r2_key,
  m.original_filename,
  m.file_size,
  m.file_hash,
  m.created_at,
  m.deleted_at,
  COUNT(pi.id) AS product_reference_count,
  CASE WHEN COUNT(pi.id) = 0 THEN true ELSE false END AS is_orphan
FROM public.media m
LEFT JOIN public.product_images pi ON pi.media_id = m.id
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.r2_key, m.original_filename, m.file_size, m.file_hash, m.created_at, m.deleted_at;
