import { useState, useEffect, lazy, Suspense } from 'react';
import { useFeedback } from '../../components/ui/Feedback.jsx';
import SafeHtml from '../../components/SafeHtml.jsx';
import { Button, EmptyState } from '../../components/ui';
import { FileText, Pencil, Save, X } from 'lucide-react';
import auctionService from '../../services/auctionService';
const RichTextEditor = lazy(() => import('../../components/RichTextEditor')); // editor code loads only for the owner, on edit

export default function Description({ productId, isOwner = false }) {
  const { notify } = useFeedback();
  const [content, setContent] = useState("");
  const [newContent, setNewContent] = useState(""); // Only for NEW additions
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Format date as D/M/YYYY
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // Fetch dữ liệu thật từ Backend
  useEffect(() => {
    let cancelled = false;
    const fetchDesc = async () => {
        setLoading(true);
        setFailed(false);
        try {
            const data = await auctionService.getDescription(productId);
            if (!cancelled) setContent(data?.description || "<p>No description provided for this item.</p>");
        } catch (err) {
            console.error("Error fetching description:", err);
            if (!cancelled) setFailed(true); // and no Edit: saving now would replace the real description
        } finally {
            if (!cancelled) setLoading(false);
        }
    };
    if (productId) fetchDesc();
    return () => { cancelled = true; };
  }, [productId, attempt]);

  const handleEditButton = () => {
    setNewContent(""); // Start with empty editor for new content
    setIsEditing(true);
  };

  const handleCancel = () => {
    setNewContent("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!newContent.trim() || newContent === "<p></p>") {
      notify("Please enter some content before saving.", 'error');
      return;
    }
    
    setSaving(true);
    try {
      // Prepend new content with timestamp to existing content
      const timestamp = `<p><strong> ${formatDate(new Date())}</strong></p>`;
      const updatedContent = `${timestamp}${newContent}<hr style="margin: 1.5em 0; border-color: var(--border);" />${content}`;
      
      await auctionService.updateDescription(productId, updatedContent);
      setContent(updatedContent);
      setNewContent("");
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving description:", err);
      notify("Failed to save description. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 bg-(--surface-sunken) animate-pulse rounded-2xl"></div>;

  return (
    <div className="bg-[var(--bg-soft)] rounded-2xl p-8 border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text)]">
            <FileText className="text-[var(--accent)]" />
            Description
        </h2>
        
        {/* Edit Button - Only visible for auction owner */}
        {isOwner && !isEditing && !failed && (
          <button
            onClick={handleEditButton}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
            Edit
          </button>
        )}
        
        {/* Save/Cancel Buttons - Only visible when editing */}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-(--muted) hover:bg-(--surface-hover) rounded-lg transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-(--ink) text-(--on-ink) hover:opacity-90 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Edit Mode - Add new content */}
      {isEditing && (
        <div className="space-y-4">
          <div className="p-3 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
            <p className="text-sm text-[var(--accent)] font-medium">
              ✏️ Adding new update for {formatDate(new Date())}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Write your new content below. Previous content will be preserved.
            </p>
          </div>
          
          <Suspense fallback={<p className="text-sm text-(--muted)">Loading editor…</p>}>
            <RichTextEditor
              label="New description update"
              value={newContent}
              onChange={setNewContent}
            />
          </Suspense>
          
          {/* Preview of existing content */}
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--text-muted)] mb-3">📜 Previous content (read-only):</p>
            <div className="prose-custom opacity-60 max-h-48 overflow-y-auto p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
              <SafeHtml html={content} />
            </div>
          </div>
        </div>
      )}

      {failed && (
        <EmptyState title="The description could not be loaded" action={<Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
      )}

      {/* View Mode */}
      {!isEditing && !failed && (
        <div className="prose-custom">
            <SafeHtml className="text-[var(--text-muted)]" html={content} />
        </div>
      )}

      <style>{`
        .prose-custom {
          max-width: none;
          line-height: 1.75;
        }
        .prose-custom h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin-top: 1.5em;
          margin-bottom: 0.75rem;
          color: var(--text);
        }
        .prose-custom h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 1.25em;
          margin-bottom: 0.5rem;
          color: var(--text);
        }
        .prose-custom p {
          margin-bottom: 1rem;
          color: var(--text-muted);
        }
        .prose-custom strong {
          font-weight: 700;
          color: var(--text); /* Hoặc var(--accent) nếu muốn nổi bật */
        }
        .prose-custom ul {
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          list-style-type: disc;
          padding-left: 1.5rem;
          color: var(--text-muted);
        }
        .prose-custom li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}