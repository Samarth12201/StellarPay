import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Star, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserFeedback {
  id: string;
  address: string;
  feedback: string;
  rating: number | null;
  created_at: string;
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabaseClient = supabase;

    const loadReviews = async () => {
      if (!supabaseClient) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabaseClient
        .from('user_feedback')
        .select('id,address,feedback,rating,created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setReviews((data ?? []) as UserFeedback[]);
      }
      setLoading(false);
    };

    loadReviews();

    if (!supabaseClient) return;
    const channel = supabaseClient
      .channel('live-user-feedback')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_feedback' },
        (payload) => {
          setReviews((current) => [payload.new as UserFeedback, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const averageRating = useMemo(() => {
    const rated = reviews.filter((review) => typeof review.rating === 'number');
    if (rated.length === 0) return null;
    const total = rated.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return (total / rated.length).toFixed(1);
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading user reviews...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        Failed to load reviews: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs font-semibold text-violet-500">Total Reviews</p>
          <p className="mt-1 text-2xl font-bold text-violet-800">{reviews.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-600">Average Rating</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{averageRating ?? '—'}/5</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm font-medium">No feedback submitted yet.</p>
          <p className="text-xs mt-1">User reviews will appear here live.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Wallet className="w-3.5 h-3.5" />
                    <span className="font-mono" title={review.address}>{shortAddress(review.address)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-800">{review.feedback}</p>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                  {review.rating ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                      <Star className="w-3 h-3 fill-current" /> {review.rating}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-400">No rating</span>
                  )}
                  <span className="text-[11px] text-gray-400">{formatDate(review.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
