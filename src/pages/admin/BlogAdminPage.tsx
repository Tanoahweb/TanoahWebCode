import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  Tag,
  Globe,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/store/useUIStore';
import { api } from '@/services/api';
import { BlogArticle } from '@/types/seo';
import { slugify, truncateDescription, DEFAULT_CANONICAL_DOMAIN } from '@/services/seoEngine';

export const BlogAdminPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [authorName, setAuthorName] = useState('TANOAH Editorial Team');
  const [category, setCategory] = useState('Fashion & Styling');
  const [tags, setTags] = useState('Luxury Fashion, Kerala Couture, Styling');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBlogArticles(true);
      setArticles(data || []);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'Could not load blog articles.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenAdd = () => {
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('<p>Write your luxury fashion editorial story here...</p>');
    setFeaturedImage('');
    setFeaturedImageAlt('');
    setAuthorName('TANOAH Editorial Team');
    setCategory('Fashion & Styling');
    setTags('Luxury Fashion, Kerala Couture, Styling');
    setSeoTitle('');
    setSeoDescription('');
    setIsPublished(true);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (article: BlogArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt || '');
    setContent(article.content);
    setFeaturedImage(article.featured_image || '');
    setFeaturedImageAlt(article.featured_image_alt || '');
    setAuthorName(article.author_name);
    setCategory(article.category);
    setTags((article.tags || []).join(', '));
    setSeoTitle(article.seo_title || '');
    setSeoDescription(article.seo_description || '');
    setIsPublished(article.is_published);
    setIsEditorOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingArticle) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Title and URL slug are required.' });
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<BlogArticle> = {
        id: editingArticle?.id,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        content: content.trim(),
        featured_image: featuredImage.trim() || undefined,
        featured_image_alt: featuredImageAlt.trim() || undefined,
        author_name: authorName.trim(),
        category: category.trim(),
        tags: tagsArray,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
        is_published: isPublished,
      };

      const res = await api.saveBlogArticle(payload);
      if (res.success) {
        addToast({
          type: 'success',
          title: editingArticle ? 'Story Updated' : 'Story Published',
          description: `"${payload.title}" saved successfully.`,
        });
        setIsEditorOpen(false);
        fetchArticles();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save article.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this editorial article?')) return;
    const success = await api.deleteBlogArticle(id);
    if (success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      addToast({ type: 'success', title: 'Deleted', description: 'Journal entry removed.' });
    }
  };

  // Google preview computation
  const previewTitle = seoTitle.trim() || `${title || 'Article Title'} | TANOAH Journal`;
  const previewDesc =
    seoDescription.trim() ||
    truncateDescription(excerpt || content || 'Stories of luxury handcrafted fashion from TANOAH.', 155);

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins max-w-6xl pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-[#E7E7E7] gap-3">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              EDITORIAL FASHION JOURNAL
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Publish content clusters, styling guides, and textile craftsmanship stories to boost organic search discovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/blog"
              target="_blank"
              className="px-3 py-2 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold uppercase tracking-wider text-black hover:bg-neutral-50 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Journal</span>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchArticles}
              isLoading={isLoading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              REFRESH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              NEW ARTICLE
            </Button>
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#888888]">Loading journal articles...</div>
          ) : articles.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#888888] space-y-3">
              <BookOpen className="w-8 h-8 text-[#3F3F8F] mx-auto" />
              <p>No articles created yet. Write your first story to start ranking for fashion keywords.</p>
              <Button size="sm" onClick={handleOpenAdd}>
                Create First Story
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[10px] uppercase font-semibold text-[#666666] border-b border-[#E7E7E7]">
                  <tr>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Published Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {articles.map((art) => (
                    <tr key={art.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {art.featured_image ? (
                            <img
                              src={art.featured_image}
                              alt={art.title}
                              className="w-10 h-10 object-cover rounded-[2px] border border-[#E7E7E7]"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-neutral-100 rounded-[2px] flex items-center justify-center text-[#888888]">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-black hover:text-[#3F3F8F]">{art.title}</div>
                            <div className="text-[11px] text-[#888888] font-mono">/blog/{art.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#555555]">
                        <span className="bg-[#F5F5F5] px-2 py-0.5 rounded text-[10px] uppercase font-medium">
                          {art.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#666666]">{art.author_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            art.is_published
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {art.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#666666]">
                        {new Date(art.published_at || art.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/blog/${art.slug}`}
                          target="_blank"
                          className="p-1 text-[#666666] hover:text-[#3F3F8F] inline-block transition-colors"
                          title="View Live"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(art)}
                          className="p-1 text-[#666666] hover:text-[#3F3F8F] transition-colors"
                          title="Edit Article"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(art.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Article"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditorOpen(false)}
          title={editingArticle ? 'Edit Journal Story' : 'Create Fashion Journal Story'}
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Story Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. The Art of Handcrafted Luxury: How We Craft Timeless Ensembles"
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] font-medium text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                URL Slug *
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-[#F5F5F5] border border-r-0 border-[#E7E7E7] rounded-l-[4px] font-mono text-neutral-600">
                  /blog/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="art-of-handcrafted-luxury"
                  className="flex-1 p-2 bg-white border border-[#E7E7E7] rounded-r-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Short Excerpt (Lead Summary)
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A compelling 1-2 sentence teaser for cards and search snippets..."
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            {/* Content (HTML) */}
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Story Content (HTML Supported) *
              </label>
              <textarea
                rows={8}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<p>Write your detailed article content with &lt;h2&gt;, &lt;p&gt;, and &lt;ul&gt; tags...</p>"
                className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            {/* Featured Image URL & Alt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://images.unsplash.com/... or /Assets/..."
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Image Alt Text
                </label>
                <input
                  type="text"
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="Descriptive image caption for Google Images"
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* Author, Category, Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Fashion & Styling"
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Kurtas, Styling, Luxury"
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* SEO Preview & Overrides */}
            <div className="p-4 bg-[#F8F9FA] rounded-[4px] border border-[#DADCE0] space-y-3">
              <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block">
                Google Search Result Preview
              </span>
              <div>
                <div className="text-[11px] text-[#4D5156] font-mono">
                  https://tanoah.com &rsaquo; blog &rsaquo; {slug || 'story-slug'}
                </div>
                <div className="text-[16px] text-[#1A0DAB] font-normal leading-snug">
                  {previewTitle}
                </div>
                <div className="text-[12px] text-[#4D5156] mt-0.5 line-clamp-2">
                  {previewDesc}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                <div>
                  <label className="block text-[10px] font-semibold text-black uppercase mb-0.5">
                    Custom SEO Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Leave empty for auto fallback"
                    className="w-full p-1.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-black uppercase mb-0.5">
                    Custom Meta Description
                  </label>
                  <input
                    type="text"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Leave empty for auto fallback"
                    className="w-full p-1.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Publishing Status Toggle */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#3F3F8F] rounded"
                />
                <span className="font-semibold text-black uppercase text-[11px]">
                  Publish Story Immediately
                </span>
              </label>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSaving}>
                {editingArticle ? 'Update Story' : 'Publish Story'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};
