# Complete Live Production Deployment Guide

This guide details the step-by-step process for deploying **Smart Call Reminder** live on **Render** (Backend + PostgreSQL) and **Vercel** (Frontend PWA).

---

## 1. GitHub Repository Setup

1. Initialize git in the `smart_call_reminder` folder:
   ```powershell
   cd f:\antigravity\smart_call_reminder
   git init
   git add .
   git commit -m "Initial commit: Smart Call Reminder full-stack PWA"
   ```
2. Create a new repository on [GitHub](https://github.com): `smart-call-reminder`.
3. Push code:
   ```powershell
   git remote add origin https://github.com/<your-username>/smart-call-reminder.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Managed PostgreSQL Database Setup

1. Sign up / Log in to [Neon](https://neon.tech) or [Render](https://render.com).
2. Create a new **PostgreSQL Database** named `smart_call_reminder`.
3. Copy the pooled or direct connection string:
   ```
   postgresql://smart_call_user:SecretPassword123@ep-cool-fog-12345.ap-southeast-1.aws.neon.tech/smart_call_reminder?sslmode=require
   ```

---

## 3. Backend Deployment on Render

1. On the [Render Dashboard](https://dashboard.render.com), click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository `smart-call-reminder`.
3. Specify configuration:
   - **Name**: `smart-call-reminder-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
4. Add Environment Variables:
   - `DATABASE_URL`: `postgresql://...` (your PostgreSQL connection string)
   - `CORS_ORIGINS`: `https://smart-call-reminder.vercel.app` (your frontend Vercel URL)
   - `VAPID_PUBLIC_KEY`: `BPn0XyWlhV6CJMZMLJbp5FboIo-LQ5Ep1ECveN2i4Soj6fvwiOSRCDcvC84ncdGHKZx_f1P2-JTbQXX0yJIQ5qw`
   - `VAPID_PRIVATE_KEY`: Your generated private key
   - `VAPID_CLAIM_EMAIL`: `mailto:admin@smartcallreminder.app`
   - `TRANSCRIPTION_PROVIDER`: `auto`
   - `GROQ_API_KEY`: *(Optional)* Your Groq API key for instant Tamil/English Whisper STT
   - `RETAIN_AUDIO_FILES`: `false`
5. Click **Create Web Service**.
6. When deployment finishes, copy your live backend URL:
   `https://smart-call-reminder-api.onrender.com`

---

## 4. Frontend PWA Deployment on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** &rarr; **Project**.
2. Select the `smart-call-reminder` GitHub repository.
3. In project settings:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://smart-call-reminder-api.onrender.com/api`
5. Click **Deploy**.
6. Once deployed, note your public domain: `https://smart-call-reminder.vercel.app`.

---

## 5. Verification & Smoke Testing Checklist

1. **Health Check**:
   Visit `https://smart-call-reminder-api.onrender.com/api/health` — should return status `healthy`.
2. **Interactive API Documentation**:
   Visit `https://smart-call-reminder-api.onrender.com/docs` to test Swagger UI.
3. **PWA Manifest & Service Worker**:
   Open Chrome DevTools &rarr; **Application** tab on `https://smart-call-reminder.vercel.app`:
   - Verify `manifest.webmanifest` is recognized with 192x192 and 512x512 icons.
   - Verify `sw.js` is active and running.
4. **Voice Recording & Playback**:
   Allow microphone access, record audio, listen to playback.
5. **Add Call Reminder**:
   Fill in phone number `+919876543210`, title `Send quotation`, due date. Save and verify it appears on the dashboard card.
6. **Push Notifications**:
   Go to **Settings**, enable Web Push notifications, and click **Send Test Notification**.
