import { useState } from 'react';
import ImageUploadModal from '../../components/ImageUploadModal';
import { useFeedback } from '../../components/ui/Feedback';
import orderService from '../../services/orderService';
import type { ApiError } from '../../services/apiClient';
import { fieldLabel } from './parts';

export type Proof = { assetId: string; preview: string };

/**
 * Receipt / shipping-invoice picker. The file is uploaded privately, bound to this order and purpose; only the returned
 * asset id is ever sent back to the API. `preview` is a local blob URL of the selected file.
 */
export default function ProofField({ orderId, purpose, label, value, onChange }: {
  orderId: number; purpose: 'payment' | 'shipping'; label: string; value: Proof; onChange: (proof: Proof) => void;
}) {
  const { notify } = useFeedback();
  const [open, setOpen] = useState(false);
  const title = purpose === 'payment' ? 'Upload Payment Proof' : 'Upload Shipping Invoice';

  const upload = async (file: File) => {
    try {
      const uploaded = await orderService.uploadProof(orderId, purpose, file);
      onChange({ assetId: uploaded.assetId, preview: URL.createObjectURL(file) });
    } catch (error) {
      notify('Failed to upload image: ' + (error as ApiError).message, 'error');
      throw error;
    }
  };

  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      {value.preview ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-(--border)">
            <img src={value.preview} alt={purpose === 'payment' ? 'Payment proof' : 'Shipping proof'} className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => onChange({ assetId: '', preview: '' })}
              className="absolute top-2 right-2 p-1.5 bg-(--danger) text-(--on-ink) rounded-full hover:opacity-90 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="w-full px-4 py-2 border border-(--border) text-(--text) rounded-xl hover:bg-(--surface-hover) transition">
            Change Image
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-(--border) text-(--text-muted) hover:border-(--accent) hover:bg-(--accent)/5 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {title}
        </button>
      )}
      <ImageUploadModal isOpen={open} onClose={() => setOpen(false)} onUpload={upload} title={title} />
    </div>
  );
}
