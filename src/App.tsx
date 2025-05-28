import { useState, useEffect } from "react";
import Bet from "./Bet";
import Navigation from "./components/Navigation";
import { AuthProvider } from "./context/AuthContext";
import CreateBetModal from "./components/CreateBetModal";
import { supabase } from "./lib/supabase";
import type { Bet as BetType } from "./lib/supabase";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const [balance] = useState(1000);
  const [bets, setBets] = useState<BetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateBetModalOpen, setIsCreateBetModalOpen] = useState(false);
  const { user } = useAuth();

  const fetchBets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setBets(data as BetType[]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching bets:', err);
      setError(error.message || 'Failed to fetch bets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation balance={balance} />

      <main className="flex-1 p-8 flex flex-col items-center">
        <div className="w-full max-w-[1600px] mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#f5f5f5]">Active Bets</h2>
          <button
            onClick={() => setIsCreateBetModalOpen(true)}
            disabled={!user}
            className="bg-[#f1c40f] text-[#222222] py-2 px-4 rounded font-medium hover:bg-[#f1c40f]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            title={!user ? "Sign in to create bets" : "Create a new bet"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Bet
          </button>
        </div>

        {error && (
          <div className="w-full max-w-[1600px] mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded text-red-200">
            {error}
            <button 
              onClick={fetchBets}
              className="ml-4 underline hover:text-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-[#f1c40f]/20 border-t-[#f1c40f] rounded-full animate-spin"></div>
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-12 text-[#f5f5f5]/70">
            <p className="mb-4">No bets available yet.</p>
            {user && (
              <button
                onClick={() => setIsCreateBetModalOpen(true)}
                className="text-[#f1c40f] hover:underline"
              >
                Create the first bet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1600px] w-full">
            {bets.map((bet) => (
              <Bet key={bet.id} headline={bet.headline} betId={bet.id} />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-[#333333] py-4 px-4 text-center text-sm text-white/70 border-t-2 border-[#f1c40f]">
        <p>
          © {new Date().getFullYear()} <span className="text-[#f1c40f]">NEUMONT POLYMARKET</span> -
          Trade on campus predictions
        </p>
      </footer>

      <CreateBetModal
        isOpen={isCreateBetModalOpen}
        onClose={() => setIsCreateBetModalOpen(false)}
        onBetCreated={fetchBets}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
