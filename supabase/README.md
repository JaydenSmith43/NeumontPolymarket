# Supabase Setup for Neumont Polymarket

This guide explains how to set up Supabase for the Neumont Polymarket project, which includes authentication with magic link, user balances, and betting functionality.

## Getting Started

1. Create a Supabase account at [https://supabase.com](https://supabase.com) if you don't have one already.
2. Create a new project in Supabase.
3. Note your project URL and anon key from the API settings page.

## Environment Setup

1. Copy the values from your Supabase project to your `.env` file:

```
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

## Database Setup

Run the SQL migrations in the Supabase SQL editor:

1. Go to your Supabase project's SQL Editor
2. Create a new query
3. Copy and paste the contents of `migrations.sql` into the editor
4. Run the query

This will create the following database structure:

- `profiles` - Stores user information including balances
- `bets` - Stores information about available bets
- `user_bets` - Tracks user betting activity

## Authentication Setup

1. Go to Authentication → Settings → Email in your Supabase dashboard
2. Enable "Enable Email Signup"
3. Configure the email template for magic link authentication

## Row Level Security (RLS)

The migrations automatically set up Row Level Security policies to:

- Allow users to see all bets
- Only allow users to place bets if they're authenticated
- Restrict users to viewing and updating only their own profile information
- Allow only bet creators or admins to update bets

## Functions

The migrations create several PostgreSQL functions:

- `handle_new_user()` - Creates a profile for new users with a starting balance
- `increment_yes_votes()` - Updates the yes vote count for a bet
- `increment_no_votes()` - Updates the no vote count for a bet
- `update_user_balance()` - Adjusts a user's balance
- `resolve_bet()` - Resolves a bet and distributes winnings

## Admin Functions

To resolve bets and distribute winnings to users:

```sql
SELECT resolve_bet('bet-uuid-here', 'yes'); -- or 'no' for the outcome
```

## Testing Authentication

After setup, you should be able to:

1. Sign in with a magic link
2. View your balance
3. Place bets on different predictions
4. See your balance update accordingly

## Troubleshooting

- If users aren't getting their initial balance, check that the `handle_new_user` trigger is properly set up
- For issues with placing bets, check the browser console for error messages and verify the RLS policies