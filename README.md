# We Ate 🍴

A personal nutrition and calorie tracking app for 1–2 people. Track daily meals, macros, weight, and build a recipe library — all in your own private instance connected to your own database.

---

## Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- Git installed on your computer

---

## Setup

### Step 1 — Clone the repo

```bash
git clone https://github.com/Epicuriouskat/katlab.git
cd katlab/we-ate
npm install
```

### Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once it's ready, go to **Settings → API** and copy:
   - Project URL
   - Anon public key
3. Go to the **SQL Editor** and paste in the contents of `schema.sql` (included in this repo) — hit **Run**

### Step 3 — Set up your environment file

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4 — Create your login

In your Supabase project go to **Authentication → Users → Add user** and create an email and password for yourself.

### Step 5 — Run locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser, log in, and go through the setup screen to add your name and nutrition targets.

---

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import this repo
2. Set the **root directory** to `we-ate`
3. Add your environment variables under **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Hit **Deploy**

Once deployed, go back to your Supabase project → **Authentication → URL Configuration** and add your Vercel URL to the allowed redirect URLs.

---

## First Run

After logging in for the first time you'll be taken through a setup screen where you can:

- Enter your name and daily nutrition targets (calories, protein, carbs, fat, fiber)
- Optionally add a second person

You can update these any time from the **Settings** page.

---

## Features

- Daily meal tracker with breakfast, lunch, dinner, and snacks
- Macro progress bars vs. your daily targets
- Recipe library with single and split (per-person) recipe types
- Quick add for one-off meals without saving a recipe
- Portion multiplier when logging recipes
- Weight log with trend graph
- Midnight auto-reset with history log
- Supports 1 or 2 people

---

## Notes

- This app does not have a public signup flow — user accounts are created manually in Supabase Auth
- Each person who sets up this app connects it to their own Supabase project, so your data is always private and separate
