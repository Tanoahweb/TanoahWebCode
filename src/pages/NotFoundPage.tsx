import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, ArrowRight, Sparkles, Compass, Package, Phone } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/collections/all?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const curatedCollections = [
    { title: 'All Silhouettes', link: '/collections/all', desc: 'Browse the complete Tanoah catalog' },
    { title: 'Signature Linen', link: '/collections/linen', desc: 'Breathable, pure European linen cuts' },
    { title: 'Lookbook Gallery', link: '/lookbook', desc: 'Editorial campaign and styling gallery' },
    { title: 'Track Your Order', link: '/tracking', desc: 'Real-time order status and dispatch updates' },
  ];

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-[80vh] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-2xl mx-auto w-full text-center space-y-8">
        {/* Brand Tag */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TANOAH • STATUS 404</span>
          </span>
        </div>

        {/* Big 404 Title */}
        <div className="space-y-2">
          <div className="font-wondra text-7xl sm:text-9xl text-black tracking-tight select-none">
            404
          </div>
          <h1 className="font-wondra text-2xl sm:text-4xl text-black uppercase tracking-wide">
            THE SILHOUETTE CANNOT BE FOUND
          </h1>
          <p className="text-xs sm:text-sm text-[#666666] leading-relaxed max-w-lg mx-auto">
            The creation, editorial story, or page you are seeking may have been archived, renamed, or is temporarily sequestered in our private production vault.
          </p>
        </div>

        {/* Quick Search Form */}
        <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Search silhouettes (e.g. linen shirt, kurta, slip dress)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3.5 pl-11 pr-24 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] shadow-xs"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white text-[11px] font-semibold tracking-wider uppercase rounded-[2px] hover:bg-[#3F3F8F] transition-colors"
          >
            Search
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-black text-white text-xs tracking-widest uppercase font-semibold hover:bg-[#3F3F8F] transition-colors shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home Salon</span>
          </Link>
          <Link
            to="/collections/all"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white border border-[#E7E7E7] text-black text-xs tracking-widest uppercase font-semibold hover:border-black transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore All Silhouettes</span>
          </Link>
        </div>

        {/* Curated Pathways */}
        <div className="pt-10 border-t border-[#E7E7E7] text-left">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-4 text-center">
            Suggested Collections
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {curatedCollections.map((col, idx) => (
              <Link
                key={idx}
                to={col.link}
                className="group p-4 bg-white border border-[#E7E7E7] rounded-[4px] hover:border-[#3F3F8F] hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-black group-hover:text-[#3F3F8F] transition-colors">
                    {col.title}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {col.desc}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-[#3F3F8F] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
