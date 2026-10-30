import type { ReactNode } from 'react';
import { useState } from 'react';
import { useFeedback } from './ui/Feedback';
import orderService from '../services/orderService';

// Proofs are private: the browser cannot load them with a plain <a href>/<img src> (no Authorization header),
// so fetch with the session token and open the resulting blob.
export default function ProofLink({ path, children }: { path: string; children: ReactNode }) {
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  if (!path) return <span className="text-(--text-muted)">Not provided</span>;

  const open = async () => {
    setBusy(true);
    try {
      const url = await orderService.fetchProofBlobUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      notify((err as Error).message || 'Could not open the file', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={open} disabled={busy} className="text-(--info) hover:underline disabled:opacity-60">
      {busy ? 'Opening…' : children}
    </button>
  );
}
