import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeedback } from '../../components/ui/Feedback';
import orderService from '../../services/orderService';
import { reviewFormSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import { CheckIcon, WaitingNote, card, input, primaryButton } from './parts';
import type { FormEvent } from 'react';
import type { ApiError } from '../../services/apiClient';
import type { OrderView } from '../../types/api';

/** Step 4: each side rates the other once; the order completes when both have. */
export default function ReviewPanel({ order, isBuyer, onChanged }: { order: OrderView; isBuyer: boolean; onChanged: () => Promise<void> }) {
  const { notify } = useFeedback();
  const [form, setForm] = useState({ rating: 1, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const reviewed = isBuyer ? order.buyerReviewSubmitted : order.sellerReviewSubmitted;
  const completed = order.status === 'completed';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validateForm(reviewFormSchema, form);
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    try {
      setSubmitting(true);
      await orderService.submitReview(order.id, validation.data);
      await onChanged();
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const choice = (rating: 1 | -1, icon: string, text: string, tone: 'success' | 'danger') => (
    <button
      type="button"
      aria-pressed={form.rating === rating}
      onClick={() => setForm({ ...form, rating })}
      className={`flex-1 py-4 rounded-xl border-2 transition ${
        form.rating === rating
          ? tone === 'success' ? 'border-(--success) bg-(--success-soft)' : 'border-(--danger) bg-(--danger-soft)'
          : tone === 'success' ? 'border-(--border) hover:border-(--success)' : 'border-(--border) hover:border-(--danger)'
      }`}
    >
      <span aria-hidden="true" className="text-3xl">{icon}</span>
      <p className="text-sm font-medium text-(--text) mt-1">{text}</p>
    </button>
  );

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-(--text) mb-4">{completed ? 'Transaction Completed' : 'Leave a Review'}</h2>
      {completed ? (
        <div className="text-center py-8">
          <div className="bg-(--success-soft) rounded-xl p-6 mb-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-(--success) rounded-full flex items-center justify-center">
                <CheckIcon className="w-10 h-10 text-(--on-ink)" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-(--success) mb-2">Order Completed!</h3>
                <p className="text-(--success)">This transaction has been completed successfully!</p>
                <p className="text-sm text-(--text-muted) mt-2">Both parties have submitted their reviews.</p>
              </div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Homepage
          </Link>
        </div>
      ) : !reviewed ? (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p id="review-rating-label" className="block text-sm font-medium text-(--text) mb-3">Rate the {isBuyer ? 'seller' : 'buyer'}</p>
            <div role="group" aria-labelledby="review-rating-label" className="flex gap-4">
              {choice(1, '👍', 'Positive', 'success')}
              {choice(-1, '👎', 'Negative', 'danger')}
            </div>
          </div>
          <div>
            <label htmlFor="review-comment" className="block text-sm font-medium text-(--text) mb-2">Comment (Optional)</label>
            <textarea
              id="review-comment"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className={input}
              rows={3}
              placeholder="Share your experience..."
            />
          </div>
          <button type="submit" disabled={submitting} className={primaryButton}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      ) : (
        <div className="bg-(--surface-sunken) rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckIcon className="w-5 h-5 text-(--success)" />
            <p className="font-medium text-(--text)">You have submitted your review</p>
          </div>
          <p className="text-(--text-muted) text-sm">Waiting for the other party to complete their review.</p>
        </div>
      )}
    </div>
  );
}
