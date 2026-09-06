import React, { useEffect, useState } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { FeaturedCollections } from '../components/home/FeaturedCollections';
import { NewArrivalsSection } from '../components/home/NewArrivalsSection';
import { EditorialLookbookSection } from '../components/home/EditorialLookbookSection';
import { WomenAtelierScrollSection } from '../components/home/WomenAtelierScrollSection';
import { CustomerReviewsSection } from '../components/home/CustomerReviewsSection';
import { SAMPLE_PRODUCTS } from '../data/mockData';
import { api } from '../services/api';
import { Product } from '../types';
import { SEOHead } from '../components/common/SEOHead';
import { generateOrganizationJsonLd } from '../services/seoEngine';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = () => {
      api.getProducts().then((data) => {
        if (isMounted && data) {
          setProducts(data);
        }
      });
    };
    fetchProducts();

    const handleUpdate = () => {
      fetchProducts();
    };
    window.addEventListener('tanoah_products_updated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_products_updated', handleUpdate);
    };
  }, []);

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
      <NewArrivalsSection products={products} />
      <WomenAtelierScrollSection />
      <CustomerReviewsSection />
    </div>
  );
};

