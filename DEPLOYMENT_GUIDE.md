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
5. (Optional) **Environment Variables**:
   - If you have a free cloud database URL (e.g. Supabase, TiDB Cloud, Aiven), you can add `DATABASE_URL`.
   - If not, you can leave it empty — the built-in serverless fallback store will initialize automatically!
6. Click **"Deploy"**!

### Step 3: Your Live Vercel Link
Within 1 to 2 minutes, Vercel will build the frontend and serverless API. You will receive a live URL such as:
`https://smart-procurement-sysytem.vercel.app`

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

### Step 3: Enable 24/7 Permanent Database Persistence (Recommended)
By default, Render's free tier spins down after 15 minutes of inactivity and uses an ephemeral disk. To ensure farmer registrations, bookings, and payments persist permanently:
1. Create a free cloud MySQL database (e.g. on [TiDB Cloud Serverless](https://tidbcloud.com/), [Aiven MySQL](https://aiven.io/), or [Railway MySQL](https://railway.app/)).
2. Copy your MySQL connection URL (e.g. `mysql://user:password@host:port/dbname?ssl={"rejectUnauthorized":true}`).
3. In your Render Dashboard, open your web service → **Environment** tab.
4. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `your_mysql_connection_string`
5. Render will automatically redeploy and connect directly to your persistent cloud database.

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
