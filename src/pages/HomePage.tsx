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

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);

  useEffect(() => {
    let isMounted = true;
    api.getProducts().then((data) => {
      if (isMounted && data && data.length > 0) {
        setProducts(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full">
      <HeroSlider />
      <FeaturedCollections />
      <EditorialLookbookSection />
      <NewArrivalsSection products={products} />
      <WomenAtelierScrollSection />
      <CustomerReviewsSection />
    </div>
  );
};
