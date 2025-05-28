-- Create tables and functions for Neumont Polymarket

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-jwt-secret';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables

-- Profiles table to store user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bets table to store information about bets
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  yes_votes BIGINT NOT NULL DEFAULT 0,
  no_votes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT FALSE,
  outcome TEXT CHECK (outcome IN ('yes', 'no'))
);

-- User bets table to store information about user bets
CREATE TABLE public.user_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('yes', 'no')),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bet_id, position)
);

-- Create functions

-- Create a function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, balance)
  VALUES (NEW.id, NEW.email, 1000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to increment yes votes
CREATE OR REPLACE FUNCTION public.increment_yes_votes(bet_id UUID, vote_amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.bets
  SET yes_votes = yes_votes + vote_amount
  WHERE id = bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to increment no votes
CREATE OR REPLACE FUNCTION public.increment_no_votes(bet_id UUID, vote_amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.bets
  SET no_votes = no_votes + vote_amount
  WHERE id = bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(user_id UUID, amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to resolve a bet
CREATE OR REPLACE FUNCTION public.resolve_bet(bet_id UUID, bet_outcome TEXT)
RETURNS void AS $$
DECLARE
  winning_amount BIGINT;
  total_amount BIGINT;
  user_record RECORD;
BEGIN
  -- Mark the bet as resolved
  UPDATE public.bets
  SET resolved = TRUE, outcome = bet_outcome
  WHERE id = bet_id;
  
  -- Calculate the total amount bet
  SELECT (yes_votes + no_votes) INTO total_amount
  FROM public.bets
  WHERE id = bet_id;
  
  -- Distribute winnings to users who bet correctly
  FOR user_record IN
    SELECT user_id, amount
    FROM public.user_bets
    WHERE bet_id = bet_id AND position = bet_outcome
  LOOP
    -- Calculate the winning amount (original bet + proportional share of losing pool)
    winning_amount := user_record.amount * 2; -- Simplified calculation
    
    -- Update user balance
    PERFORM public.update_user_balance(user_record.user_id, winning_amount);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up Row Level Security (RLS) policies

-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Bets table policies
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bets" 
  ON public.bets FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create bets" 
  ON public.bets FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin users can update bets" 
  ON public.bets FOR UPDATE 
  TO authenticated
  USING (auth.uid() = created_by OR
         EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = auth.uid() AND email LIKE '%@neumont.edu'
         ));

-- User bets table policies
ALTER TABLE public.user_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bets" 
  ON public.user_bets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bets" 
  ON public.user_bets FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Set up public access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON public.bets TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.bets TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT INSERT, SELECT ON public.user_bets TO authenticated;

-- Grant access to functions
GRANT EXECUTE ON FUNCTION public.increment_yes_votes TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_no_votes TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_bet TO authenticated;