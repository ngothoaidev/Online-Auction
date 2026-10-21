import { useState, useEffect } from 'react';
import { useFeedback } from '../../components/ui/Feedback.jsx';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth
import { useNav } from '../../hooks/useNavigate';     // Import Nav
import Comment from './Comment';
import auctionService from '../../services/auctionService';

export default function CommentsSection({ productId }) {
  const { notify } = useFeedback();
  const { user } = useAuth(); 
  const nav = useNav();
  
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. FETCH & CHUẨN HÓA DỮ LIỆU ---
  useEffect(() => {
    const fetchComments = async () => {
        try {
            const data = await auctionService.getComments(productId);
            // Để tránh lỗi nếu <Comment> component mong đợi 'user' là string
            const formattedData = Array.isArray(data) ? data.map(c => ({
                ...c,
                // Ưu tiên hiển thị Tên đầy đủ -> Username -> 'Unknown'
                user: c.user?.fullName || c.user?.username || c.user || 'User',
                // Đảm bảo avatar luôn có giá trị
                avatar: c.user?.avatarUrl || c.avatar || 'https://ui-avatars.com/api/?name=User',
                // Backend trả về 'content', 
                text: c.content || c.text,
                content: c.content || c.text,
                // Đảm bảo có mảng replies
                replies: c.children || c.replies || [] 
            })) : [];

            setComments(formattedData);
        } catch (err) {
            console.error("Error fetching comments:", err);
        } finally {
            setLoading(false);
        }
    };
    
    if (productId) fetchComments();
  }, [productId]);

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
      // Gọi API thật
      const newComment = await auctionService.addComment(productId, commentText);
      
      // Chuẩn hóa object trả về ngay lập tức để UI không bị lỗi
      const formattedComment = {
        ...newComment,
        user: user.fullName || user.username, // Dùng info của user hiện tại
        avatar: user.avatarUrl || 'https://ui-avatars.com/api/?name=Me',
        text: newComment.content,
        content: newComment.content,
        replies: []
      };

      setComments(prev => [formattedComment, ...prev]); 
      setCommentText('');
    } catch (error) {
      notify('Failed to post comment. Please try again.', 'error');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- 3. TRẢ LỜI COMMENT (REPLY) ---
  const handleReply = async (parentId, replyText) => {
    if (!user) {
        if(window.confirm("Please login to reply")) {
            nav.login();
        }
        return;
    }

    try {
        const newReply = await auctionService.addComment(productId, replyText, parentId);
        
        const formattedReply = {
            ...newReply,
            user: user.fullName || user.username,
            avatar: user.avatarUrl,
            text: newReply.content,
            content: newReply.content
        };

        // Cập nhật UI lồng nhau
        setComments(prevComments => 
            prevComments.map(c => 
                c.id === parentId 
                ? { ...c, replies: [...(c.replies || c.children || []), formattedReply] } 
                : c
            )
        );
    } catch (error) {
        notify("Failed to reply. Please try again.", 'error');
    }
  };

  if (loading) return <div className="h-40 bg-gray-100 animate-pulse rounded-xl mt-8"></div>;

  return (
    <div className="bg-[var(--bg-soft)] rounded-2xl p-8 border border-[var(--border)] shadow-sm mt-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text)]">
        <MessageSquare size={20} className="text-[var(--accent)]" />
        Q&A / Comments ({comments.length})
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
        {comments && comments.length > 0 ? (
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