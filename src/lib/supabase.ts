import { createClient } from '@supabase/supabase-js';

// These should be environment variables in a real production app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create Supabase client with debug logging
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'neumont-polymarket'
    }
  }
});

// Add debug logging for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state changed:', event, session);
});

// Define types for our database
export type UserProfile = {
  id: string;
  email: string;
  balance: number;
  created_at: string;
};

export type Bet = {
  id: string;
  headline: string;
  yes_votes: number;
  no_votes: number;
  created_at: string;
  expires_at: string;
  created_by: string;
  resolved?: boolean;
  outcome?: 'yes' | 'no';
};

export type UserBet = {
  id: string;
  user_id: string;
  bet_id: string;
  position: 'yes' | 'no';
  amount: number;
  created_at: string;
};