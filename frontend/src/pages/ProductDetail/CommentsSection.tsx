import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeedback } from '../../components/ui/Feedback';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth
import { useNav } from '../../hooks/useNavigate';     // Import Nav
import Comment from './Comment';
import auctionService from '../../services/auctionService';
import { Button, EmptyState } from '../../components/ui';
import type { CommentView } from './Comment';

// API rows -> what <Comment> renders: display name, avatar, text and nested replies.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalize = (data: any): CommentView[] => (Array.isArray(data) ? data.map((c) => ({
  ...c,
  user: c.user?.fullName || c.user?.username || c.user || 'User',
  avatar: c.user?.avatarUrl || c.avatar || 'https://ui-avatars.com/api/?name=User',
  text: c.content || c.text,
  content: c.content || c.text,
  replies: c.children || c.replies || [],
})) : []);

export default function CommentsSection({ productId }: { productId: number | string }) {
  const { notify } = useFeedback();
  const { user } = useAuth(); 
  const nav = useNav();
  
  const queryClient = useQueryClient();
  const key = ['auction', String(productId), 'comments'];
  const query = useQuery({ queryKey: key, queryFn: () => auctionService.getComments(productId), select: normalize });
  const comments: CommentView[] = query.data ?? [];
  const loading = query.isPending && !query.isError;
  const failed = query.isError && query.data === undefined;
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 2. GỬI COMMENT MỚI ---
  const handleComment = async () => {
    if (!user) {
        if(window.confirm("Please login to post a comment")) {
            nav.login();
        }
        return;
    }
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await auctionService.addComment(productId, commentText);
      await refresh();
      setCommentText('');
    } catch (error) {
      notify('Failed to post comment. Please try again.', 'error');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- 3. TRẢ LỜI COMMENT (REPLY) ---
  const handleReply = async (parentId: number, replyText: string) => {
    if (!user) {
        if(window.confirm("Please login to reply")) {
            nav.login();
        }
        return;
    }

    try {
        await auctionService.addComment(productId, replyText, parentId);
        await refresh();
    } catch (error) {
        notify("Failed to reply. Please try again.", 'error');
    }
  };

  if (loading) return <div className="h-40 bg-(--surface-sunken) animate-pulse rounded-xl mt-8"></div>;

  return (
    <div className="bg-[var(--bg-soft)] rounded-2xl p-8 border border-[var(--border)] shadow-sm mt-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text)]">
        <MessageSquare size={20} className="text-[var(--accent)]" />
        Q&A / Comments{failed ? '' : ` (${comments.length})`}
      </h3>
      
      {/* INPUT FORM */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          aria-label="Ask a question about this lot"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleComment()}
          placeholder={user ? "Ask a question about this item..." : "Please login to ask a question"}
          disabled={isSubmitting}
          className="min-w-0 flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-(--focus) focus:border-transparent transition-all"
          style={{ 
            backgroundColor: 'var(--bg)', 
            borderColor: 'var(--border)', 
            color: 'var(--text)' 
          }}
        />
        <button
          type="button"
          aria-label="Post question"
          onClick={handleComment}
          disabled={isSubmitting || !commentText.trim()}
          className="min-h-11 px-4 rounded-(--radius-control) bg-(--ink) text-(--on-ink) hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? '...' : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* COMMENTS LIST */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto pb-2 custom-scrollbar">
        {failed ? (
          <EmptyState title="Questions could not be loaded" action={<Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>} />
        ) : comments && comments.length > 0 ? (
          comments.map((commentItem) => (
            <Comment 
              key={commentItem.id || Math.random()} 
              comment={commentItem} 
              onReplySubmit={handleReply}
            />
          ))
        ) : (
          <p className="text-center text-[var(--text-muted)] py-4">No comments yet. Be the first to ask!</p>
        )}
      </div>
    </div>
  );
}