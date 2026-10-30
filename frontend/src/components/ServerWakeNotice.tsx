import { useEffect, useState } from 'react';
import { API_URL } from '../services/apiClient';

// The demo API runs on a free host that sleeps when idle; the first request can take up to a minute.
// If /health/live has not answered within 3 s, say so instead of leaving a blank page.
export default function ServerWakeNotice() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => { if (!done) setWaking(true); }, 3000);
    const ping = async () => {
      while (!done) {
        try {
          if ((await fetch(`${API_URL}/health/live`)).ok) break;
        } catch { /* still asleep */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
      done = true;
      clearTimeout(timer);
      setWaking(false);
    };
    ping();
    return () => { done = true; clearTimeout(timer); };
  }, []);

  if (!waking) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 border-t border-(--line) bg-(--surface) px-4 py-3 text-center text-sm text-(--ink)">
      Waking up the demo server (free hosting sleeps when idle). This can take up to a minute.
    </div>
  );
}
