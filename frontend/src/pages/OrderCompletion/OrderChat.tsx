import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeedback } from '../../components/ui/Feedback';
import orderService from '../../services/orderService';
import { chatMessageSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import { formatTimeAgo } from '../../utils/format';
import type { FormEvent } from 'react';
import type { ApiError } from '../../services/apiClient';
import type { OrderMessage } from '../../types/api';

const ChatAvatar = ({ user }: { user?: { avatarUrl?: string | null; username?: string } | null }) => (user?.avatarUrl
  ? <img src={user.avatarUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
  : <span aria-hidden="true" className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-(--surface-sunken) text-xs font-semibold text-(--muted)">{(user?.username ?? '?')[0].toUpperCase()}</span>);

/** Buyer-seller chat for one order. */
export default function OrderChat({ orderId, userId, title }: { orderId: number; userId: number | undefined; title: string }) {
  const { notify } = useFeedback();
  const queryClient = useQueryClient();
  const key = ['order', orderId, 'messages'];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await orderService.getMessages(orderId);
      orderService.markMessagesRead(orderId).catch(() => {});
      return (r.messages || []) as OrderMessage[];
    },
  });
  const messages = data ?? [];
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight; // newest message in view, inside the chat box only
  }, [data]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const validation = validateForm(chatMessageSchema, { message: draft });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    try {
      setSending(true);
      await orderService.sendMessage(orderId, validation.data.message);
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (err) {
      notify((err as ApiError).message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) overflow-hidden sticky top-24">
      <div className="p-4 border-b border-(--border)">
        <h2 className="font-semibold text-(--text)">{title}</h2>
      </div>

      <div ref={box} role="log" aria-label="Messages" className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-(--text-muted) text-sm py-8">No messages yet. Start a conversation!</p>
        ) : messages.map((msg) => {
          const mine = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && <ChatAvatar user={msg.sender} />}
              <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <span className="text-xs text-(--text-muted) mb-1 px-1">{msg.sender?.username || 'Unknown'}</span>
                <div className={`rounded-2xl px-4 py-2 ${mine ? 'bg-(--ink) text-(--on-ink) rounded-br-sm' : 'bg-(--surface-sunken) text-(--text) rounded-bl-sm'}`}>
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${mine ? 'text-(--on-ink) opacity-80' : 'text-(--text-muted)'}`}>{formatTimeAgo(msg.createdAt)}</p>
                </div>
              </div>
              {mine && <ChatAvatar user={msg.sender} />}
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-4 border-t border-(--border)">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="px-4 py-2 bg-(--ink) text-(--on-ink) rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
