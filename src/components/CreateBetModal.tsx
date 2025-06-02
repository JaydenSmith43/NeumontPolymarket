import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface CreateBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBetCreated: () => void;
}

export default function CreateBetModal({ //test
  isOpen, 
  onClose,
  onBetCreated 
}: CreateBetModalProps) {
  const [headline, setHeadline] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const { user } = useAuth();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

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
      
      // Create the bet
      const { data: bet, error: insertError } = await supabase
        .from('bets')
        .insert({
          headline: headline.trim(),
          yes_votes: 3, // Starting with some minimal votes
          no_votes: 7,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        })
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }

      // Add tags
      if (tags.length > 0 && bet) {
        // First, ensure all tags exist
        const { data: existingTags } = await supabase
          .from('tags')
          .select('id, name')
          .in('name', tags);

        const existingTagNames = new Set(existingTags?.map(t => t.name) || []);
        const newTags = tags.filter(tag => !existingTagNames.has(tag));

        if (newTags.length > 0) {
          const { data: insertedTags, error: tagInsertError } = await supabase
            .from('tags')
            .insert(newTags.map(name => ({ name })))
            .select();

          if (tagInsertError) {
            throw tagInsertError;
          }

          // Combine existing and new tags
          const allTags = [...(existingTags || []), ...(insertedTags || [])];

          // Create bet_tags relationships
          const { error: betTagsError } = await supabase
            .from('bet_tags')
            .insert(allTags.map(tag => ({
              bet_id: bet.id,
              tag_id: tag.id
            })));

          if (betTagsError) {
            throw betTagsError;
          }
        }
      }
      
      // Reset the form
      setHeadline('');
      setExpiresInDays(7);
      setTags([]);
      
      // Call the callback to refresh the bets list
      onBetCreated();
      
      // Close the modal
      onClose();
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating bet:', err);
      setError(error.message || 'Failed to create bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] p-6 rounded-lg w-full max-w-md">
        <h2 className="text-[#f5f5f5] text-xl font-semibold mb-4">Create New Bet</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[#f5f5f5] mb-2">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-[#333333] border border-[#f1c40f]/30 rounded px-3 py-2 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60"
              placeholder="Enter the prediction headline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#f5f5f5] mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-[#333333] border border-[#f1c40f]/30 rounded px-3 py-2 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-[#f1c40f] text-[#222222] rounded font-medium hover:bg-[#f1c40f]/90 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium bg-[#f1c40f]/10 text-[#f1c40f] rounded-full border border-[#f1c40f]/30 flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-[#f5f5f5]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[#f5f5f5] mb-2">Expires in (days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full bg-[#333333] border border-[#f1c40f]/30 rounded px-3 py-2 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60"
            />
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#f5f5f5] hover:bg-[#f5f5f5]/10 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#f1c40f] text-[#222222] rounded font-medium hover:bg-[#f1c40f]/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}