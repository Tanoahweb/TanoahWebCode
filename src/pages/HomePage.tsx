import React from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { FeaturedCollections } from '../components/home/FeaturedCollections';
import { NewArrivalsSection } from '../components/home/NewArrivalsSection';
import { EditorialLookbookSection } from '../components/home/EditorialLookbookSection';
import { WomenAtelierScrollSection } from '../components/home/WomenAtelierScrollSection';
import { CustomerReviewsSection } from '../components/home/CustomerReviewsSection';
import { SEOHead } from '../components/common/SEOHead';
import { generateOrganizationJsonLd } from '../services/seoEngine';

export const HomePage: React.FC = () => {
  const homeJsonLd = [
    generateOrganizationJsonLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TANOAH',
      url: 'https://tanoah.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://tanoah.com/collections/all?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <div className="w-full">
      <SEOHead
        title="TANOAH | Luxury Women's Clothing & Handcrafted Couture"
        description="Discover TANOAH — Luxury handcrafted women’s clothing, designer kurtas, festive ensembles, and contemporary silhouettes tailored in Thrissur, Kerala."
        canonical="https://tanoah.com"
        type="website"
        jsonLd={homeJsonLd}
      />
      <HeroSlider />
      <FeaturedCollections />
      <EditorialLookbookSection />
      <NewArrivalsSection />
      <WomenAtelierScrollSection />
      <CustomerReviewsSection />
    </div>
  );
};

