import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { api } from '@/services/api';
import { BlogArticle } from '@/types/seo';
import { SEOHead } from '@/components/common/SEOHead';
import { DEFAULT_CANONICAL_DOMAIN } from '@/services/seoEngine';

export const BlogListPage: React.FC = () => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    api.getBlogArticles(false).then((data) => {
      if (isMounted) {
        setArticles(data || []);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['all', ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))];

  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter((a) => a.category === selectedCategory);

  const blogListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'TANOAH Fashion Journal',
    description: 'Editorial insights, craftsmanship stories, and styling guides from the TANOAH Atelier.',
    url: `${DEFAULT_CANONICAL_DOMAIN}/blog`,
    blogPost: articles.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      url: `${DEFAULT_CANONICAL_DOMAIN}/blog/${a.slug}`,
      datePublished: a.published_at,
    })),
  };

  return (
    <div className="w-full bg-white font-poppins min-h-screen">
      <SEOHead
        title="Fashion Journal & Styling Stories | TANOAH"
        description="Explore the TANOAH Fashion Journal. Editorial stories on handcrafted luxury, artisanal textiles, celebration styling guides, and Kerala couture."
        canonical={`${DEFAULT_CANONICAL_DOMAIN}/blog`}
        type="website"
        jsonLd={blogListJsonLd}
      />

      {/* Editorial Header */}
      <div className="relative bg-[#F9F9F9] border-b border-[#E7E7E7] py-16 sm:py-24 text-center px-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest text-[#3F3F8F] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The TANOAH Journal</span>
          </div>
          <h1 className="font-wondra text-3xl sm:text-5xl lg:text-6xl text-black uppercase tracking-tight">
            Craftsmanship &amp; Style
          </h1>
          <p className="text-xs sm:text-sm text-[#666666] max-w-xl mx-auto font-light leading-relaxed">
            Delve into stories of artisanal luxury, enduring textile traditions from Thrissur, and curated styling guides for modern celebrations.
          </p>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 2 && (
          <div className="flex justify-center gap-2 mt-8 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? 'bg-black text-white'
                    : 'bg-white text-[#666666] border border-[#E7E7E7] hover:border-black'
                }`}
              >
                {cat === 'all' ? 'All Stories' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-[#666666] tracking-widest uppercase border-b border-[#E7E7E7]">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <span className="text-[#3F3F8F] font-semibold">Editorial Journal</span>
        </div>
      </div>

      {/* Article Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-[16/10] bg-neutral-200 rounded-[2px]" />
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                <div className="h-3 bg-neutral-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-12 h-12 text-[#999999] mx-auto" />
            <p className="text-sm text-[#666666]">New journal entries are currently being crafted.</p>
            <Link to="/collections/all" className="inline-block text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold underline underline-offset-4">
              Explore Our Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                className="group flex flex-col bg-white border border-[#E7E7E7] rounded-[2px] overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <Link to={`/blog/${article.slug}`} className="relative aspect-[16/10] overflow-hidden bg-neutral-100 block">
                  <img
                    src={article.featured_image || '/Assets/hero/hero-landscape.jpg'}
                    alt={article.featured_image_alt || article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold text-[#3F3F8F]">
                    {article.category}
                  </div>
                </Link>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-[11px] text-[#888888]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.published_at || article.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {article.author_name}
                      </span>
                    </div>

                    <h2 className="font-wondra text-lg sm:text-xl text-black leading-snug group-hover:text-[#3F3F8F] transition-colors">
                      <Link to={`/blog/${article.slug}`}>{article.title}</Link>
                    </h2>

                    <p className="text-xs text-[#666666] line-clamp-3 leading-relaxed font-light">
                      {article.excerpt || article.seo_description || 'Read the full article.'}
                    </p>
                  </div>

                  <Link
                    to={`/blog/${article.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-black uppercase tracking-wider group-hover:text-[#3F3F8F] pt-2"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
