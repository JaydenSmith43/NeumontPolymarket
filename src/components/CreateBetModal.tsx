import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface CreateBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBetCreated: () => void;
}

export default function CreateBetModal({ 
  isOpen, 
  onClose,
  onBetCreated 
}: CreateBetModalProps) {
  const [headline, setHeadline] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be signed in to create a bet");
      return;
    }
    
    if (!headline.trim()) {
      setError("Please enter a headline for the bet");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Calculate expiration date (default 7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      console.log('Creating bet with payload:', {
        headline: headline.trim(),
        yes_votes: 0,
        no_votes: 0,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      });

      // Create the bet
      const { data, error: insertError } = await supabase
        .from('bets')
        .insert({
          headline: headline.trim(),
          yes_votes: 0,
          no_votes: 0,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        })
        .select()
        .single();

      console.log('Insert response:', { data, insertError });
      
      if (insertError) {
        throw insertError;
      }
      
      // Reset the form
      setHeadline('');
      setExpiresInDays(7);
      
      // Call the callback to refresh the bets list
      onBetCreated();
      
      // Close the modal
      onClose();
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating bet:', error);
      setError(error.message || 'Failed to create bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 px-4">
      <div 
        className="bg-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full p-6 border border-[#f1c40f]/30"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Create New Bet</h2>
          <button 
            onClick={onClose}
            className="text-[#f5f5f5]/60 hover:text-[#f5f5f5] transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-[#f5f5f5] mb-1">
              Bet Headline
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
              placeholder="Enter a question for the bet"
              className="w-full px-3 py-2 bg-[#333333] border border-[#f1c40f]/30 rounded-md text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="expiresIn" className="block text-sm font-medium text-[#f5f5f5] mb-1">
              Expires in (days)
            </label>
            <input
              id="expiresIn"
              type="number"
              min="1"
              max="30"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-[#333333] border border-[#f1c40f]/30 rounded-md text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 focus:border-transparent"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-200">
              {error}
            </div>
          )}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !headline.trim()}
              className="w-full py-2 px-4 bg-[#f1c40f] text-[#222222] rounded font-medium hover:bg-[#f1c40f]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}