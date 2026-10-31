# Lifetime 24/7 Free Deployment Guide

This guide walks you through deploying your **Smart Procurement Management System & Farmer Portal** to a permanent, lifetime URL on the cloud so anyone in the world can access it 24/7 on any device.

---

## Method 1: Deploy on Vercel (Fastest & Easiest)

Vercel provides ultra-fast global hosting with automatic SSL, instant CI/CD from GitHub, and serverless API functions.

### Step 1: Push your code to GitHub
The project is already configured and ready in your GitHub repository:
[`bhuvanamohansattenapalli-oss/Smart-procurement-sysytem`](https://github.com/bhuvanamohansattenapalli-oss/Smart-procurement-sysytem).

### Step 2: Import Project on Vercel
1. Go to [https://vercel.com](https://vercel.com) and log in with your **GitHub** account.
2. On your Vercel Dashboard, click **"Add New..."** → **"Project"**.
3. Under **"Import Git Repository"**, find and click **Import** next to `Smart-procurement-sysytem`.
4. In the **Configure Project** screen:
   - **Framework Preset**: Auto-detected as **Vite**
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist/public` (auto-detected from `vercel.json`)
   - **Install Command**: `npm install` (default)
5. **Environment Variables**:
   - `DATABASE_URL`: Your PostgreSQL connection URI (e.g. from Supabase or Neon). If you deleted your old database, create a new free PostgreSQL database on Supabase or Neon, copy its URI string (`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`), and paste it as `DATABASE_URL` in Vercel Settings → Environment Variables.
   - If `DATABASE_URL` is temporarily empty or unreachable, the application automatically uses its resilient built-in prototype store to ensure the portal remains online and functional without 500 errors.
   - `JWT_SECRET`: (Optional) Long random string for JWT signing.
6. Click **"Deploy"**!

### Step 3: Database Auto-Initialization & Data Restoration
- **Automatic Schema Migration**: When you provide a valid `DATABASE_URL`, ProcureFlow automatically creates all 16 tables and indexes on first connection using safe, idempotent `CREATE TABLE IF NOT EXISTS` DDL.
- **Importing Historical Farmers & Bookings**: To populate your new PostgreSQL database with the 119 existing farmers, 216 bookings, and historical procurement records, run locally:
  ```bash
  DATABASE_URL="your_new_postgresql_uri" npm run db:import-json
  ```
- **Verification**: You can verify that your database has all tables and is healthy by running:
  ```bash
  DATABASE_URL="your_new_postgresql_uri" npm run db:check
  ```

### Step 4: Your Live Vercel Link
Within 1 to 2 minutes, Vercel will build the frontend and serverless API. You will receive a live URL such as:
`https://smart-procurement-system-omega.vercel.app`

---

## Method 2: Deploy for Free on Render.com (Lifetime Free)

Render provides free hosting for full-stack web applications with zero maintenance.

### Step 1: Upload code to GitHub
1. Create a free account on [GitHub.com](https://github.com) (if you don't already have one).
2. Create a new repository (e.g. `smart-procurement-portal`).
3. Push or upload all project files to the repository.

### Step 2: Deploy on Render
1. Go to [https://render.com](https://render.com) and Sign Up / Log In with GitHub.
2. Click **New +** → **Web Service**.
3. Select your `smart-procurement-portal` GitHub repository.
4. Render will auto-detect the configuration, or you can verify these settings:
   - **Name**: `smart-procurement-portal`
   - **Environment**: `Node`
   - **Region**: Singapore or Frankfurt (or nearest region)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.

### Step 3: Enable 24/7 Permanent Database Persistence with Supabase PostgreSQL (Recommended)
By default, Render's free tier spins down after 15 minutes of inactivity and uses an ephemeral disk. To ensure farmer registrations, bookings, and payments persist permanently across Render sleep and restarts:
1. In your [Supabase Dashboard](https://supabase.com/dashboard), go to your project.
2. Go to **Project Settings** → **Database** → **Connection String** → select **URI**.
3. Copy the URI (format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` or connection pooler URI on port 6543/5432).
4. Replace `[YOUR-PASSWORD]` with your real database password.
5. In your Render Dashboard, open your web service → **Environment** tab.
6. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `your_supabase_postgresql_uri`
7. Click **Save Changes**. Render will redeploy and automatically connect to your persistent Supabase PostgreSQL database. All 16 tables are auto-verified on startup!
8. (Optional) To import your existing 88+ farmers and historical records from `.data/procureflow_db.json` into Supabase, run locally:
   ```bash
   DATABASE_URL="your_supabase_uri" npm run db:import-json
   ```

### Step 4: Your Lifetime URL is Live!
Render will build the Vite client and Node.js server. Within 2 minutes, you will get your permanent live URL:
`https://smart-procurement-portal.onrender.com`

---

## Method 2: Deploy on Railway.app

1. Go to [https://railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository and Railway will automatically deploy it.
4. Go to **Settings** → **Generate Domain** to get a lifetime `https://xxxx.up.railway.app` URL.

---

## Method 3: Deploy on Koyeb (Free Lifetime)

1. Go to [https://www.koyeb.com](https://www.koyeb.com) and log in with GitHub.
2. Click **Create App** → **GitHub**.
3. Choose the repository and click **Deploy**.
4. You will get a permanent `https://xxxx.koyeb.app` URL.
