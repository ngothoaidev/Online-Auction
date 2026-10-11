import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import auctionService from '../../services/auctionService';
import { IconButton, Skeleton } from '../../components/ui';

export default function ImageGallery({ productId, title = 'Lot' }) {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    auctionService.getImages(productId)
      .then((data) => { if (!cancelled) { setImages(Array.isArray(data) ? data : []); setSelected(0); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) return <Skeleton className="aspect-square w-full" />;
  if (!images.length) return <div className="flex aspect-square items-center justify-center rounded-(--radius-card) border border-(--line) bg-(--surface-sunken) text-(--muted)">No images</div>;

  const step = (d) => setSelected((i) => (i + d + images.length) % images.length);

  return (
    <div className="space-y-3" role="group" aria-roledescription="gallery" aria-label={`${title} photos`}>
      <div className="relative aspect-square overflow-hidden rounded-(--radius-card) border border-(--line) bg-(--surface)">
        <img src={images[selected].imageUrl} alt={`${title}, photo ${selected + 1} of ${images.length}`} className="h-full w-full object-contain" />
        {images.length > 1 && (
          <>
            <IconButton label="Previous photo" onClick={() => step(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-(--surface)/90 shadow"><ChevronLeft size={22} /></IconButton>
            <IconButton label="Next photo" onClick={() => step(1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-(--surface)/90 shadow"><ChevronRight size={22} /></IconButton>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto p-1">
          {images.map((img, idx) => (
            <li key={img.id ?? idx} className="shrink-0">
              <button type="button" aria-label={`Show photo ${idx + 1}`} aria-pressed={selected === idx} onClick={() => setSelected(idx)}
                className={`h-16 w-16 overflow-hidden rounded-(--radius-control) border-2 ${selected === idx ? 'border-(--ink)' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
