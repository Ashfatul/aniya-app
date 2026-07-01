# Aniya 🌸 — A private memory book for your baby

A beautiful, password-protected web app to capture every precious moment of your baby's growth — photos, milestones, growth charts, feedings, sleep, and more. Built with **Next.js 16** + **Supabase** on the **free tier** — no backend to run, no monthly fees.

> **Free forever** for personal use: Supabase gives you 500 MB of database, 1 GB of file storage, and unlimited auth users. That's roughly 1,000+ memories or 10+ years of everyday journaling.

---

## ✨ Features

- 📸 **Memory feed** — photos & notes with dates, auto-built timeline
- 📏 **Growth tracking** — height, weight, head circumference (one entry per visit)
- 🍼 **Feedings** — breast, formula, solid, water, with amount & duration
- 😴 **Sleep** — naps & nights with start/end times and duration
- 🎉 **Milestones** — first smile, first step, first word, categorized
- ✨ **Firsts** — free-form "first time" entries
- 👨‍👩‍👧 **Family sharing** — invite parents/grandparents with view or edit access
- 🔒 **Password protected** — only invited people can see anything
- 📱 **Mobile-friendly** — looks great on your phone, installable as a PWA
- 🎨 **Soft pastel UI** — designed to feel like a keepsake, not an admin panel

---

## 🚀 One-time setup (≈ 10 minutes)

You need **two free accounts**:

1. **Supabase** → database, auth, file storage (https://supabase.com)
2. **Vercel** → hosting (https://vercel.com)

### Step 1 — Create the Supabase project

1. Go to https://supabase.com → **New project**
2. Pick any name (e.g. `aniya`), choose a region near you, set a strong **database password** (save it somewhere safe).
3. Wait ~2 minutes for it to provision.

### Step 2 — Run the database schema

1. In Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this repo, copy everything, paste it in.
4. Click **Run**. You should see "Success. No rows returned" — that's expected; it just means tables/policies were created.
5. Go to **Storage** → confirm a bucket called `media` exists. If not, create one named exactly `media` with **Public = ON**.

### Step 3 — Get your API keys

In Supabase: **Project Settings** → **API**. Copy:

- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **anon public key** (the long `eyJ…` JWT string)

### Step 4 — Configure local environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

### Step 5 — Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you should see the landing page. Click **Create your memory book** and sign up. The first user you create automatically becomes the family **owner**.

### Step 6 — (Recommended) Disable email confirmation

For a personal/family app, the friction of "click the confirmation link" is annoying. To skip it:

1. Supabase → **Authentication** → **Providers** → **Email**
2. Turn **OFF** "Confirm email"

Now anyone you sign up just logs straight in.

---

## 🌐 Deploy to Vercel (free)

1. Push this folder to GitHub (private repo is fine).
2. Go to https://vercel.com → **Add New Project** → import the repo.
3. Vercel auto-detects Next.js. Click **Deploy** — it'll fail first time (no env vars).
4. Go to your project → **Settings** → **Environment Variables** and add the same two `NEXT_PUBLIC_*` values from `.env.local`.
5. **Deployments** → click the latest → **Redeploy**.
6. Your app is live at `https://aniya-xxxx.vercel.app` (you can attach a custom domain for free in **Settings → Domains**).

---

## 👨‍👩‍👧 Inviting family

1. Sign in as the **owner**.
2. Bottom nav → **Family**.
3. Type the family member's email, pick **Viewer** or **Editor**, and click **Create invite**.
4. The app will generate a secure invite link. **Copy this link** and send it to them!
5. When they open the link, they'll see a special Join page where they can set their password and instantly access your family's memory book.

**What each role can do:**

| Role   | View everything | Add memories | Edit/delete content | Manage members |
|--------|:--:|:--:|:--:|:--:|
| Owner  | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ (own) | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

---

## 📱 Install as an app on your phone

The app works as a regular web page, but for a more native feel:

- **iPhone/iPad**: After a few seconds, a custom prompt will slide up instructing you to tap the **Share** button and select **Add to Home Screen**.
- **Android**: Chrome will automatically prompt you with an **Install App** button at the bottom of the screen.

It then opens full-screen, like a regular app, complete with a beautiful glassmorphism icon, and your auth session persists.

---

## 🧩 Adding new content types later

The whole app is built on **one `timeline_entries` table** with a `module` field and a JSONB `data` column. To add a new content type (e.g. "doctor visits", "daycare", "teeth chart"):

1. Add a new value to the `module` check constraint in Supabase (SQL Editor).
2. Add the icon/label in `components/module-icon.tsx`.
3. Add the form section in `app/(app)/add/add-form.tsx`.

That's it — no schema migrations for new fields, just put them in `data` as JSON.

---

## 🛟 Troubleshooting

**"Invalid API key"** — your `.env.local` is wrong or missing. Restart `npm run dev` after editing env files.

**Photos won't upload** — make sure the `media` storage bucket exists and is **set to Public**. The database handles privacy at the folder level.

**"new row violates row-level security policy"** — your signed-in user doesn't have a `family_members` row yet. Try signing out and back in.

**Build errors after pulling new code** — `rm -rf .next && npm install && npm run dev`.

---

## 🧰 Tech stack

- **Next.js 16** (App Router, RSC, Server Actions) — frontend + server
- **Supabase** — PostgreSQL DB, auth, file storage
- **Tailwind CSS 4** — styling
- **TypeScript** — strict everywhere

No backend server to manage. No monthly fees for personal use. Your data is yours.