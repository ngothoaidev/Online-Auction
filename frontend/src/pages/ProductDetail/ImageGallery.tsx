import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import auctionService from '../../services/auctionService';
import { Button, IconButton, Skeleton } from '../../components/ui';
import { loadStatus } from '../../services/queries';

type GalleryImage = { id?: number; imageUrl: string; isPrimary?: boolean | null };

export default function ImageGallery({ productId, title = 'Lot' }: { productId: number | string; title?: string }) {
  const [selected, setSelected] = useState(0);
  const query = useQuery({ queryKey: ['auction', String(productId), 'images'], queryFn: () => auctionService.getImages(productId) });
  const images: GalleryImage[] = Array.isArray(query.data) ? query.data : [];

  const status = loadStatus(query);

  if (status === 'loading') return <div className="space-y-3"><Skeleton className="aspect-square w-full" /><Skeleton className="h-[72px] w-64" /></div>; // same height as the loaded gallery
  if (status === 'error') return (
    <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-(--line) bg-(--surface-sunken) text-(--muted)">
      <p>Photos could not be loaded</p>
      <Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>
    </div>
  );
  if (!images.length) return <div className="flex aspect-square items-center justify-center rounded-(--radius-card) border border-(--line) bg-(--surface-sunken) text-(--muted)">No images</div>;

  const step = (d: number) => setSelected((i) => (i + d + images.length) % images.length);

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
