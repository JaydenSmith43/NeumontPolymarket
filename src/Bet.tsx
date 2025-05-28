import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";

export interface BetProps {
  headline: string;
  betId?: string;
}

export default function Bet(props: BetProps) {
  const [votes, setVotes] = useState({ yes: 30, no: 70 });
  const [betAmount, setBetAmount] = useState<number>(10);
  const [showBetInput, setShowBetInput] = useState<'yes' | 'no' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, refreshProfile } = useAuth();
  
  // Generate a UUID for new bets or use the provided ID
  const [betId] = useState(props.betId || crypto.randomUUID());

  // Fetch real vote data from Supabase on mount
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('yes_votes, no_votes')
          .eq('id', betId)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error('Error fetching votes:', error);
          return;
        }
        
        if (data) {
          const total = data.yes_votes + data.no_votes;
          if (total > 0) {
            setVotes({
              yes: Math.round((data.yes_votes / total) * 100),
              no: Math.round((data.no_votes / total) * 100)
            });
          }
        } else {
          // Initialize the bet in the database if it doesn't exist
          await supabase.from('bets').insert({
            id: betId,
            headline: props.headline,
            yes_votes: 3, // Starting with some minimal votes
            no_votes: 7,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            created_by: user?.id || null
          });
        }
      } catch (err) {
        console.error('Error in fetchVotes:', err);
      }
    };
    
    fetchVotes();
  }, [betId, props.headline, user?.id]);

  const handleBetStart = (type: "yes" | "no") => {
    if (!user) {
      setError("Please sign in to place a bet");
      return;
    }
    
    setShowBetInput(type);
    setError(null);
  };
  
  const handleBetCancel = () => {
    setShowBetInput(null);
    setError(null);
  };
  
  const handleBetSubmit = async () => {
    if (!user || !profile || !showBetInput) return;
    
    // Validate bet amount
    if (betAmount <= 0) {
      setError("Bet amount must be greater than 0");
      return;
    }
    
    if (betAmount > profile.balance) {
      setError("Insufficient balance");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Start a transaction
      const { error: userBetError } = await supabase.from('user_bets').insert({
        user_id: user.id,
        bet_id: betId,
        position: showBetInput,
        amount: betAmount,
        created_at: new Date().toISOString()
      }).select().single();
      
      if (userBetError) {
        throw userBetError;
      }
      
      // Update bet votes
      const { error: betUpdateError } = await supabase.rpc(
        showBetInput === 'yes' ? 'increment_yes_votes' : 'increment_no_votes',
        { bet_id: betId, vote_amount: betAmount }
      );
      
      if (betUpdateError) {
        throw betUpdateError;
      }
      
      // Update user balance
      const { error: balanceError } = await supabase.rpc('update_user_balance', {
        user_id: user.id,
        amount: -betAmount
      });
      
      if (balanceError) {
        throw balanceError;
      }
      
      // Refresh vote counts
      const { data: updatedBet } = await supabase
        .from('bets')
        .select('yes_votes, no_votes')
        .eq('id', betId)
        .single();
        
      if (updatedBet) {
        const total = updatedBet.yes_votes + updatedBet.no_votes;
        setVotes({
          yes: Math.round((updatedBet.yes_votes / total) * 100),
          no: Math.round((updatedBet.no_votes / total) * 100)
        });
      }
      
      // Refresh user profile to update balance
      await refreshProfile();
      
      // Reset bet input
      setShowBetInput(null);
      setBetAmount(10);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error placing bet:', err);
      setError(error.message || 'Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowBetInput = (type: "yes" | "no") => {
    handleBetStart(type);
  };
  
  return (
    <div className="w-full border border-[#f1c40f]/30 p-6 rounded bg-[#2a2a2a] font-sans shadow-lg">
      <h2 className="mb-7 text-[#f5f5f5] text-[1.4rem] font-semibold leading-tight border-b border-[#f1c40f]/30 pb-3">
        {props.headline}
      </h2>
      <div className="flex items-center mb-4">
        <div className={`w-[45px] font-bold ${votes.yes >= votes.no ? 'text-[#f1c40f]' : ''}`}>Yes</div>
        <div className="flex-grow h-[18px] bg-white/10 mx-3 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${votes.yes >= votes.no ? 'bg-[#f1c40f]' : 'bg-[#555555]'}`}
            style={{ width: `${votes.yes}%` }}
          />
        </div>
        <div className="w-[45px] text-right font-semibold text-[#f5f5f5]">{votes.yes}%</div>
      </div>
      <div className="flex items-center mb-4">
        <div className={`w-[45px] font-bold ${votes.no > votes.yes ? 'text-[#f1c40f]' : ''}`}>No</div>
        <div className="flex-grow h-[18px] bg-white/10 mx-3 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${votes.no > votes.yes ? 'bg-[#f1c40f]' : 'bg-[#555555]'}`}
            style={{ width: `${votes.no}%` }}
          />
        </div>
        <div className="w-[45px] text-right font-semibold text-[#f5f5f5]">{votes.no}%</div>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-200">
          {error}
        </div>
      )}
      
      {showBetInput !== null ? (
        <div className="mt-4 mb-4">
          <div className="flex items-center mb-2">
            <span className="text-[#f5f5f5] mr-2">Bet amount:</span>
            <input
              type="number"
              min="1"
              max={profile?.balance || 1000}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="bg-[#333333] border border-[#f1c40f]/30 rounded px-2 py-1 text-[#f5f5f5] w-20 focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60"
            />
            <span className="ml-2 text-[#f5f5f5]/70">NTC</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              className="flex-1 rounded px-4 py-2 text-sm font-semibold bg-[#f1c40f] text-[#222222] border border-[#f1c40f] disabled:opacity-50"
              onClick={handleBetSubmit}
              disabled={isSubmitting || !betAmount || betAmount <= 0 || (profile && betAmount > profile.balance)}
            >
              {isSubmitting ? 'Placing Bet...' : `Bet ${showBetInput?.toUpperCase() || ''}`}
            </button>
            <button
              className="rounded px-4 py-2 text-sm font-semibold bg-transparent text-[#f5f5f5]/80 border border-[#f5f5f5]/20 hover:bg-[#f5f5f5]/10 transition-colors"
              onClick={handleBetCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-around mt-7 gap-3">
          <button 
            className="flex-1 rounded px-5 py-3 text-base font-semibold cursor-pointer transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 bg-[#f1c40f] text-[#222222] border border-[#f1c40f]" 
            onClick={() => handleShowBetInput("yes")}
          >
            Yes
          </button>
          <button 
            className="flex-1 rounded px-5 py-3 text-base font-semibold cursor-pointer transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 bg-transparent text-[#f1c40f] border border-[#f1c40f]" 
            onClick={() => handleShowBetInput("no")}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
