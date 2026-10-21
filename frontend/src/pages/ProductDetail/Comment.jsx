import { useState } from 'react';
import { useFeedback } from '../../components/ui/Feedback.jsx';
import { Reply, X } from 'lucide-react';
import { commentSchema } from '../../schemas/auction.schemas';
import { validateForm } from '../../utils/validation';

export default function Comment({ comment, onReplySubmit }) {
  const { notify } = useFeedback();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSubmit = () => {
    // Zod Validation
    const validation = validateForm(commentSchema, { content: replyText });
    
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    
    onReplySubmit(comment.id, validation.data.content);
    setIsReplying(false);
    setReplyText("");
  };

  return (
    <div className="group">
      {/* Parent Comment Display */}
      <div className="flex gap-3">
        <img 
          src={comment.avatar} 
          alt={comment.user}
          className="w-10 h-10 rounded-full border border-(--border)"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* <span className="font-bold text-sm text-(--text)">
              {comment?.user}
            </span>
            <span className="text-xs text-(--text-muted)">
              {comment.time}
            </span> 
            */}
          </div>
          <p className="text-sm text-(--text-muted) leading-relaxed mb-2">
            {comment.text}
          </p>
          
          {/* Reply Toggle Button */}
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-xs text-(--accent) font-semibold hover:underline transition-colors"
          >
            <Reply size={12} /> Reply
          </button>
        </div>
      </div>

      {/* Nested Replies Display */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-3 space-y-6 border-l-2 border-(--border) pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <div className="relative">
                 {/* Avatar */}
                 <img 
                  src={reply.avatar} 
                  alt={reply.user}
                  className="w-8 h-8 rounded-full border border-(--border)"
                />
                {/* Owner Badge */}
                {reply.isOwner && (
                    <div className="absolute -bottom-1 -right-1 bg-(--accent) text-[#1a1205] text-[8px] font-black px-1 rounded-sm">
                        OWNER
                    </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-xs" style={{ color: 'var(--text)' }}>
                    {reply.user}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {reply.time}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input Form */}
      {isReplying && (
        <div className="ml-12 mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            aria-label="Write a reply"
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={`Reply to ${comment.user}...`}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-(--accent) focus:border-transparent outline-none"
            style={{ 
              backgroundColor: 'var(--bg)', 
              borderColor: 'var(--border)', 
              color: 'var(--text)' 
            }}
          />
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: '#1A1205' }}
          >
            Reply
          </button>
          <button
            onClick={() => setIsReplying(false)}
            className="p-1.5 rounded-lg text-(--text-muted) border border-(--border) hover:bg-(--bg-hover) transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}