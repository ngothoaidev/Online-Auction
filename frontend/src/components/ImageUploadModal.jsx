import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Dialog } from './ui';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Pick one image (JPEG/PNG/WebP, up to 5 MB), preview it, confirm. The server re-checks type and size by content. */
export default function ImageUploadModal({ isOpen, onClose, onUpload, title = 'Upload image' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setFile(null); setPreview(null); setError(''); setBusy(false); }
  }, [isOpen]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (f) => {
    setError('');
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError('Choose a JPEG, PNG or WebP image.'); return; }
    if (f.size > MAX_BYTES) { setError('The image is larger than 5 MB.'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onUpload(file);
      onClose();
    } catch (err) {
      setError(err?.message || 'Upload failed. Try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={title} description="JPEG, PNG or WebP, up to 5 MB." pending={busy}>
      <input ref={inputRef} type="file" accept={TYPES.join(',')} className="sr-only" aria-label="Choose image file" onChange={(e) => choose(e.target.files?.[0])} />
      {preview ? (
        <img src={preview} alt="Selected file preview" className="max-h-64 w-full rounded-(--radius-control) border border-(--line) object-contain" />
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-(--radius-control) border-2 border-dashed border-(--input-border) text-(--ink) hover:bg-(--surface-hover)">
          <Upload size={24} aria-hidden="true" /><span className="font-medium">Choose an image</span>
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-(--danger)">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        {preview && <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }} disabled={busy}>Choose another</Button>}
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={confirm} disabled={!file} loading={busy}>{busy ? 'Uploading…' : 'Use this image'}</Button>
      </div>
    </Dialog>
  );
}
