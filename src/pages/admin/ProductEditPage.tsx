import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Layers,
  DollarSign,
  Upload,
  X,
  Palette,
  FileText,
  Info,
  ChevronDown,
  ListPlus,
  Check,
  Search,
  ExternalLink,
  FolderTree,
  Package,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { SAMPLE_CATEGORIES } from '../../data/mockData';
import { formatPrice } from '../../utils/formatters';
import { api } from '../../services/api';
import { Product, ProductVariant, ProductImage, ProductDetailSection, Collection, Category } from '../../types';
import { MediaUploader } from '../../components/admin/MediaUploader';
import { SingleImageDropzone } from '../../components/common/SingleImageDropzone';
import { ProductSeoSection } from '../../components/admin/ProductSeoSection';

const DEFAULT_PRODUCT_TYPES = [
  'Sarees',
  'T-Shirts',
  'Shirts',
  'Trousers',
  'Dresses',
  'Kurtas',
  'Lehengas',
  'Outerwear',
  'Co-ords',
  'Accessories',
];



interface OptionChoice {
  id: string;
  name: string;
  hex?: string;
}

interface ProductOption {
  id: string;
  name: string; // e.g. "Colour", "Size"
  type: 'text' | 'color';
  choices: OptionChoice[];
}

const COMMON_SIZE_SUGGESTIONS = ['L', 'M', 'S', 'XL', 'XS', 'XXL'];

const COLOR_AUTO_MAP: Record<string, string> = {
  red: '#DC2626',
  crimson: '#B91C1C',
  maroon: '#800000',
  burgundy: '#831843',
  wine: '#881337',
  blue: '#2563EB',
  navy: '#1E293B',
  'royal blue': '#1D4ED8',
  'sky blue': '#38BDF8',
  green: '#10B981',
  'forest green': '#1B4D3E',
  'olive green': '#65A30D',
  emerald: '#059669',
  yellow: '#EAB308',
  'ochre yellow': '#D97706',
  mustard: '#CA8A04',
  black: '#1C1C1C',
  noir: '#111827',
  white: '#FFFFFF',
  ecru: '#F0EDE5',
  cream: '#FEF3C7',
  beige: '#D4B996',
  pink: '#EC4899',
  rose: '#F43F5E',
  purple: '#9333EA',
  orange: '#EA580C',
  rust: '#C2410C',
  grey: '#4B5563',
  gray: '#4B5563',
  charcoal: '#374151',
  brown: '#78350F',
};

const detectHexForColor = (name: string): string => {
  const lower = name.trim().toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_AUTO_MAP)) {
    if (lower === key || lower.includes(key)) {
      return hex;
    }
  }
  return '#10B981';
};

