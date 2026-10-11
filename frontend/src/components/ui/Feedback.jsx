/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import Button from './Button.jsx';

const FeedbackContext = createContext({ confirm: async () => true, notify: () => {} });

/**
 * Promise-based replacements for window.confirm / window.alert:
 *   const { confirm, notify } = useFeedback();
 *   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
 *   notify('Saved'); notify('Could not save', 'error');
 * Confirm is a real dialog (focus trap, Escape = cancel); notifications are one polite/assertive live region.
 */
export function FeedbackProvider({ children }) {
  const [ask, setAsk] = useState(null);
  const [note, setNote] = useState(null);
  const resolver = useRef(null);
  const timer = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => { resolver.current = resolve; setAsk(opts); }), []);
  const settle = (value) => { resolver.current?.(value); resolver.current = null; setAsk(null); };

  const notify = useCallback((message, tone = 'info') => {
    clearTimeout(timer.current);
    setNote({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setNote(null), tone === 'error' ? 10000 : 5000);
  }, []);

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Dialog open={Boolean(ask)} onClose={() => settle(false)} title={ask?.title ?? ''} description={ask?.message}>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => settle(false)}>{ask?.cancelLabel ?? 'Cancel'}</Button>
          <Button variant={ask?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>{ask?.confirmLabel ?? 'Confirm'}</Button>
        </div>
      </Dialog>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
        <div role={note?.tone === 'error' ? 'alert' : 'status'} aria-live={note?.tone === 'error' ? 'assertive' : 'polite'}>
          {note && (
            <p className={`pointer-events-auto rounded-(--radius-control) border px-4 py-3 text-sm font-medium shadow-lg ${note.tone === 'error' ? 'border-(--danger) bg-(--danger-soft) text-(--danger)' : 'border-(--line) bg-(--surface) text-(--ink)'}`}>
              {note.message}
              <button type="button" aria-label="Dismiss message" onClick={() => setNote(null)} className="ml-3 underline">Dismiss</button>
            </p>
          )}
        </div>
      </div>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);
