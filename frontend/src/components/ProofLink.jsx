import { useState } from 'react';
import orderService from '../services/orderService';

// Proofs are private: the browser cannot load them with a plain <a href>/<img src> (no Authorization header),
// so fetch with the session token and open the resulting blob.
export default function ProofLink({ path, children }) {
  const [busy, setBusy] = useState(false);
  if (!path) return <span className="text-(--text-muted)">Not provided</span>;

  const open = async () => {
    setBusy(true);
    try {
      const url = await orderService.fetchProofBlobUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      alert(err.message || 'Could not open the file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={open} disabled={busy} className="text-blue-500 hover:underline disabled:opacity-60">
      {busy ? 'Opening…' : children}
    </button>
  );
}
