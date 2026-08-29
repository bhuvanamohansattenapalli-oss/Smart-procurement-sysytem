# Lifetime 24/7 Free Deployment Guide

This guide walks you through deploying your **Smart Procurement Management System & Farmer Portal** to a permanent, lifetime URL on the cloud so anyone in the world can access it 24/7 on any device.

---

## Method 1: Deploy for Free on Render.com (Recommended - Lifetime Free)

Render provides free lifetime hosting for full-stack web applications with zero maintenance.

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

### Step 3: Your Lifetime URL is Live!
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
