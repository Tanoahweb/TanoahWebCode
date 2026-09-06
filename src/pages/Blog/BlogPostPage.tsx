import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Share2, Tag, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { BlogArticle } from '@/types/seo';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { SEOHead } from '@/components/common/SEOHead';
import { generateBlogPostingJsonLd, DEFAULT_CANONICAL_DOMAIN } from '@/services/seoEngine';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setIsLoading(true);

    api.getBlogArticleBySlug(slug).then((art) => {
      if (isMounted) {
        setArticle(art);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    api.getProducts('active').then((prods) => {
      if (isMounted && prods) {
        setFeaturedProducts(prods.slice(0, 4));
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (!article) return;
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 animate-pulse space-y-6">
        <div className="h-6 bg-neutral-200 rounded w-1/4" />
        <div className="h-10 bg-neutral-200 rounded w-3/4" />
        <div className="aspect-[16/9] bg-neutral-200 rounded" />
        <div className="space-y-3 pt-6">
          <div className="h-4 bg-neutral-200 rounded w-full" />
          <div className="h-4 bg-neutral-200 rounded w-5/6" />
          <div className="h-4 bg-neutral-200 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-wondra text-3xl text-black">Article Not Found</h1>
        <p className="text-sm text-[#666666]">The journal story you are searching for does not exist or has been moved.</p>
        <Link to="/blog" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold pt-4">
          <ArrowLeft className="w-4 h-4" />
          Return to Journal
        </Link>
      </div>
    );
  }

  const articleJsonLd = generateBlogPostingJsonLd(article);

  return (
    <div className="w-full bg-white font-poppins min-h-screen">
      <SEOHead
        title={article.seo_title || `${article.title} | TANOAH Journal`}
        description={article.seo_description || article.excerpt || article.title}
        canonical={`${DEFAULT_CANONICAL_DOMAIN}/blog/${article.slug}`}
        image={article.featured_image || undefined}
        type="article"
        jsonLd={articleJsonLd}
      />

      {/* Breadcrumb Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 text-[11px] text-[#666666] tracking-widest uppercase border-b border-[#E7E7E7]">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-black">Journal</Link>
          <span>/</span>
          <span className="text-[#3F3F8F] font-semibold truncate max-w-xs">{article.title}</span>
        </div>
      </div>

      {/* Main Article Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Article Meta Header */}
        <header className="space-y-4 text-center pb-8 border-b border-[#E7E7E7]">
          <div className="inline-block px-3 py-1 bg-[#F5F5F5] text-[#3F3F8F] text-[10px] uppercase tracking-widest font-semibold rounded-full">
            {article.category}
          </div>

          <h1 className="font-wondra text-3xl sm:text-5xl text-black leading-tight max-w-3xl mx-auto">
            {article.title}
          </h1>

          <div className="flex items-center justify-center gap-4 text-xs text-[#888888] pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.published_at || article.created_at).toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {article.author_name}
            </span>
          </div>
        </header>

        {/* Featured Image */}
        {article.featured_image && (
          <div className="my-8 sm:my-10 rounded-[2px] overflow-hidden border border-[#E7E7E7] bg-neutral-50 aspect-[16/9]">
            <img
              src={article.featured_image}
              alt={article.featured_image_alt || article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Body Content */}
        <div
          className="prose prose-neutral max-w-none text-sm sm:text-base leading-relaxed text-[#333333] space-y-6 pt-4 font-light
                     [&>h2]:font-wondra [&>h2]:text-2xl [&>h2]:text-black [&>h2]:pt-6 [&>h2]:pb-2
                     [&>h3]:font-wondra [&>h3]:text-xl [&>h3]:text-black [&>h3]:pt-4
                     [&>p]:leading-loose
                     [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags & Social Share Bar */}
        <footer className="mt-12 pt-8 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {article.tags && article.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] bg-[#F5F5F5] text-[#555555] px-2.5 py-1 rounded-[2px]"
              >
                <Tag className="w-3 h-3 text-[#888888]" />
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:text-[#3F3F8F] transition-colors border border-[#E7E7E7] px-4 py-2 rounded-[2px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copySuccess ? 'Link Copied!' : 'Share Story'}</span>
            </button>
          </div>
        </footer>

        {/* Content Cluster: Explore Curated Garments */}
        <div className="mt-20 pt-12 border-t border-[#E7E7E7]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#3F3F8F] font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Editorial Recommendations</span>
              </div>
              <h2 className="font-wondra text-2xl text-black">Pieces Mentioned in this Story</h2>
            </div>
            <Link
              to="/collections/all"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-black hover:text-[#3F3F8F]"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </article>
    </div>
  );
};
