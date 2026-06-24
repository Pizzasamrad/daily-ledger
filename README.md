# The Daily Ledger — setup & deploy

A personal calorie / macro / weight tracker. This guide gets it live at a real
URL you can bookmark or add to your phone's home screen, with data synced
across devices via a free Supabase database.

Total time: ~15 minutes, no coding required beyond copy/paste.

---

## 1. Create your database (Supabase)

1. Go to https://supabase.com and sign up (free tier is plenty for this).
2. Click **New project**. Pick any name (e.g. `daily-ledger`), set a database
   password (save it somewhere), pick the region closest to you, and click
   **Create new project**. Wait ~2 minutes for it to spin up.
3. In the left sidebar, open **SQL Editor** → **New query**.
4. Open the file `supabase_setup.sql` from this project, copy its full
   contents, paste into the SQL editor, and click **Run**.
   This creates the one table the app needs (`ledger_kv`) and sets
   permissions so your app can read/write it.
5. In the left sidebar, go to **Project Settings** → **API**.
   You'll need two values from this page in step 3 below:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

Keep this tab open — you'll copy these two values in a moment.

---

## 2. Push this code to GitHub

1. Go to https://github.com and sign in (or create a free account).
2. Click **New repository**, name it `daily-ledger`, keep it **Private**,
   click **Create repository**.
3. On your computer, download/unzip this project folder, then in a terminal
   inside the folder run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/daily-ledger.git
   git push -u origin main
   ```

   (GitHub will show you these exact commands on the new repo page too —
   you can copy them from there instead.)

---

## 3. Deploy to Vercel (free hosting + your real URL)

1. Go to https://vercel.com and sign up using your GitHub account.
2. Click **Add New** → **Project**, then select the `daily-ledger` repo you
   just pushed.
3. Vercel will auto-detect it's a Vite app. Before clicking deploy, open
   **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | (the Project URL from step 1.5) |
   | `VITE_SUPABASE_ANON_KEY` | (the anon public key from step 1.5) |

4. Click **Deploy**. After ~1 minute you'll get a live URL like
   `daily-ledger-yourname.vercel.app`.

That URL is permanent — bookmark it, or add it to your phone home screen
(see below). Every time you `git push` an update, Vercel redeploys
automatically.

---

## 4. Add it to your phone home screen

**iPhone (Safari):** open the URL → tap the Share icon → **Add to Home
Screen**.

**Android (Chrome):** open the URL → tap the ⋮ menu → **Add to Home
screen** / **Install app**.

It'll open full-screen with no browser bar, just like a native app, using
the icon and name already configured in this project.

---

## Notes

- This app has no login screen — anyone with the URL and your Supabase
  anon key embedded in the build could technically read/write your data.
  That's fine for a private single-user tool, but don't share the URL
  publicly. If you ever want real auth, Supabase has built-in email/password
  login that can be added later.
- All your existing entries from the Claude.ai artifact version do **not**
  carry over automatically — they lived in a separate storage system. You'll
  start fresh here. (If you want, paste me an export of that data and I can
  write a one-time import script.)
- Local development: copy `.env.example` to `.env`, fill in your Supabase
  values, then run `npm install` and `npm run dev`.
# daily-ledger
# daily-ledger
