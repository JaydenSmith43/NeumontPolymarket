import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";

export interface BetProps {
  headline: string;
  betId?: string;
  tags?: string[];
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 250, 500, 1000];

interface VoteData {
  yes_votes: number;
  no_votes: number;
}

export default function Bet(props: BetProps) {
  const [votes, setVotes] = useState({ yes: 50, no: 50 });
  const [voteAmounts, setVoteAmounts] = useState<VoteData>({ yes_votes: 0, no_votes: 0 });
  const [betAmount, setBetAmount] = useState<number>(10);
  const [showBetInput, setShowBetInput] = useState<"yes" | "no" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBet, setUserBet] = useState<{ position: 'yes' | 'no' | null; amount: number | null }>({ position: null, amount: null });
  const { user, profile, refreshProfile } = useAuth();
  const [tags, setTags] = useState<string[]>(props.tags || []);

  // Calculate potential payout for a given bet amount and position
  const calculatePayout = (amount: number, position: 'yes' | 'no') => {
    const totalPool = voteAmounts.yes_votes + voteAmounts.no_votes;
    if (totalPool === 0) return amount * 2; // If no bets yet, 1:1 payout

    const winningPool = position === 'yes' ? voteAmounts.no_votes : voteAmounts.yes_votes;
    //const losingPool = position === 'yes' ? voteAmounts.yes_votes : voteAmounts.no_votes;
    
    // Calculate the proportion of the winning pool you would get
    const proportion = amount / (position === 'yes' ? voteAmounts.yes_votes : voteAmounts.no_votes);
    const payout = amount + (winningPool * proportion);
    
    return Math.round(payout);
  };

  // Calculate current odds for each position
  const calculateOdds = (position: 'yes' | 'no') => {
    const totalPool = voteAmounts.yes_votes + voteAmounts.no_votes;
    if (totalPool === 0) return '1:1';

    const winningPool = position === 'yes' ? voteAmounts.no_votes : voteAmounts.yes_votes;
    const losingPool = position === 'yes' ? voteAmounts.yes_votes : voteAmounts.no_votes;
    
    if (losingPool === 0) return '1:0';
    
    const ratio = winningPool / losingPool;
    return `${ratio.toFixed(2)}:1`;
  };

  // Fetch real vote data and user's existing bet from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch votes and tags
        const { data: votesData, error: votesError } = await supabase
          .from("bets")
          .select(`
            yes_votes, 
            no_votes,
            bet_tags (
              tags (
                name
              )
            )
          `)
          .eq("id", props.betId)
          .single();

        if (votesError && votesError.code !== "PGRST116") {
          console.error("Error fetching votes:", votesError);
          return;
        }

        if (votesData) {
          setVoteAmounts({
            yes_votes: votesData.yes_votes,
            no_votes: votesData.no_votes
          });

          const total = votesData.yes_votes + votesData.no_votes;
          if (total > 0) {
            setVotes({
              yes: Math.round((votesData.yes_votes / total) * 100),
              no: Math.round((votesData.no_votes / total) * 100),
            });
          }

          // Set tags
          if (votesData.bet_tags) {
            setTags(votesData.bet_tags.map((bt: any) => bt.tags.name));
          }
        }

        // Fetch user's existing bet if logged in
        if (user) {
          const { data: betData, error: betError } = await supabase
            .from("user_bets")
            .select("position, amount")
            .eq("user_id", user.id)
            .eq("bet_id", props.betId)
            .single();

          if (betError && betError.code !== "PGRST116") {
            console.error("Error fetching user bet:", betError);
            return;
          }

          if (betData) {
            setUserBet({
              position: betData.position as 'yes' | 'no',
              amount: betData.amount
            });
          }
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
      }
    };

    fetchData();
  }, [props.betId, props.headline, user?.id]);

  const handleBetStart = (type: "yes" | "no") => {
    if (!user) {
      setError("Please sign in to place a bet");
      return;
    }

    if (userBet.position) {
      setError(`You have already placed a bet on ${userBet.position.toUpperCase()}`);
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
      const { error: userBetError } = await supabase
        .from("user_bets")
        .insert({
          user_id: user.id,
          bet_id: props.betId,
          position: showBetInput,
          amount: betAmount,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userBetError) {
        if (userBetError.code === '23505') { // Unique violation error code
          throw new Error("You have already placed a bet on this prediction");
        }
        throw userBetError;
      }

      // Update bet votes
      const { error: betUpdateError } = await supabase.rpc(
        showBetInput === "yes" ? "increment_yes_votes" : "increment_no_votes",
        { bet_id: props.betId, vote_amount: betAmount },
      );

      if (betUpdateError) {
        throw betUpdateError;
      }

      // Update user balance
      const { error: balanceError } = await supabase.rpc(
        "update_user_balance",
        {
          user_id: user.id,
          amount: -betAmount,
        },
      );

      if (balanceError) {
        throw balanceError;
      }

      // Refresh vote counts
      const { data: updatedBet } = await supabase
        .from("bets")
        .select("yes_votes, no_votes")
        .eq("id", props.betId)
        .single();

      if (updatedBet) {
        setVoteAmounts({
          yes_votes: updatedBet.yes_votes,
          no_votes: updatedBet.no_votes
        });

        const total = updatedBet.yes_votes + updatedBet.no_votes;
        setVotes({
          yes: Math.round((updatedBet.yes_votes / total) * 100),
          no: Math.round((updatedBet.no_votes / total) * 100)
        });
      }
      
      // Update user bet state
      setUserBet({
        position: showBetInput,
        amount: betAmount
      });
      
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
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs font-medium bg-[#f1c40f]/10 text-[#f1c40f] rounded-full border border-[#f1c40f]/30"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#333333] p-3 rounded border border-[#f1c40f]/30">
          <div className="text-[#f5f5f5] font-medium mb-1">YES</div>
          <div className="text-[#f1c40f] text-sm">Odds: {calculateOdds('yes')}</div>
          <div className="text-[#f5f5f5]/70 text-sm">
            Total Pool: {voteAmounts.yes_votes} NTC
          </div>
          {showBetInput === 'yes' && (
            <div className="mt-2 text-[#f1c40f] text-sm">
              Potential Payout: {calculatePayout(betAmount, 'yes')} NTC
            </div>
          )}
        </div>
        <div className="bg-[#333333] p-3 rounded border border-[#f1c40f]/30">
          <div className="text-[#f5f5f5] font-medium mb-1">NO</div>
          <div className="text-[#f1c40f] text-sm">Odds: {calculateOdds('no')}</div>
          <div className="text-[#f5f5f5]/70 text-sm">
            Total Pool: {voteAmounts.no_votes} NTC
          </div>
          {showBetInput === 'no' && (
            <div className="mt-2 text-[#f1c40f] text-sm">
              Potential Payout: {calculatePayout(betAmount, 'no')} NTC
            </div>
          )}
        </div>
      </div>
      
      {userBet.position && (
        <div className="mb-4 p-2 bg-[#f1c40f]/10 border border-[#f1c40f]/30 rounded text-sm text-[#f1c40f]">
          You bet {userBet.amount} NTC on {userBet.position.toUpperCase()}
          <div className="mt-1">
            Potential Payout: {calculatePayout(userBet.amount || 0, userBet.position)} NTC
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-200">
          {error}
        </div>
      )}
      
      {showBetInput ? (
        <div className="mt-4 mb-4">
          <div className="mb-4">
            <div className="text-[#f5f5f5] mb-2">Select bet amount:</div>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    betAmount === amount
                      ? 'bg-[#f1c40f] text-[#222222]'
                      : 'bg-[#333333] text-[#f5f5f5] hover:bg-[#444444]'
                  } ${amount > (profile?.balance || 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={amount > (profile?.balance || 0)}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center mb-4">
            <span className="text-[#f5f5f5] mr-2">Custom amount:</span>
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
              className="flex-1 rounded px-4 py-2 text-sm font-semibold bg-[#f1c40f] text-[#222222] border border-[#f1c40f] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleBetSubmit}
              disabled={isSubmitting || betAmount <= 0 || !profile || betAmount > profile.balance}
            >
              {isSubmitting ? 'Placing Bet...' : `Bet ${showBetInput.toUpperCase()}`}
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
            className={`flex-1 rounded px-5 py-3 text-base font-semibold cursor-pointer transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 ${
              userBet.position 
                ? 'bg-[#444444] text-[#f5f5f5]/50 cursor-not-allowed border border-[#f5f5f5]/20'
                : 'bg-[#f1c40f] text-[#222222] border border-[#f1c40f]'
            }`}
            onClick={() => handleShowBetInput("yes")}
            disabled={!!userBet.position}
            title={userBet.position ? "You have already placed a bet" : "Bet YES"}
          >
            {userBet.position === 'yes' ? "Your Bet: YES" : "Yes"}
          </button>
          <button
            className={`flex-1 rounded px-5 py-3 text-base font-semibold cursor-pointer transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 ${
              userBet.position 
                ? 'bg-[#444444] text-[#f5f5f5]/50 cursor-not-allowed border border-[#f5f5f5]/20'
                : 'bg-transparent text-[#f1c40f] border border-[#f1c40f]'
            }`}
            onClick={() => handleShowBetInput("no")}
            disabled={!!userBet.position}
            title={userBet.position ? "You have already placed a bet" : "Bet NO"}
          >
            {userBet.position === 'no' ? "Your Bet: NO" : "No"}
          </button>
        </div>
      )}
    </div>
  );
}