const FASHION_PALETTE_COLORS = [
  { name: 'Red', hex: '#DC2626' },
  { name: 'Maroon', hex: '#881337' },
  { name: 'Coral Pink', hex: '#F43F5E' },
  { name: 'Rose Pink', hex: '#EC4899' },
  { name: 'Golden Yellow', hex: '#EAB308' },
  { name: 'Mustard', hex: '#D97706' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Forest Green', hex: '#15803D' },
  { name: 'Sage Green', hex: '#84CC16' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Terracotta', hex: '#C2410C' },
  { name: 'Beige', hex: '#D4C5B9' },
  { name: 'Pearl White', hex: '#F8FAFC' },
  { name: 'Noir Black', hex: '#171717' },
  { name: 'Gold', hex: '#CA8A04' },
  { name: 'Silver Grey', hex: '#64748B' },
];

export const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Core Product State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [brand, setBrand] = useState('TANOAH');
  // Product Types state with inline creation
  const [productTypes, setProductTypes] = useState<string[]>(DEFAULT_PRODUCT_TYPES);
  const [productType, setProductType] = useState('Sarees');
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // Categories state from Supabase
  const [categories, setCategories] = useState<Category[]>(SAMPLE_CATEGORIES);
  const [categoryId, setCategoryId] = useState<string>(SAMPLE_CATEGORIES[0]?.id || '');

  // Collections state
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [selectedCollectionSlugs, setSelectedCollectionSlugs] = useState<string[]>([]);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('unisex');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [basePrice, setBasePrice] = useState<number>(2499);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(2999);
  const [costPrice, setCostPrice] = useState<number>(850);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [hsnCode, setHsnCode] = useState('61091000');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('Luxury, Handcrafted, Tanoah, Bespoke');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);

  // Product Accordion Specifications / Custom Points with Headings (Feature 4)
  const [customSections, setCustomSections] = useState<ProductDetailSection[]>([
    {
      id: 'sec_spec',
      title: 'PRODUCT SPECIFICATIONS & FIT',
      content:
        '• Fabric: 100% Pure Mulberry Silk Crepe\n• Weave: Fine Dense Weave\n• Silhouette: Tailored fluid drape with reinforced seams\n• Fit: True to size. Select your standard size for bespoke fit.',
    },
    {
      id: 'sec_ship',
      title: 'COMPLIMENTARY SHIPPING & EASY RETURNS',
      content:
        '• Complimentary express domestic delivery on orders over ₹1,999.\n• Dispatched within 24 hours via India Post Speed Post (2-4 business days).\n• 14-day doorstep exchange and reverse pickup available.',
    },
  ]);

  // Media state with color tagging (Feature 2)
  const [images, setImages] = useState<ProductImage[]>([]);

  // Variations Mode Toggle: false = Simple product without variants, true = Multi-option variant matrix
  const [hasVariations, setHasVariations] = useState<boolean>(false);

  // Single Product Inventory & SKU Management (when hasVariations === false)
  const [singleStockQuantity, setSingleStockQuantity] = useState<number>(25);
  const [singleLowStockThreshold, setSingleLowStockThreshold] = useState<number>(5);
  const [singleSku, setSingleSku] = useState<string>('');
  const [singleBarcode, setSingleBarcode] = useState<string>('');
  const [singleColorName, setSingleColorName] = useState<string>('');
  const [singleColorHex, setSingleColorHex] = useState<string>('#1C1C1C');
  const [singleSizeName, setSingleSizeName] = useState<string>('One Size');
  const [isSingleColorPaletteOpen, setIsSingleColorPaletteOpen] = useState(false);
 
  // SEO & Social State
  const [seoTitle, setSeoTitle] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');
  const [socialImageUrl, setSocialImageUrl] = useState<string>('');
  const [canonicalUrlOverride, setCanonicalUrlOverride] = useState<string>('');
  const [isNoindex, setIsNoindex] = useState<boolean>(false);
  const [structuredAttributes, setStructuredAttributes] = useState<Record<string, string>>({});

  // Similar Products & Categories State
  const [similarProductIds, setSimilarProductIds] = useState<string[]>([]);
  const [similarCategoryIds, setSimilarCategoryIds] = useState<string[]>([]);
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>([]);
  const [similarProductSearch, setSimilarProductSearch] = useState<string>('');
  const [isSimilarProductDropdownOpen, setIsSimilarProductDropdownOpen] = useState<boolean>(false);
  const similarPickerRef = useRef<HTMLDivElement>(null);

  // Options System (Matches user's screenshots 1 & 2)
  const [options, setOptions] = useState<ProductOption[]>([
    {
      id: 'opt_color',
      name: 'Colour',
      type: 'color',
      choices: [
        { id: 'c_red', name: 'Red', hex: '#DC2626' },
        { id: 'c_blue', name: 'Blue', hex: '#2563EB' },
      ],
    },
    {
      id: 'opt_size',
      name: 'Size',
      type: 'text',
      choices: [
        { id: 's_s', name: 'S' },
        { id: 's_m', name: 'M' },
        { id: 's_l', name: 'L' },
      ],
    },
  ]);

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  // Variant Image Picker Modal State
  const [activeImagePickerVariantId, setActiveImagePickerVariantId] = useState<string | null>(null);

  // Inline Quick Choice Adding on Main Page Option Cards (Issue 1)
  const [quickColorInput, setQuickColorInput] = useState('');
  const [quickColorHex, setQuickColorHex] = useState('#EAB308');
  const [quickTextInput, setQuickTextInput] = useState('');
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
  const [editingChoiceHexId, setEditingChoiceHexId] = useState<{ optId: string; choiceId: string } | null>(null);

  // Add Product Option Modal State (Matches screenshots)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [modalOptionName, setModalOptionName] = useState('Colour');
  const [modalFieldType, setModalFieldType] = useState<'text' | 'color'>('color');
  const [modalChoiceInput, setModalChoiceInput] = useState('');
  const [modalCurrentHex, setModalCurrentHex] = useState('#10B981');
  const [modalChoices, setModalChoices] = useState<OptionChoice[]>([]);

  // Distinct color names from options or single product for image tagging
  const configuredColorChoices = hasVariations
    ? (options.find(
        (o) => o.type === 'color' || o.name.toLowerCase().includes('colo')
      )?.choices || [])
    : (singleColorName.trim()
        ? [{ id: 'choice_single_col', name: singleColorName.trim(), hex: singleColorHex }]
        : []);

  // Generate Cartesian Product Variants from Options
  const buildVariantsFromOptions = (
    currentOptions: ProductOption[],
    currentBasePrice = basePrice,
    currentSlug = slug,
    existingVariants = variants
  ) => {
    if (currentOptions.length === 0) {
      setVariants([]);
      return;
    }

    const colorOpt = currentOptions.find(
      (o) => o.type === 'color' || o.name.toLowerCase().includes('colo')
    );
    const otherOpts = currentOptions.filter((o) => o !== colorOpt);

    const generated: ProductVariant[] = [];
    const prefix = (currentSlug || title || 'GARMENT')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'TAN';

    if (colorOpt && otherOpts.length > 0) {
      colorOpt.choices.forEach((col) => {
        otherOpts[0].choices.forEach((sz) => {
          const colCode = col.name.slice(0, 3).toUpperCase();
          const szCode = sz.name.toUpperCase();
          const sku = `TAN-${prefix}-${colCode}-${szCode}`;

          const existing = existingVariants.find(
            (v) => v.color_name === col.name && v.size === sz.name
          );

          // Check if any uploaded image is tagged with this color
          const matchingColorImage = images.find(
            (img) => img.color_name && img.color_name.toLowerCase() === col.name.toLowerCase()
          );

          const existingValidImg =
            existing?.color_image_url && images.some((img) => img.image_url === existing.color_image_url)
              ? existing.color_image_url
              : null;

          const validVariantImgUrl =
            existingValidImg ||
            matchingColorImage?.image_url ||
            images[0]?.image_url ||
            '';

          generated.push({
            id: existing ? existing.id : `var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            product_id: id || 'new',
            title: `${col.name} / ${sz.name}`,
            sku: existing?.sku || sku,
            barcode: existing?.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
            color_name: col.name,
            color_hex: col.hex || '#000000',
            color_image_url: validVariantImgUrl,
            size: sz.name,
            price: existing ? existing.price : currentBasePrice,
            sale_price: currentBasePrice < compareAtPrice ? currentBasePrice : undefined,
            compare_at_price: compareAtPrice,
            stock_quantity: existing ? existing.stock_quantity : 25,
            reserved_stock: 0,
            low_stock_threshold: 5,
            is_active: true,
          });
        });
      });
    } else {
      const activeOpt = currentOptions[0];
      activeOpt.choices.forEach((choice) => {
        const sku = `TAN-${prefix}-${choice.name.slice(0, 3).toUpperCase()}`;
        const existing = existingVariants.find(
          (v) => v.title === choice.name || v.color_name === choice.name || v.size === choice.name
        );

        generated.push({
          id: existing ? existing.id : `var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          product_id: id || 'new',
          title: choice.name,
          sku: existing?.sku || sku,
          barcode: existing?.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          color_name: choice.hex ? choice.name : 'Standard',
          color_hex: choice.hex || '#000000',
          size: choice.hex ? 'One Size' : choice.name,
          price: existing ? existing.price : currentBasePrice,
          sale_price: currentBasePrice < compareAtPrice ? currentBasePrice : undefined,
          compare_at_price: compareAtPrice,
          stock_quantity: 25,
          reserved_stock: 0,
          low_stock_threshold: 5,
          is_active: true,
        });
      });
    }

    setVariants(generated);
  };

  // Load Collections & Existing Product on Mount / Edit
  useEffect(() => {
    let isMounted = true;

    // Load available collections
    api.getCollections().then((cols) => {
      if (isMounted && cols && cols.length > 0) {
        setAvailableCollections(cols);
      }
    });

    // Load available categories from Supabase
    api.getCategories().then((cats) => {
      if (isMounted && cats && cats.length > 0) {
        setCategories(cats);
        setCategoryId((prev) => prev || cats[0].id);
      }
    });

    // Load available product types from Supabase
    api.getProductTypes().then((types) => {
      if (isMounted && types && types.length > 0) {
        setProductTypes(types);
      }
    });

    // Load all catalog products for similar product picker
    api.getProducts('all').then((prods) => {
      if (isMounted && prods && prods.length > 0) {
        setAllCatalogProducts(prods);
      }
    });

    if (isEditing && id) {
      setIsLoading(true);
      api.getProductById(id).then(async (match) => {
        if (!isMounted) return;
        setIsLoading(false);
        if (match) {
          try {
            setTitle(match.title || '');
            setSlug(match.slug || '');
            setBrand(match.brand || 'TANOAH');
            if (match.category_id) {
              setCategoryId(match.category_id);
            }
            if (match.product_type) {
              setProductType(match.product_type);
              setProductTypes((prev) =>
                prev.includes(match.product_type) ? prev : [...prev, match.product_type]
              );
            }
            setGender((match.gender as any) || 'unisex');
            setBasePrice(Number(match.base_price) || 0);
            setCompareAtPrice(Number(match.compare_at_price) || Number(match.base_price) || 0);
            setCostPrice(Number(match.cost_price) || 850);
            setTaxRate(Number(match.tax_rate) || 5);
            setHsnCode(match.hsn_code || '61091000');
            setStatus(match.status || 'active');
            setDescription(match.description || '');
            setShortDescription(match.short_description || '');
            setTags(Array.isArray(match.tags) ? match.tags.join(', ') : (typeof match.tags === 'string' ? match.tags : ''));
            setIsFeatured(Boolean(match.is_featured));
            setIsBestSeller(Boolean(match.is_best_seller));
            setIsNewArrival(Boolean(match.is_new_arrival));
            setSeoTitle(match.seo_title || '');
            setSeoDescription(match.seo_description || '');
            setSocialImageUrl(match.social_image_url || '');
            setCanonicalUrlOverride(match.canonical_url_override || '');
            setIsNoindex(Boolean(match.is_noindex));
            setStructuredAttributes((match.structured_attributes as Record<string, string>) || {});
            setSimilarProductIds(Array.isArray(match.similar_product_ids) ? match.similar_product_ids : []);
            setSimilarCategoryIds(Array.isArray(match.similar_category_ids) ? match.similar_category_ids : []);

            // Hydrate collections for existing product
            const initialColSlugs: string[] = [];
            if (Array.isArray(match.collections)) {
              initialColSlugs.push(...match.collections);
            }
            const allCols = await api.getCollections();
            allCols.forEach((col) => {
              const matchesTag =
                Array.isArray(match.tags) &&
                match.tags.some((t: string) => t.toLowerCase() === col.slug.toLowerCase());
              const matchesCat = match.category_name?.toLowerCase() === col.slug.toLowerCase();
              if ((matchesTag || matchesCat) && !initialColSlugs.includes(col.slug)) {
                initialColSlugs.push(col.slug);
              }
            });
            setSelectedCollectionSlugs(initialColSlugs);

            let loadedSections: ProductDetailSection[] | null = null;
            if (Array.isArray(match.custom_sections) && match.custom_sections.length > 0) {
              loadedSections = match.custom_sections;
            } else if (typeof match.custom_sections === 'string') {
              try {
                const parsed = JSON.parse(match.custom_sections);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedSections = parsed;
                }
              } catch (e) {}
            }

            if (loadedSections && loadedSections.length > 0) {
              setCustomSections(loadedSections);
            }

            const isCustomMatch =
              match.id?.startsWith('p_') || match.id?.startsWith('prod_custom_') || !match.id?.startsWith('prod-00');
            const loadedImages = (match.images || []).filter(
              (img) =>
                img &&
                typeof img.image_url === 'string' &&
                img.image_url.trim().length > 0 &&
                (!isCustomMatch || (!img.image_url.includes('hero-mobile') && !img.image_url.includes('hero-landscape') && !img.image_url.includes('placeholder-product')))
            );
            setImages(loadedImages);

            const loadedValidUrls = new Set(loadedImages.map((i) => i.image_url));

            if (Array.isArray(match.variants) && match.variants.length > 0) {
              const cleanedMatchVariants = match.variants.map((v) => ({
                ...v,
                color_image_url:
                  v.color_image_url && loadedValidUrls.has(v.color_image_url)
                    ? v.color_image_url
                    : loadedImages[0]?.image_url || '',
              }));
              setVariants(cleanedMatchVariants);

              const colorMap = new Map<string, string>();
              const sizeSet = new Set<string>();
              match.variants.forEach((v) => {
                if (v?.color_name && v.color_name !== 'Standard') {
                  colorMap.set(v.color_name, v.color_hex || '#000000');
                }
                if (v?.size && v.size !== 'One Size') {
                  sizeSet.add(v.size);
                }
              });

              const reconstructed: ProductOption[] = [];
              if (colorMap.size > 0) {
                reconstructed.push({
                  id: 'opt_color',
                  name: 'Colour',
                  type: 'color',
                  choices: Array.from(colorMap.entries()).map(([name, hex], i) => ({
                    id: `c_${i}_${name}`,
                    name,
                    hex,
                  })),
                });
              }
              if (sizeSet.size > 0) {
                reconstructed.push({
                  id: 'opt_size',
                  name: 'Size',
                  type: 'text',
                  choices: Array.from(sizeSet).map((name, i) => ({
                    id: `s_${i}_${name}`,
                    name,
                  })),
                });
              }

              if (reconstructed.length > 0 || match.variants.length > 1) {
                setHasVariations(true);
                setOptions(reconstructed);
              } else if (match.variants.length === 1) {
                // Simple product without variations
                setHasVariations(false);
                const firstVar = match.variants[0];
                setSingleStockQuantity(firstVar.stock_quantity ?? 0);
                setSingleLowStockThreshold(firstVar.low_stock_threshold ?? 5);
                setSingleSku(firstVar.sku || '');
                setSingleBarcode(firstVar.barcode || '');
                setSingleColorName(firstVar.color_name && firstVar.color_name !== 'Standard' ? firstVar.color_name : '');
                setSingleColorHex(firstVar.color_hex || '#1C1C1C');
                setSingleSizeName(firstVar.size || 'One Size');
                setOptions([]);
              } else {
                setHasVariations(false);
                setOptions([]);
              }
            } else {
              setHasVariations(false);
              setOptions([]);
            }
          } catch (loadErr) {
            console.error('Error hydrating product edit fields:', loadErr);
          }
        }
      });
    } else {
      // New product: default to simple product without variations
      setHasVariations(false);
      setOptions([]);
      setVariants([]);
    }

    return () => {
      isMounted = false;
    };
  }, [id, isEditing]);

  // Handle outside clicks for similar product picker dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (similarPickerRef.current && !similarPickerRef.current.contains(e.target as Node)) {
        setIsSimilarProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Helper to compress image client-side to prevent localStorage quota exhaustion
  const compressImageForStorage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.8));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => resolve((event.target?.result as string) || '');
        img.src = (event.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Drag and Drop File Handlers with R2 Cloudflare upload and quota-safe compression
  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    for (let index = 0; index < validFiles.length; index++) {
      const file = validFiles[index];
      let finalUrl = '';

      try {
        const uploadRes = await api.uploadMediaFile(file, { mediaType: 'product' });
        if (uploadRes?.publicUrl) {
          finalUrl = uploadRes.publicUrl;
        }
      } catch (err) {
        console.warn('R2 direct upload fallback:', err);
      }

      if (!finalUrl) {
        finalUrl = await compressImageForStorage(file);
      }

      if (finalUrl) {
        setImages((prev) => [
          ...prev,
          {
            id: `img_${Date.now()}_${index}`,
            image_url: finalUrl,
            is_primary: prev.length === 0 && index === 0,
            sort_order: prev.length + index,
            color_name: '',
          },
        ]);
      }
    }

    addToast({
      type: 'success',
      title: 'Images Uploaded',
      description: `${validFiles.length} photo(s) added and optimized. You can now tag each photo by color.`,
    });
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimaryImage = (imgId: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_primary: img.id === imgId,
      }))
    );
  };

  const handleRemoveImage = (imgId: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === imgId);
      const filtered = prev.filter((img) => img.id !== imgId);
      if (filtered.length > 0 && !filtered.some((img) => img.is_primary)) {
        filtered[0].is_primary = true;
      }
      if (removed) {
        setVariants((vPrev) =>
          vPrev.map((v) =>
            v.color_image_url === removed.image_url
              ? { ...v, color_image_url: filtered[0]?.image_url || '' }
              : v
          )
        );
      }
      return filtered;
    });
  };

  const handleImagesChange = (newImages: ProductImage[]) => {
    setImages(newImages);

    const validUrls = new Set(newImages.map((img) => img.image_url));

    // Synchronize variant images: map tagged images, and clean up any deleted image references
    setVariants((prev) =>
      prev.map((v) => {
        const matchingColorImg = newImages.find(
          (img) => img.color_name && img.color_name.toLowerCase() === v.color_name.toLowerCase()
        );
        if (matchingColorImg) {
          return { ...v, color_image_url: matchingColorImg.image_url };
        }
        if (v.color_image_url && !validUrls.has(v.color_image_url)) {
          return {
            ...v,
            color_image_url: newImages[0]?.image_url || '',
          };
        }
        return v;
      })
    );
  };

  // Assign image to a specific color (Feature 2)
  const handleAssignImageColor = (imgId: string, colorName: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, color_name: colorName } : img))
    );

    // Also auto-assign this image to all variants with this color
    if (colorName) {
      const targetImg = images.find((i) => i.id === imgId);
      if (targetImg) {
        setVariants((prev) =>
          prev.map((v) =>
            v.color_name.toLowerCase() === colorName.toLowerCase()
              ? { ...v, color_image_url: targetImg.image_url }
              : v
          )
        );
      }
    }
  };

  const handleAssignVariantImage = (variantId: string, imageUrl: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, color_image_url: imageUrl } : v))
    );
    setActiveImagePickerVariantId(null);
    addToast({
      type: 'info',
      title: 'Variant Image Assigned',
      description: 'Image mapped to variant for color switching.',
    });
  };

  // Option Modal Helpers (Clean Last Version, Matching User's Screenshots 1 & 2)
  const handleOpenAddOptionModal = () => {
    setModalOptionName('Colour');
    setModalFieldType('color');
    setModalChoiceInput('');
    setModalCurrentHex('#DC2626');
    setModalChoices([
      { id: 'c_red', name: 'Red', hex: '#DC2626' },
      { id: 'c_blue', name: 'Blue', hex: '#2563EB' },
    ]);
    setIsOptionModalOpen(true);
  };

  const handleAddModalChoice = () => {
    if (!modalChoiceInput.trim()) return;
    const trimmed = modalChoiceInput.trim();
    const items = trimmed.split(',').map((s) => s.trim()).filter(Boolean);

    const newChoices: OptionChoice[] = items.map((item, idx) => {
      const hex = modalFieldType === 'color' ? modalCurrentHex || detectHexForColor(item) : undefined;
      return {
        id: `mc_${Date.now()}_${idx}`,
        name: item,
        hex,
      };
    });

    setModalChoices((prev) => [...prev, ...newChoices]);
    setModalChoiceInput('');
  };

  const handleRemoveModalChoice = (id: string) => {
    setModalChoices((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveOptionFromModal = () => {
    if (!modalOptionName.trim() || modalChoices.length === 0) {
      addToast({
        type: 'error',
        title: 'Incomplete Option',
        description: 'Please provide an option name and at least one choice.',
      });
      return;
    }

    const newOpt: ProductOption = {
      id: `opt_${Date.now()}`,
      name: modalOptionName.trim(),
      type: modalFieldType,
      choices: modalChoices,
    };

    const updatedOptions = options.some((o) => o.name.toLowerCase() === newOpt.name.toLowerCase())
      ? options.map((o) => (o.name.toLowerCase() === newOpt.name.toLowerCase() ? newOpt : o))
      : [...options, newOpt];

    setOptions(updatedOptions);
    buildVariantsFromOptions(updatedOptions);
    setIsOptionModalOpen(false);

    addToast({
      type: 'success',
      title: 'Option Added',
      description: `Option "${newOpt.name}" configured with ${newOpt.choices.length} choices.`,
    });
  };

  const handleRemoveOption = (optionId: string) => {
    const updated = options.filter((o) => o.id !== optionId);
    setOptions(updated);
    buildVariantsFromOptions(updated);
  };

  const handleRemoveChoice = (optionId: string, choiceId: string) => {
    const updated = options.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, choices: opt.choices.filter((c) => c.id !== choiceId) };
      }
      return opt;
    });
    setOptions(updated);
    buildVariantsFromOptions(updated);
  };

  const handleUpdateChoiceHex = (optId: string, choiceId: string, newHex: string) => {
    const updated = options.map((opt) => {
      if (opt.id === optId) {
        return {
          ...opt,
          choices: opt.choices.map((c) => (c.id === choiceId ? { ...c, hex: newHex } : c)),
        };
      }
      return opt;
    });
    setOptions(updated);

    const targetChoice = options.find((o) => o.id === optId)?.choices.find((c) => c.id === choiceId);
    if (targetChoice) {
      setVariants((prev) =>
        prev.map((v) => (v.color_name === targetChoice.name ? { ...v, color_hex: newHex } : v))
      );
    }
  };

  const handleQuickAddChoice = (optId: string, name: string, hex?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const targetOpt = options.find((o) => o.id === optId);
    if (targetOpt && targetOpt.choices.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      addToast({ type: 'info', title: 'Choice Exists', description: `"${trimmed}" is already added.` });
      return;
    }

    const finalHex = targetOpt?.type === 'color' ? hex || detectHexForColor(trimmed) : undefined;
    const newChoice: OptionChoice = {
      id: `c_${Date.now()}`,
      name: trimmed,
      hex: finalHex,
    };

    const updated = options.map((opt) =>
      opt.id === optId ? { ...opt, choices: [...opt.choices, newChoice] } : opt
    );

    setOptions(updated);
    buildVariantsFromOptions(updated);
    setQuickColorInput('');
    setQuickTextInput('');

    addToast({
      type: 'success',
      title: 'Choice Added',
      description: `Added "${trimmed}" to ${targetOpt?.name || 'option'}.`,
    });
  };

  // Custom Accordion Sections Handlers (Feature 4)
  const handleAddCustomSection = () => {
    const newSec: ProductDetailSection = {
      id: `sec_${Date.now()}`,
      title: 'NEW SPECIFICATION HEADING',
      content: '• Add detail point 1\n• Add detail point 2\n• Add detail point 3',
    };
    setCustomSections((prev) => [...prev, newSec]);
  };

  const handleUpdateCustomSection = (secId: string, field: 'title' | 'content', value: string) => {
    setCustomSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveCustomSection = (secId: string) => {
    setCustomSections((prev) => prev.filter((s) => s.id !== secId));
  };

  // Variant Field Updates
  const handleUpdateVariant = (varId: string, field: keyof ProductVariant, val: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, [field]: val } : v))
    );
  };

  // Bulk Variant Actions
  const handleSelectAllVariants = () => {
    if (selectedVariantIds.length === variants.length) {
      setSelectedVariantIds([]);
    } else {
      setSelectedVariantIds(variants.map((v) => v.id));
    }
  };

  const handleBulkSetPrice = (priceVal: number) => {
    setVariants((prev) =>
      prev.map((v) => (selectedVariantIds.includes(v.id) ? { ...v, price: priceVal } : v))
    );
  };

  const handleBulkSetStock = (stockVal: number) => {
    setVariants((prev) =>
      prev.map((v) => (selectedVariantIds.includes(v.id) ? { ...v, stock_quantity: stockVal } : v))
    );
  };

  const handleSaveNewProductType = async () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) {
      setIsAddingNewType(false);
      return;
    }
    const existing = productTypes.find((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setProductType(existing);
      setIsAddingNewType(false);
      setNewTypeInput('');
      addToast({
        type: 'info',
        title: 'Product Type Selected',
        description: `Selected existing product type "${existing}".`,
      });
      return;
    }

    const updated = await api.saveProductType(trimmed);
    setProductTypes(updated && updated.length > 0 ? updated : [...productTypes, trimmed]);
    setProductType(trimmed);
    setIsAddingNewType(false);
    setNewTypeInput('');
    addToast({
      type: 'success',
      title: 'Product Type Created',
      description: `New product type "${trimmed}" created and saved to cloud store.`,
    });
  };

  // Auto-generate SKU helper for simple single products
  const handleGenerateSingleSku = () => {
    const prefix = (slug || title || 'ITEM')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) || 'TAN';
    const colorPart = singleColorName.trim()
      ? `-${singleColorName.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}`
      : '';
    setSingleSku(`TAN-${prefix}${colorPart}`);
  };

  // Save Product Handler (Calls unified api.saveProduct)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Title',
        description: 'Product title and slug are required.',
      });
      return;
    }

    // Sanitize images first to ensure non-empty valid URLs and at least one primary image
    const cleanedImages = images.filter(
      (img) => img && typeof img.image_url === 'string' && img.image_url.trim().length > 0
    );
    if (cleanedImages.length > 0 && !cleanedImages.some((img) => img.is_primary)) {
      cleanedImages[0].is_primary = true;
    }

    let finalVariants: ProductVariant[] = [];

    if (hasVariations) {
      if (variants.length === 0) {
        addToast({
          type: 'error',
          title: 'Missing Variants',
          description: 'Please add at least one product option choice or uncheck variations.',
        });
        return;
      }
      finalVariants = variants;
    } else {
      // Build master single variant for simple product without variations
      const prefix = (slug || title || 'ITEM')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'TAN';
      const autoSku = `TAN-${prefix}`;
      const effectiveSku = singleSku.trim() || autoSku;

      const existingSingle = variants[0];
      const singleVariant: ProductVariant = {
        id: existingSingle?.id || `var_${Date.now()}_default`,
        product_id: id && id !== 'new' ? id : 'new',
        title: singleColorName.trim()
          ? `${singleColorName.trim()} / ${singleSizeName.trim() || 'One Size'}`
          : 'Standard',
        sku: effectiveSku,
        barcode: singleBarcode.trim() || undefined,
        color_name: singleColorName.trim() || 'Standard',
        color_hex: singleColorName.trim() ? singleColorHex : '#000000',
        color_image_url: cleanedImages[0]?.image_url || '',
        size: singleSizeName.trim() || 'One Size',
        price: basePrice,
        sale_price: basePrice < compareAtPrice ? basePrice : undefined,
        compare_at_price: compareAtPrice,
        stock_quantity: Math.max(0, Number(singleStockQuantity) || 0),
        reserved_stock: 0,
        low_stock_threshold: Math.max(0, Number(singleLowStockThreshold) || 0),
        is_active: true,
      };
      finalVariants = [singleVariant];
    }

    setIsLoading(true);

    // Merge selected collections into tags so that collection queries work across all pages
    const rawTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const mergedTagsSet = new Set(rawTags);
    selectedCollectionSlugs.forEach((colSlug) => mergedTagsSet.add(colSlug));

    // Ensure variants ONLY reference active valid images from cleanedImages
    const validImgUrls = new Set(cleanedImages.map((i) => i.image_url));
    const cleanedVariants = finalVariants.map((v) => {
      const matchingImg = cleanedImages.find(
        (img) => img.color_name && img.color_name.toLowerCase().trim() === v.color_name?.toLowerCase().trim()
      );
      let finalColorImgUrl = '';
      if (v.color_image_url && validImgUrls.has(v.color_image_url)) {
        finalColorImgUrl = v.color_image_url;
      } else if (matchingImg) {
        finalColorImgUrl = matchingImg.image_url;
      } else if (cleanedImages.length > 0) {
        finalColorImgUrl = cleanedImages[0].image_url;
      }

      return {
        ...v,
        color_image_url: finalColorImgUrl,
      };
    });

    const productPayload: Product = {
      id: id && id !== 'new' ? id : `p_${Date.now()}`,
      title: title.trim(),
      slug: slug.trim(),
      brand: brand.trim(),
      product_type: productType,
      category_id: categoryId,
      gender,
      base_price: basePrice,
      sale_price: basePrice < compareAtPrice ? basePrice : undefined,
      compare_at_price: compareAtPrice,
      cost_price: costPrice,
      tax_rate: taxRate,
      hsn_code: hsnCode,
      status,
      is_featured: isFeatured,
      is_best_seller: isBestSeller,
      is_new_arrival: isNewArrival,
      short_description: shortDescription,
      description,
      custom_sections: customSections
        .map((sec, idx) => ({
          id: sec.id || `sec_${idx}_${Date.now()}`,
          title: sec.title.trim(),
          content: sec.content.trim(),
        }))
        .filter((sec) => sec.title.length > 0 || sec.content.length > 0),
      collections: selectedCollectionSlugs,
      tags: Array.from(mergedTagsSet),
      images: cleanedImages,
      variants: cleanedVariants,
      seo_title: seoTitle.trim() || undefined,
      seo_description: seoDescription.trim() || undefined,
      social_image_url: socialImageUrl.trim() || undefined,
      canonical_url_override: canonicalUrlOverride.trim() || undefined,
      is_noindex: isNoindex,
      structured_attributes: structuredAttributes,
      similar_product_ids: similarProductIds,
      similar_category_ids: similarCategoryIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await api.saveProduct(productPayload);

      addToast({
        type: 'success',
        title: isEditing ? 'Product Updated' : 'Product Published',
        description: hasVariations
          ? `${productPayload.title} saved with ${cleanedVariants.length} variants.`
          : `${productPayload.title} saved with inventory of ${singleStockQuantity} units.`,
      });

      setIsLoading(false);
      navigate('/admin/products');
    } catch (err: any) {
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save product.',
      });
    }
  };

  const profitPerItem = basePrice - costPrice;
  const marginPercent = basePrice > 0 ? ((profitPerItem / basePrice) * 100).toFixed(1) : 0;

  return (
    <AdminLayout>
      <form onSubmit={handleSaveProduct} className="space-y-8 text-left font-poppins text-xs pb-28">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="p-2 border border-[#E7E7E7] rounded-[4px] hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-black" />
            </Link>
            <div>
              <h1 className="font-wondra text-2xl sm:text-3xl text-black">
                {isEditing ? 'EDIT PRODUCT' : 'CREATE PRODUCT'}
              </h1>
              <p className="text-[#666666] mt-0.5">
                Drag-and-drop media, color-specific image assignment, custom accordion headings, and variants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/products">
              <Button variant="secondary" size="md" type="button">
                CANCEL
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              icon={<Save className="w-4 h-4" />}
            >
              SAVE & PUBLISH
            </Button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Basic Details */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs">
                GARMENT IDENTIFIERS
              </h3>

              <div>
                <label className="block font-semibold text-black mb-1 uppercase text-[11px]">
                  Product Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Handcrafted Mulberry Silk Saree"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-black mb-1 uppercase text-[11px]">
                    URL Handle / Slug *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="handcrafted-mulberry-silk-saree"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] font-mono text-[#666666]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-black mb-1 uppercase text-[11px]">
                    Brand Label
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-black mb-1 uppercase text-[11px]">
                  Short Subtitle / Fit Teaser
                </label>
                <input
                  type="text"
                  placeholder="Pure Zari Weave Silk Saree with Unstitched Blouse Piece"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-black mb-1 uppercase text-[11px]">
                  Editorial Craft Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed description regarding weave density, yarn origin, artisanal motifs, and drape..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* 2. Drag & Drop Media Management with Cloudflare R2 Optimization Pipeline */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#3F3F8F]" />
                    <span>PRODUCT MEDIA & CLOUDFLARE R2 PIPELINE</span>
                  </h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Client-side 4:5 WebP master conversion, SHA-256 deduplication, zero CLS, and color variant assignment.
                  </p>
                </div>
              </div>

              <MediaUploader
                images={images}
                onChange={handleImagesChange}
                colorOptions={configuredColorChoices}
              />
            </div>

            {/* 3. Product Details Accordion & Custom Points with Headings (Feature 4 - Matches Screenshot) */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#E7E7E7] gap-3">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4 text-[#3F3F8F]" />
                    <span>PRODUCT SPECIFICATIONS & ACCORDION POINTS</span>
                  </h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Manage the collapsible information sections displayed on the product page (e.g. Saree Specifications, Blouse Piece, Fit, Care & Maintenance).
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAddCustomSection}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  ADD NEW POINT WITH HEADING
                </Button>
              </div>

              {/* Accordion Sections List */}
              <div className="space-y-4">
                {customSections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                          Section Heading #{idx + 1}
                        </label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => handleUpdateCustomSection(sec.id, 'title', e.target.value)}
                          placeholder="e.g. PRODUCT SPECIFICATIONS & FIT"
                          className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-bold text-black uppercase focus:outline-none focus:border-[#3F3F8F]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSection(sec.id)}
                        className="text-neutral-400 hover:text-red-600 p-2 mt-4 transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                        Section Details & Bullet Points
                      </label>
                      <textarea
                        rows={3}
                        value={sec.content}
                        onChange={(e) => handleUpdateCustomSection(sec.id, 'content', e.target.value)}
                        placeholder="• Detail 1&#10;• Detail 2&#10;• Detail 3"
                        className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO & Search Engine Preview Engine */}
            <ProductSeoSection
              title={title}
              slug={slug}
              onSlugChange={setSlug}
              description={description}
              shortDescription={shortDescription}
              seoTitle={seoTitle}
              onSeoTitleChange={setSeoTitle}
              seoDescription={seoDescription}
              onSeoDescriptionChange={setSeoDescription}
              socialImageUrl={socialImageUrl}
              onSocialImageUrlChange={setSocialImageUrl}
              canonicalUrlOverride={canonicalUrlOverride}
              onCanonicalUrlOverrideChange={setCanonicalUrlOverride}
              isNoindex={isNoindex}
              onIsNoindexChange={setIsNoindex}
              structuredAttributes={structuredAttributes}
              onStructuredAttributesChange={setStructuredAttributes}
              primaryImageUrl={images.find((i) => i.is_primary)?.image_url || images[0]?.image_url}
              isEditing={Boolean(isEditing)}
            />

            {/* 4. Options & Variants / Direct Inventory Section */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-6">
              {/* Header & Variations Master Toggle */}
              <div className="pb-4 border-b border-[#E7E7E7] space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#3F3F8F]" />
                      <span>INVENTORY & PRODUCT VARIATIONS</span>
                    </h3>
                    <p className="text-[11px] text-[#666666] mt-0.5">
                      Manage inventory stock, SKUs, and optional variants (like sizes and colours).
                    </p>
                  </div>

                  {hasVariations && (
                    <Button
                      variant="primary"
                      size="sm"
                      type="button"
                      onClick={handleOpenAddOptionModal}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      ADD PRODUCT OPTION
                    </Button>
                  )}
                </div>

                {/* Master Toggle Switch: Has Variations */}
                <div className="p-3.5 bg-[#F9F9FB] rounded-[4px] border border-[#E5E5EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasVariationsToggle"
                      checked={hasVariations}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setHasVariations(next);
                        if (next && variants.length === 0) {
                          buildVariantsFromOptions(options);
                        }
                      }}
                      className="w-4 h-4 accent-[#3F3F8F] cursor-pointer rounded"
                    />
                    <label htmlFor="hasVariationsToggle" className="cursor-pointer select-none">
                      <div className="text-xs font-semibold text-black">
                        This product has multiple variations (e.g. multiple sizes or colours)
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        {hasVariations
                          ? 'Generating combinations and separate inventory tracking per size/colour'
                          : 'Simple product: Direct stock & SKU management without requiring size or colour options (e.g. accessories, scarves, or single-piece items)'}
                      </div>
                    </label>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border shrink-0 ${
                      hasVariations
                        ? 'bg-[#3F3F8F]/10 text-[#3F3F8F] border-[#3F3F8F]/30'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {hasVariations ? 'Variations Enabled' : 'Simple Product'}
                  </span>
                </div>
              </div>

              {!hasVariations ? (
                /* Simple Product Inventory Card */
                <div className="space-y-6">
                  <div className="p-4 bg-[#F8F9FA] rounded-[4px] border border-[#E7E7E7] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-black">
                        <Package className="w-4 h-4 text-[#3F3F8F]" />
                        <span>SINGLE PRODUCT INVENTORY & DETAILS</span>
                      </div>
                      <span className="text-[10px] text-[#666666] bg-white px-2 py-0.5 rounded border border-[#E7E7E7]">
                        Single Variant Mode
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {/* Stock Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Available Stock Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={singleStockQuantity}
                          onChange={(e) => setSingleStockQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="25"
                          className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F]"
                          required
                        />
                        <span className="text-[10px] text-[#888888] mt-0.5 block">
                          Current available inventory ready to sell
                        </span>
                      </div>

                      {/* Low Stock Threshold */}
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Low Stock Alert Threshold
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={singleLowStockThreshold}
                          onChange={(e) => setSingleLowStockThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="5"
                          className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                        />
                        <span className="text-[10px] text-[#888888] mt-0.5 block">
                          Alert in admin when stock drops to or below this level
                        </span>
                      </div>

                      {/* SKU */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-[#222222]">
                            SKU (Stock Keeping Unit)
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateSingleSku}
                            className="text-[10px] text-[#3F3F8F] font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <Sparkles className="w-2.5 h-2.5" /> Auto-generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={singleSku}
                          onChange={(e) => setSingleSku(e.target.value)}
                          placeholder="e.g. TAN-SCARF-01"
                          className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                        />
                      </div>

                      {/* Barcode / ISBN */}
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Barcode / ISBN / UPC (Optional)
                        </label>
                        <input
                          type="text"
                          value={singleBarcode}
                          onChange={(e) => setSingleBarcode(e.target.value)}
                          placeholder="e.g. 8901234567890"
                          className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                        />
                      </div>

                      {/* Single Product Colour (Optional) */}
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Single Colour (Optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsSingleColorPaletteOpen(!isSingleColorPaletteOpen)}
                              className="w-9 h-9 rounded-[4px] border border-[#D5D5ED] shadow-2xs flex items-center justify-center relative hover:border-[#3F3F8F] transition-colors"
                              title="Pick colour swatch"
                            >
                              <span
                                className="w-5 h-5 rounded-full border border-black/15 block"
                                style={{ backgroundColor: singleColorHex || '#1C1C1C' }}
                              />
                            </button>

                            {isSingleColorPaletteOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setIsSingleColorPaletteOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 z-50 p-3 bg-white rounded-[6px] shadow-xl border border-[#E7E7E7] w-64 space-y-2">
                                  <div className="flex justify-between items-center pb-1 border-b border-[#E7E7E7]">
                                    <span className="text-[11px] font-bold text-black uppercase">
                                      Select Colour Shade
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIsSingleColorPaletteOpen(false)}
                                      className="text-[#888888] hover:text-black p-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                                    {FASHION_PALETTE_COLORS.map((c) => (
                                      <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => {
                                          setSingleColorHex(c.hex);
                                          if (!singleColorName.trim()) {
                                            setSingleColorName(c.name);
                                          }
                                          setIsSingleColorPaletteOpen(false);
                                        }}
                                        title={`${c.name} (${c.hex})`}
                                        className="p-1 flex flex-col items-center hover:bg-neutral-100 rounded transition-colors"
                                      >
                                        <span
                                          className="w-5 h-5 rounded-full block border border-black/10 hover:scale-110 transition-transform"
                                          style={{ backgroundColor: c.hex }}
                                        />
                                      </button>
                                    ))}
                                  </div>

                                  <div className="pt-2 border-t border-[#E7E7E7] flex items-center gap-2">
                                    <span className="text-[10px] text-[#666666] font-mono">HEX:</span>
                                    <input
                                      type="text"
                                      value={singleColorHex}
                                      onChange={(e) => setSingleColorHex(e.target.value)}
                                      placeholder="#1C1C1C"
                                      className="flex-1 p-1 text-[11px] font-mono border border-[#E7E7E7] rounded uppercase focus:outline-none focus:border-[#3F3F8F]"
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <input
                            type="text"
                            value={singleColorName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSingleColorName(val);
                              const detected = detectHexForColor(val);
                              if (detected !== '#10B981') {
                                setSingleColorHex(detected);
                              }
                            }}
                            placeholder="e.g. Emerald, Maroon, Black"
                            className="flex-1 p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                          />
                        </div>
                        <span className="text-[10px] text-[#888888] mt-0.5 block">
                          Leave blank if not applicable
                        </span>
                      </div>

                      {/* Size / Dimension Label */}
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Size / Dimension Label
                        </label>
                        <input
                          type="text"
                          value={singleSizeName}
                          onChange={(e) => setSingleSizeName(e.target.value)}
                          placeholder="One Size"
                          className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                        />
                        <span className="text-[10px] text-[#888888] mt-0.5 block">
                          Shown as attribute on store (no size selection required)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Configured Options Cards */}
                  <div className="space-y-4">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black uppercase text-xs">{opt.name}</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#666666] uppercase font-mono">
                          {opt.type === 'color' ? 'Color Swatch Option' : 'Text Option'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="text-red-500 hover:text-red-700 text-[11px] flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Option
                      </button>
                    </div>

                    {/* Choices Chips */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {opt.choices.map((choice) => (
                        <div
                          key={choice.id}
                          className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-[#D5D5ED] rounded-[4px] shadow-2xs text-xs font-medium"
                        >
                          {opt.type === 'color' && choice.hex && (
                            <div className="relative inline-flex items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingChoiceHexId(
                                    editingChoiceHexId?.choiceId === choice.id
                                      ? null
                                      : { optId: opt.id, choiceId: choice.id }
                                  )
                                }
                                className="cursor-pointer relative flex items-center focus:outline-none"
                                title="Click round color to pick or change shade"
                              >
                                <span
                                  className="w-4 h-4 rounded-full border border-neutral-300 block shadow-2xs shrink-0 hover:scale-115 transition-transform"
                                  style={{ backgroundColor: choice.hex }}
                                />
                              </button>

                              {/* On-Page Palette Popover for Existing Choice */}
                              {editingChoiceHexId?.choiceId === choice.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setEditingChoiceHexId(null)}
                                  />
                                  <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-[#D5D5ED] shadow-2xl rounded-[6px] z-50 w-64 space-y-2 font-poppins text-xs">
                                    <div className="flex justify-between items-center pb-1 border-b border-[#E7E7E7]">
                                      <span className="text-[10px] font-bold text-black uppercase">
                                        Change "{choice.name}" Shade
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingChoiceHexId(null)}
                                        className="text-[#888888] hover:text-black p-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {FASHION_PALETTE_COLORS.map((c) => (
                                        <button
                                          key={c.name}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateChoiceHex(opt.id, choice.id, c.hex);
                                            setEditingChoiceHexId(null);
                                          }}
                                          title={`${c.name} (${c.hex})`}
                                          className="p-1 flex flex-col items-center hover:bg-neutral-100 rounded transition-colors"
                                        >
                                          <span
                                            className="w-4 h-4 rounded-full block border border-black/10 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: c.hex }}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          <span className="text-black font-semibold">{choice.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveChoice(opt.id, choice.id)}
                            className="text-[#888888] hover:text-black ml-0.5"
                            title="Remove choice"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Inline Option to Add New Colours / Choices directly to this pallet (Issue 1) */}
                    <div className="pt-2.5 border-t border-[#E7E7E7]/60 flex items-center gap-2 flex-wrap relative">
                      <span className="text-[11px] font-semibold text-[#666666]">
                        {opt.type === 'color' ? '+ Add to Colour Pallet:' : '+ Add Choice:'}
                      </span>

                      {opt.type === 'color' ? (
                        <div className="flex items-center gap-2 relative">
                          {/* Round Color Swatch Button (Opens On-Page Palette Popover) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsColorPaletteOpen(!isColorPaletteOpen)}
                              className="flex items-center justify-center p-0.5 rounded-full border border-neutral-400 bg-white hover:border-[#3F3F8F] shadow-xs hover:scale-105 transition-transform"
                              title="Click to open Colour Palette"
                            >
                              <span
                                className="w-5 h-5 rounded-full block shadow-inner"
                                style={{ backgroundColor: quickColorHex }}
                              />
                            </button>

                            {/* Dedicated On-Page Color Palette Dropdown Popover */}
                            {isColorPaletteOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setIsColorPaletteOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 p-3.5 bg-white border border-[#D5D5ED] shadow-2xl rounded-[6px] z-50 w-72 space-y-3 font-poppins text-xs">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-[#E7E7E7]">
                                    <span className="text-[11px] font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                                      <Palette className="w-3.5 h-3.5 text-[#3F3F8F]" />
                                      <span>COLOUR PALETTE</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIsColorPaletteOpen(false)}
                                      className="text-[#888888] hover:text-black p-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div>
                                    <div className="text-[10px] text-[#666666] font-medium mb-1.5">
                                      Click a shade to set round color and name:
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {FASHION_PALETTE_COLORS.map((c) => (
                                        <button
                                          key={c.name}
                                          type="button"
                                          onClick={() => {
                                            setQuickColorHex(c.hex);
                                            setQuickColorInput(c.name);
                                            setIsColorPaletteOpen(false);
                                          }}
                                          title={`${c.name} (${c.hex})`}
                                          className={`group flex flex-col items-center p-1 rounded hover:bg-[#F8F8F8] transition-all ${
                                            quickColorHex.toLowerCase() === c.hex.toLowerCase()
                                              ? 'bg-[#EEEEF8] ring-1 ring-[#3F3F8F]'
                                              : ''
                                          }`}
                                        >
                                          <span
                                            className="w-5 h-5 rounded-full border border-black/10 shadow-xs block group-hover:scale-115 transition-transform"
                                            style={{ backgroundColor: c.hex }}
                                          />
                                          <span className="text-[8px] text-[#555555] font-medium truncate w-full text-center mt-1">
                                            {c.name.split(' ')[0]}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom Hex Code Bar */}
                                  <div className="pt-2 border-t border-[#E7E7E7] space-y-1.5">
                                    <div className="text-[10px] text-[#666666] font-medium">Or enter custom hex:</div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-6 h-6 rounded-full border border-neutral-300 block shrink-0 shadow-inner"
                                        style={{ backgroundColor: quickColorHex }}
                                      />
                                      <input
                                        type="text"
                                        value={quickColorHex}
                                        onChange={(e) => setQuickColorHex(e.target.value)}
                                        className="flex-1 p-1 font-mono text-xs border border-[#E7E7E7] rounded uppercase focus:outline-none focus:border-[#3F3F8F]"
                                        placeholder="#HEX"
                                      />
                                      <label
                                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 border border-[#E7E7E7] rounded text-[10px] font-semibold cursor-pointer relative overflow-hidden"
                                        title="Color wheel"
                                      >
                                        Wheel
                                        <input
                                          type="color"
                                          value={quickColorHex}
                                          onChange={(e) => setQuickColorHex(e.target.value)}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Type color (e.g. Yellow, Green, Pink)..."
                            value={quickColorInput}
                            onChange={(e) => {
                              setQuickColorInput(e.target.value);
                              const detected = detectHexForColor(e.target.value);
                              if (detected !== '#10B981') setQuickColorHex(detected);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddChoice(opt.id, quickColorInput, quickColorHex);
                              }
                            }}
                            className="p-1.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs w-52 focus:outline-none focus:border-[#3F3F8F]"
                          />

                          <button
                            type="button"
                            onClick={() => handleQuickAddChoice(opt.id, quickColorInput, quickColorHex)}
                            className="px-3 py-1.5 bg-[#3F3F8F] hover:bg-[#343476] text-white rounded-[4px] text-xs font-semibold shadow-2xs transition-colors"
                          >
                            + Add Color
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type size (e.g. XL, XXL)..."
                            value={quickTextInput}
                            onChange={(e) => setQuickTextInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddChoice(opt.id, quickTextInput);
                              }
                            }}
                            className="p-1.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs w-44 focus:outline-none focus:border-[#3F3F8F]"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAddChoice(opt.id, quickTextInput)}
                            className="px-3 py-1.5 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] text-xs font-semibold transition-colors"
                          >
                            + Add Choice
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Generated Variants Table with Color-Specific Image Mapping */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                      VARIANT MATRIX ({variants.length} COMBINATIONS)
                    </h4>
                    <p className="text-[11px] text-[#666666]">
                      Click the image icon to map a color-specific photo to each variant.
                    </p>
                  </div>

                  {/* Bulk Actions Bar */}
                  {selectedVariantIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-[#EEEEF8] px-3 py-1.5 rounded-[4px] text-xs">
                      <span className="font-bold text-[#3F3F8F]">
                        {selectedVariantIds.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const p = prompt('Enter new selling price (₹) for selected variants:', `${basePrice}`);
                          if (p && !isNaN(Number(p))) handleBulkSetPrice(Number(p));
                        }}
                        className="px-2 py-0.5 bg-white rounded border border-[#3F3F8F]/30 text-[#3F3F8F] font-semibold hover:bg-[#3F3F8F] hover:text-white transition-colors"
                      >
                        Set Price
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = prompt('Enter new stock quantity for selected variants:', '25');
                          if (s && !isNaN(Number(s))) handleBulkSetStock(Number(s));
                        }}
                        className="px-2 py-0.5 bg-white rounded border border-[#3F3F8F]/30 text-[#3F3F8F] font-semibold hover:bg-[#3F3F8F] hover:text-white transition-colors"
                      >
                        Set Stock
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                      <tr>
                        <th className="p-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedVariantIds.length === variants.length && variants.length > 0}
                            onChange={handleSelectAllVariants}
                            className="accent-[#3F3F8F] cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Color Image</th>
                        <th className="p-3">Variant Title</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Price (₹)</th>
                        <th className="p-3">Stock on Hand</th>
                        <th className="p-3">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {variants.map((v) => (
                        <tr key={v.id} className="hover:bg-[#FAFAFA]">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedVariantIds.includes(v.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVariantIds([...selectedVariantIds, v.id]);
                                } else {
                                  setSelectedVariantIds(selectedVariantIds.filter((id) => id !== v.id));
                                }
                              }}
                              className="accent-[#3F3F8F] cursor-pointer"
                            />
                          </td>

                          {/* Color Specific Image Trigger (Feature 2) */}
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setActiveImagePickerVariantId(v.id)}
                              className="w-10 h-12 rounded border border-[#E7E7E7] bg-white overflow-hidden flex items-center justify-center hover:border-[#3F3F8F] transition-colors relative group"
                              title="Assign variant photo"
                            >
                              {v.color_image_url ? (
                                <img src={v.color_image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-neutral-400 group-hover:text-[#3F3F8F]" />
                              )}
                            </button>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {v.color_hex && (
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                                  style={{ backgroundColor: v.color_hex }}
                                />
                              )}
                              <span className="font-semibold text-black">{v.title}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => handleUpdateVariant(v.id, 'sku', e.target.value)}
                              className="w-36 p-1 border border-[#E7E7E7] rounded font-mono text-[11px] focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              value={v.price}
                              onChange={(e) => handleUpdateVariant(v.id, 'price', Number(e.target.value))}
                              className="w-24 p-1 border border-[#E7E7E7] rounded font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              value={v.stock_quantity}
                              onChange={(e) =>
                                handleUpdateVariant(v.id, 'stock_quantity', Number(e.target.value))
                              }
                              className="w-20 p-1 border border-[#E7E7E7] rounded font-mono text-xs font-medium focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              value={v.barcode || ''}
                              onChange={(e) => handleUpdateVariant(v.id, 'barcode', e.target.value)}
                              className="w-32 p-1 border border-[#E7E7E7] rounded font-mono text-[11px] text-[#888888] focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

          {/* Sidebar Settings (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status & Visibility */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs">
                PUBLISHING STATUS
              </h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer uppercase"
              >
                <option value="active">Active (Available Online)</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived (Unpublished)</option>
              </select>

              <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-[#3F3F8F] w-4 h-4 rounded"
                  />
                  <span>Feature on Homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="accent-[#3F3F8F] w-4 h-4 rounded"
                  />
                  <span>New Arrival Drop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="accent-[#3F3F8F] w-4 h-4 rounded"
                  />
                  <span>Mark as Best Seller</span>
                </label>
              </div>
            </div>

            {/* Pricing & Margins */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#3F3F8F]" />
                <span>PRICING & MARGINS</span>
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Default Selling Price (₹) *
                </label>
                <input
                  required
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Compare At Price (₹)
                </label>
                <input
                  type="number"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Cost per Item (₹)
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="p-3 bg-[#EEEEF8] rounded-[4px] text-[11px] text-[#3F3F8F] font-medium space-y-1">
                <div className="flex justify-between">
                  <span>Gross Profit:</span>
                  <strong>{formatPrice(profitPerItem)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Profit Margin:</span>
                  <strong>{marginPercent}%</strong>
                </div>
              </div>
            </div>

            {/* Department & Organization */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs">
                ORGANIZATION
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Category (Department Registry)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Product Type
                </label>
                <select
                  value={isAddingNewType ? '__add_new__' : productType}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingNewType(true);
                    } else {
                      setIsAddingNewType(false);
                      setProductType(e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer font-medium"
                >
                  {productTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option disabled value="divider">──────────</option>
                  <option value="__add_new__" className="font-semibold text-[#3F3F8F]">
                    + Add new product type...
                  </option>
                </select>

                {/* Inline Creation for New Product Type (User Request 2) */}
                {isAddingNewType && (
                  <div className="mt-2 p-3 bg-[#F8F8FC] border border-[#3F3F8F]/30 rounded-[4px] space-y-2 animate-in fade-in duration-150">
                    <label className="block text-[10px] font-bold text-[#3F3F8F] uppercase tracking-wider">
                      Create New Product Type
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        placeholder="E.g. Lehengas, Kurtas, Scarves..."
                        value={newTypeInput}
                        onChange={(e) => setNewTypeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveNewProductType();
                          } else if (e.key === 'Escape') {
                            setIsAddingNewType(false);
                            setNewTypeInput('');
                          }
                        }}
                        className="flex-1 p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewProductType}
                        className="px-3 py-1.5 bg-[#3F3F8F] hover:bg-[#343476] text-white rounded-[4px] text-xs font-semibold shadow-xs"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewType(false);
                          setNewTypeInput('');
                        }}
                        className="px-2.5 py-1.5 border border-[#E7E7E7] text-neutral-600 hover:bg-neutral-100 rounded-[4px] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Department
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer uppercase"
                >
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="pt-2 border-t border-[#E7E7E7]">
                <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                  HSN Tax Code
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* Collections Selection Card (User Request 1) */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-[#3F3F8F]" />
                    <span>COLLECTIONS</span>
                  </h3>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    Choose which collections this product belongs to.
                  </p>
                </div>
                <Link
                  to="/admin/collections"
                  target="_blank"
                  className="text-[10px] text-[#3F3F8F] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <span>Manage</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Selected Collection Badges */}
              {selectedCollectionSlugs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {selectedCollectionSlugs.map((slug) => {
                    const col = availableCollections.find((c) => c.slug === slug);
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] rounded-full text-[11px] font-semibold"
                      >
                        <span>{col?.title || slug}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCollectionSlugs((prev) => prev.filter((s) => s !== slug))
                          }
                          className="hover:text-black ml-0.5"
                          title="Remove from collection"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Collection Search (Filter for ease of use) */}
              {availableCollections.length > 4 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter collections..."
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              )}

              {/* Collection Checkboxes */}
              <div className="max-h-52 overflow-y-auto space-y-1 border border-[#E7E7E7] rounded-[4px] p-2 bg-[#FAFAFA]">
                {availableCollections
                  .filter((col) =>
                    !collectionSearch.trim() ||
                    col.title.toLowerCase().includes(collectionSearch.toLowerCase()) ||
                    col.slug.toLowerCase().includes(collectionSearch.toLowerCase())
                  )
                  .map((col) => {
                    const isChecked = selectedCollectionSlugs.includes(col.slug);
                    return (
                      <label
                        key={col.id || col.slug}
                        className={`flex items-center gap-2.5 p-2 rounded-[3px] cursor-pointer transition-colors select-none text-xs ${
                          isChecked
                            ? 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold'
                            : 'hover:bg-white text-neutral-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCollectionSlugs((prev) => [...prev, col.slug]);
                            } else {
                              setSelectedCollectionSlugs((prev) =>
                                prev.filter((s) => s !== col.slug)
                              );
                            }
                          }}
                          className="accent-[#3F3F8F] w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="flex-1 truncate">{col.title}</span>
                      </label>
                    );
                  })}

                {availableCollections.length === 0 && (
                  <div className="p-3 text-center text-[11px] text-[#888888]">
                    No collections found.{' '}
                    <Link to="/admin/collections" className="text-[#3F3F8F] hover:underline font-semibold">
                      Create Collection
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Similar Products & Categories Card */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
                    <span>SIMILAR PRODUCTS & CATEGORIES</span>
                  </h3>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    Curate recommendations shown under "Similar products" on the product detail page.
                  </p>
                </div>
              </div>

              {/* 1. Curated Similar Products Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-black uppercase">
                    Specific Similar Products ({similarProductIds.length})
                  </label>
                  {similarProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSimilarProductIds([])}
                      className="text-[10px] text-red-600 hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Selected Products List */}
                {similarProductIds.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {similarProductIds.map((pid) => {
                      const prod = allCatalogProducts.find((p) => p.id === pid || p.slug === pid);
                      const thumb = prod?.images?.[0]?.image_url || '/Assets/products/placeholder-product.svg';
                      return (
                        <div
                          key={pid}
                          className="flex items-center justify-between gap-2 p-2 bg-[#F8F8FC] border border-[#E7E7E7] rounded-[4px] text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={thumb}
                              alt={prod?.title || 'Product'}
                              className="w-8 h-8 rounded object-cover border border-[#E7E7E7] bg-white flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-black truncate text-[11px]">
                                {prod?.title || pid}
                              </p>
                              <p className="text-[10px] text-[#666666]">
                                {prod ? formatPrice(prod.base_price) : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSimilarProductIds((prev) => prev.filter((item) => item !== pid))}
                            className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                            title="Remove product"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Search & Add Product */}
                <div className="relative" ref={similarPickerRef}>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search products to add as similar..."
                      value={similarProductSearch}
                      onChange={(e) => {
                        setSimilarProductSearch(e.target.value);
                        setIsSimilarProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsSimilarProductDropdownOpen(true)}
                      className="w-full pl-8 pr-8 py-1.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white"
                    />
                    {similarProductSearch && (
                      <button
                        type="button"
                        onClick={() => setSimilarProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isSimilarProductDropdownOpen && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[#E7E7E7] rounded-[4px] shadow-lg max-h-52 overflow-y-auto divide-y divide-neutral-100">
                      {allCatalogProducts
                        .filter((p) => p.id !== id && !similarProductIds.includes(p.id))
                        .filter((p) =>
                          !similarProductSearch.trim() ||
                          p.title.toLowerCase().includes(similarProductSearch.toLowerCase()) ||
                          p.product_type?.toLowerCase().includes(similarProductSearch.toLowerCase()) ||
                          p.brand?.toLowerCase().includes(similarProductSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((p) => {
                          const thumb = p.images?.[0]?.image_url || '/Assets/products/placeholder-product.svg';
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSimilarProductIds((prev) => [...prev, p.id]);
                                setSimilarProductSearch('');
                                setIsSimilarProductDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2 hover:bg-[#EEEEF8] text-left transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={thumb}
                                  alt={p.title}
                                  className="w-7 h-7 rounded object-cover border border-[#E7E7E7] bg-white flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-black truncate text-[11px]">{p.title}</p>
                                  <p className="text-[10px] text-neutral-500">{p.product_type} · {formatPrice(p.base_price)}</p>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#3F3F8F] font-semibold flex items-center gap-0.5 flex-shrink-0">
                                <Plus className="w-3 h-3" /> Add
                              </span>
                            </button>
                          );
                        })}
                      {allCatalogProducts.filter((p) => p.id !== id && !similarProductIds.includes(p.id)).length === 0 && (
                        <div className="p-3 text-center text-[11px] text-neutral-500">
                          No more products available.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Curated Similar Categories */}
              <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
                <label className="block text-[11px] font-semibold text-black uppercase">
                  Similar Categories ({similarCategoryIds.length})
                </label>
                <p className="text-[10px] text-[#666666]">
                  Products from these categories are recommended if fewer than 4 specific products are curated.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => {
                    const isSelected = similarCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSimilarCategoryIds((prev) => prev.filter((cid) => cid !== cat.id));
                          } else {
                            setSimilarCategoryIds((prev) => [...prev, cat.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3F3F8F] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-[#E7E7E7]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <p className="text-[11px] text-neutral-500">No categories found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Add Product Option Modal (Clean Last Version, Matching Uploaded Screenshots 1 & 2) */}
      <Modal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        title="Add product option"
        maxWidth="md"
      >
        <div className="space-y-5 text-left font-poppins text-xs">
          <p className="text-[#666666] -mt-2 text-xs">
            You'll be able to manage pricing and inventory for this product option later on.{' '}
            <span className="text-[#3F3F8F] hover:underline cursor-pointer">Learn more about options</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: Option Name */}
            <div>
              <label className="flex items-center gap-1 font-semibold text-black uppercase text-[11px] mb-1">
                <span>Type in an option name</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </label>
              <input
                type="text"
                value={modalOptionName}
                onChange={(e) => setModalOptionName(e.target.value)}
                placeholder="e.g. Colour or Size"
                className="w-full p-2.5 border border-[#B5B5DE] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white font-medium"
              />
            </div>

            {/* Field 2: Field Type (Text vs Color) */}
            <div>
              <label className="flex items-center gap-1 font-semibold text-black uppercase text-[11px] mb-1">
                <span>Field type</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F9] rounded-[4px] border border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setModalFieldType('text')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[3px] font-semibold transition-all ${
                    modalFieldType === 'text'
                      ? 'bg-white text-[#3F3F8F] shadow-xs border border-[#3F3F8F]/20'
                      : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalFieldType('color')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[3px] font-semibold transition-all ${
                    modalFieldType === 'color'
                      ? 'bg-white text-[#3F3F8F] shadow-xs border border-[#3F3F8F]/20'
                      : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Color</span>
                </button>
              </div>
            </div>
          </div>

          {/* Field 3: Type in choices for this option */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 font-semibold text-black uppercase text-[11px]">
              <span>Type in choices for this option</span>
              <Info className="w-3.5 h-3.5 text-neutral-400" />
            </label>

            {/* Choice input with tag chips inside */}
            <div className="p-2 border border-[#B5B5DE] rounded-[4px] bg-white flex flex-wrap gap-2 items-center min-h-[44px]">
              {modalChoices.map((choice) => (
                <span
                  key={choice.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF2FF] text-black border border-[#D5D5ED] rounded-[4px] text-xs font-medium"
                >
                  {modalFieldType === 'color' && choice.hex && (
                    <label className="relative cursor-pointer flex items-center" title="Click to adjust color">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-neutral-300 block shadow-2xs"
                        style={{ backgroundColor: choice.hex }}
                      />
                      <input
                        type="color"
                        value={choice.hex}
                        onChange={(e) => {
                          const newHex = e.target.value;
                          setModalChoices((prev) =>
                            prev.map((c) => (c.id === choice.id ? { ...c, hex: newHex } : c))
                          );
                        }}
                        className="sr-only"
                      />
                    </label>
                  )}
                  <span>{choice.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveModalChoice(choice.id)}
                    className="text-[#888888] hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Color picker swatch when adding in Color mode */}
              {modalFieldType === 'color' && (
                <label className="cursor-pointer flex items-center gap-1 bg-[#F8F8F8] px-2 py-1 rounded border border-[#E7E7E7]" title="Pick Color">
                  <span
                    className="w-4 h-4 rounded-full border border-neutral-400 block shadow-2xs"
                    style={{ backgroundColor: modalCurrentHex }}
                  />
                  <input
                    type="color"
                    value={modalCurrentHex}
                    onChange={(e) => setModalCurrentHex(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-[10px] font-mono text-[#666666] uppercase">{modalCurrentHex}</span>
                </label>
              )}

              <input
                type="text"
                placeholder={
                  modalChoices.length === 0
                    ? modalFieldType === 'color'
                      ? 'Separate choices with commas e.g., Red, Blue'
                      : 'Separate choices with commas e.g., Small, Medium, Large,'
                    : 'Add choice and press Enter...'
                }
                value={modalChoiceInput}
                onChange={(e) => {
                  setModalChoiceInput(e.target.value);
                  if (modalFieldType === 'color') {
                    const detected = detectHexForColor(e.target.value);
                    if (detected !== '#10B981') setModalCurrentHex(detected);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddModalChoice();
                  }
                }}
                className="flex-1 min-w-[160px] p-1 text-xs focus:outline-none"
              />

              <button
                type="button"
                onClick={handleAddModalChoice}
                className="px-3 py-1 bg-[#F4F4F9] hover:bg-[#E7E7E7] text-black rounded text-[11px] font-semibold transition-colors"
              >
                + Add
              </button>
            </div>

            <p className="text-[11px] text-[#888888]">
              Press Enter or add a comma after each choice.
            </p>

            {/* Quick Suggestions based on Field Type */}
            {modalFieldType === 'text' && (
              <div className="pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#888888] font-semibold block mb-1">
                  Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SIZE_SUGGESTIONS.map((sz) => (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => {
                        if (!modalChoices.some((mc) => mc.name === sz)) {
                          setModalChoices([
                            ...modalChoices,
                            { id: `s_${Date.now()}_${sz}`, name: sz },
                          ]);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#F8F8F8] hover:bg-[#EEEEF8] border border-[#E7E7E7] rounded text-[11px] font-semibold text-black transition-colors"
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions (Blue Button like in Screenshot 2) */}
          <div className="pt-4 border-t border-[#E7E7E7] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOptionModalOpen(false)}
              className="px-4 py-2 border border-[#B5B5DE] rounded-[4px] text-xs font-semibold text-[#444444] hover:bg-[#F8F8F8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveOptionFromModal}
              className="px-5 py-2 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-[4px] text-xs font-semibold shadow-xs transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* Variant Specific Image Picker Modal (Feature 2) */}
      {activeImagePickerVariantId && (() => {
        const activeVar = variants.find((v) => v.id === activeImagePickerVariantId);
        return (
          <Modal
            isOpen={true}
            onClose={() => setActiveImagePickerVariantId(null)}
            title={`Assign Image to Variant: ${activeVar?.title || ''}`}
            maxWidth="md"
          >
            <div className="space-y-4 text-left font-poppins text-xs">
              {/* Drag & drop upload for this variant */}
              <div>
                <SingleImageDropzone
                  value=""
                  onChange={(newUrl) => {
                    if (!newUrl) return;
                    const newImg: ProductImage = {
                      id: `img_${Date.now()}`,
                      image_url: newUrl,
                      sort_order: images.length,
                      position: images.length,
                      is_primary: images.length === 0,
                      color_name: activeVar?.color_name || '',
                    };
                    setImages((prev) => [...prev, newImg]);
                    handleAssignVariantImage(activeImagePickerVariantId, newUrl);
                  }}
                  aspectRatio="3/4"
                  label="Drag & Drop New Photo For This Variant"
                  helperText="Drop or browse a new photo directly for this variant. In-browser WebP optimized."
                />
              </div>

              {images.length > 0 && (
                <div className="pt-2 border-t border-[#E7E7E7]">
                  <label className="block text-[11px] font-semibold text-black uppercase tracking-wider mb-2">
                    Or Select From Product Imagery ({images.length})
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                    {images.map((img) => (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => handleAssignVariantImage(activeImagePickerVariantId, img.image_url)}
                        className={`relative aspect-[3/4] rounded border overflow-hidden transition-all group ${
                          activeVar?.color_image_url === img.image_url
                            ? 'border-[#3F3F8F] ring-2 ring-[#3F3F8F]'
                            : 'border-[#E7E7E7] hover:border-[#3F3F8F]'
                        }`}
                      >
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        {img.color_name && (
                          <span className="absolute bottom-1 left-1 right-1 bg-black/75 text-white text-[9px] py-0.5 px-1 rounded truncate">
                            {img.color_name}
                          </span>
                        )}
                        {activeVar?.color_image_url === img.image_url && (
                          <span className="absolute top-1 right-1 bg-[#3F3F8F] text-white text-[8px] font-bold px-1 rounded">
                            CURRENT
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-[#E7E7E7]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveImagePickerVariantId(null)}
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </AdminLayout>
  );
};
