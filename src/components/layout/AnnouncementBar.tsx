import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const announcements = [
  { text: 'COMPLIMENTARY SHIPPING ON ALL ORDERS ABOVE ₹1,999', link: '/collections/all' },
  { text: 'SPRING / SUMMER 2026 EDITORIAL COLLECTION NOW LIVE', link: '/collections/new-arrivals' },
  { text: 'ENJOY 10% OFF YOUR FIRST ORDER | USE CODE: TANOAH10', link: '/collections/sale' },
];

export const AnnouncementBar: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = announcements[currentIndex];

  return (
    <div className="bg-[#3F3F8F] text-white text-[11px] font-poppins tracking-widest py-2 px-4 select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-4 text-white/70 text-[10px]">
          <span>EST. 2026</span>
          <span>•</span>
          <span>HAUTE COUTURE & PRÊT-À-PORTER</span>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <Link
            to={current.link}
            className="inline-flex items-center gap-2 hover:underline transition-opacity duration-300 uppercase font-medium text-center"
          >
            <span>{current.text}</span>
            <ChevronRight className="w-3 h-3 opacity-80" />
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-4 text-white/80 text-[10px]">
          <span>INDIA (INR ₹)</span>
          <span>•</span>
          <Link to="/pages/contact" className="hover:text-white">HELP</Link>
        </div>
      </div>
    </div>
  );
};
