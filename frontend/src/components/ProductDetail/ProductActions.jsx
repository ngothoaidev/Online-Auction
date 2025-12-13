import { Heart, Share2 } from 'lucide-react';

export default function ProductActions({ isWatchlisted, onWatchlistToggle, onShare, productTitle }) {
  return (
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
  );
}
