-- Migration: 20260912_similar_products.sql
-- Description: Add similar_product_ids and similar_category_ids arrays to products table for curated recommendations

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS similar_product_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS similar_category_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
