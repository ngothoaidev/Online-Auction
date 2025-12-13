import { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react';

export default function ProductImageGallery({ product, isWatchlisted, onWatchlistToggle, onShare }) {
  const [selectedImage, setSelectedImage] = useState(0);

  const nextImage = () => {
    if (product && product.images) {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images) {
      setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  if (!product) return null;

  return (
    <div className="space-y-6">
      {/* Main Image with Navigation */}
      <div className="relative aspect-square rounded-2xl overflow-hidden border group" style={{ borderColor: 'var(--border)' }}>
        <img 
          src={product.images?.[selectedImage] || product.image} 
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Buttons */}
        {product.images && product.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700 shadow-lg"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" style={{ color: 'var(--text)' }} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700 shadow-lg"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" style={{ color: 'var(--text)' }} />
            </button>
            
            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm">
              {selectedImage + 1} / {product.images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Images with Scroll */}
      {product.images && product.images.length > 0 && (
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`flex-shrink-0 aspect-square w-20 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === idx 
                    ? 'border-blue-500 ring-2 ring-blue-200 scale-105' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <img 
                  src={img} 
                  alt={`${product.title} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      )}

      {/* Watchlist and Share */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onWatchlistToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isWatchlisted 
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
          {isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
}
