-- Migration: Add lookbook_section_config to store_settings table
-- Enables editorial lookbook showcase customization to persist and sync across all clients and devices

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS lookbook_section_config JSONB;

-- Seed default lookbook config if currently null
UPDATE public.store_settings
SET lookbook_section_config = '{
  "isEnabled": true,
  "heroImage": "/Assets/editorial/lookbook-hero-ivory.jpg",
  "heroAlt": "TANOAH SS26 Editorial Lookbook - Botanical Linen Kurta",
  "tag": "LOOK 01 • BOTANICAL LINEN",
  "detailImage": "/Assets/editorial/lookbook-detail-embroidery.jpg",
  "detailAlt": "Artisanal Hand-Loomed Linen Weave Detail",
  "detailTag": "Raised Botanical Needlework",
  "volume": "VOLUME 01 • SS26 EDITORIAL",
  "title": "AN EXPLORATION OF TEXTURE, FORM & ELEVATION",
  "subtitle": "THE BOTANICAL LINEN KURTA",
  "description": "Every garment in the Spring / Summer 2026 collection is sculpted from pure botanical linens, heavyweight double-mercerized cottons, and fluid modal blends. We prioritize enduring design over fleeting cycles.",
  "stat1Value": "100%",
  "stat1Label": "Botanical Linen Fibres",
  "stat2Value": "ARTISANAL",
  "stat2Label": "Handcrafted Precision Fit",
  "primaryButtonText": "VIEW FULL LOOKBOOK",
  "primaryButtonLink": "/collections/all",
  "secondaryButtonText": "THE ART ARCHIVE",
  "secondaryButtonLink": "/about"
}'::jsonb
WHERE lookbook_section_config IS NULL;
