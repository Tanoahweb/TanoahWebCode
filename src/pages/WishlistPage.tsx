import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import { useCartStore } from '../store/useCartStore';
import { useUIStore } from '../store/useUIStore';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';

export const WishlistPage: React.FC = () => {
  const { items, clearWishlist } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();
  const { addToast } = useUIStore();

  const handleMoveAllToCart = () => {
    items.forEach((p) => {
      if (p.variants[0]) {
        addToCart(p, p.variants[0], 1);
      }
    });
    clearWishlist();
    addToast({
      type: 'success',
      title: 'Moved to Bag',
      description: 'All wishlist items have been added to your shopping bag.',
    });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center font-poppins">
        <div className="w-20 h-20 bg-[#EEEEF8] text-[#3F3F8F] rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10" />
        </div>
        <h1 className="font-wondra text-4xl text-black">YOUR WISHLIST IS EMPTY</h1>
        <p className="text-xs text-[#666666] max-w-sm mx-auto mt-2 mb-8">
          Save your favourite pieces to curate your bespoke wardrobe wishlist.
        </p>
        <Link to="/collections/all">
          <Button variant="primary" size="lg">
            EXPLORE COLLECTIONS
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-white font-poppins min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E7E7E7] mb-10 gap-4">
          <div>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black">
              SAVED SILHOUETTES ({items.length})
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              Pieces saved for your upcoming seasonal curation.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={clearWishlist}
            >
              CLEAR ALL
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleMoveAllToCart}
              icon={<ShoppingBag className="w-4 h-4" />}
            >
              MOVE ALL TO BAG
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};
