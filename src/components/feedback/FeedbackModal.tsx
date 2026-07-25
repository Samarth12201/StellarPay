import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useWalletStore } from '../../store/walletStore';
import toast from 'react-hot-toast';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

function isValidStellarAddress(value: string | null) {
  return Boolean(value?.startsWith('G') && value.length === 56);
}

export function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { address } = useWalletStore();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    if (!isValidStellarAddress(address)) {
      toast.error('Connect your Stellar wallet before sending feedback.');
      return;
    }
    
    setSubmitting(true);
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const { error } = await supabase.from('user_feedback').insert({
        address,
        feedback: feedback.trim(),
        rating,
      });
      
      if (error) throw error;
      
      trackEvent('feedback_submitted', {
        rating,
        hasWalletAddress: true,
      });
      toast.success('Thank you for your feedback!');
      setFeedback('');
      setRating(null);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Send Feedback</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
            <p className="text-xs font-semibold text-violet-700">Feedback wallet address</p>
            <p className="mt-0.5 truncate font-mono text-xs text-violet-600">
              {address ?? 'Connect wallet to submit feedback'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">How would you rate your experience?</label>
            <div className="flex gap-2 justify-between">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xl transition-all ${
                    rating === num
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200 scale-110'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {['😠', '🙁', '😐', '🙂', '🤩'][num - 1]}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tell us what you think</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What do you like? What can we improve?"
              rows={4}
              className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting || !feedback.trim() || !isValidStellarAddress(address)}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
