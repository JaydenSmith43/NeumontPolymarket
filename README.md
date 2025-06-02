# Neumont Polymarket

A prediction market platform for Neumont College events. Students can place bets on campus happenings using NTC (Neumont Token Credits).

## Features

- User authentication with magic link emails
- User balances and bet tracking
- Real-time prediction market with yes/no outcomes
- Secure database with Supabase backend

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (for package management)
- [Supabase](https://supabase.com/) account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   bun install
   ```
3. Set up Supabase:
   - Create a new Supabase project
   - Follow the instructions in `supabase/README.md` to set up the database
   - Add your Supabase URL and anon key to the `.env` file

### Development

Run the development server:
```
bun run dev
```

### Build for Production

```
bun run build
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **Package Manager**: Bun
