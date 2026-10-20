# Smart Call Reminder — Progressive Web App (PWA)

A production-oriented, privacy-first Progressive Web App (PWA) designed to record voice notes, transcribe audio, organize post-call action items, and deliver reliable multi-tier priority notifications across **iPhone (Safari)**, **Android (Chrome)**, and **Desktop**.

---

## 🌟 Key Highlights & Privacy Architecture

- **🔒 Strict Privacy-First Guarantee**: No device address book permissions requested. Contact names are never required, created, or stored. All call notes are indexed strictly by phone number and call timestamp.
- **🎙️ Voice Capture & Multilingual Speech-to-Text**: Record live audio via the browser MediaRecorder API or upload audio files (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`). Transcribe Tamil, English, and Tanglish using Groq Whisper (`whisper-large-v3`) or OpenAI Whisper (`whisper-1`).
- **🧠 Smart Reminder Extraction**: Parses colloquial voice notes (e.g., *"Ravi ku five days la quotation send pannanum"* or *"Emergency, innaikke mudikkanum"*) into suggested task titles, priority tiers, and due dates with user confirmation.
- **🎨 6-Tier Priority Color System**:
  - **Emergency**: Red (`#DC2626`) — Immediate push dispatch + high-priority badge
  - **Due Today / 1-Day**: Orange-Red (`#EA580C`)
  - **2-Day Reminder**: Orange (`#F59E0B`)
  - **3-Day Reminder**: Yellow (`#EAB308`)
  - **5-Day Reminder**: Blue (`#2563EB`)
  - **Completed**: Green (`#16A34A`)
- **📅 Interactive Calendar Engine**: Monthly calendar grid with color priority dots, date filtering, and quick reschedule workflows.
- **🔔 Persistent Background Push Dispatcher**: Background worker evaluating persistent `NotificationJob` queues, dispatching Web Push notifications via VAPID (`pywebpush`) to Apple APNs and Google FCM. Automatic job cancellation on task completion.
- **📱 Installable PWA**: Responsive app shell, service worker (`sw.js`), web manifest, offline shell caching, and dedicated iOS Safari installation instructions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide React, Service Worker, Web App Manifest |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, PyWebPush (VAPID RFC 8292), HTTPX, Pytest |
| **Database** | SQLite (Local Dev) / PostgreSQL (Production on Render/Neon/Supabase) |
| **Speech-to-Text** | Configurable Groq Whisper (`whisper-large-v3`) or OpenAI Whisper (`whisper-1`) with graceful manual note fallback |

---

## 🚀 Local Development Setup (Windows PowerShell)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

---

### Step 1: Backend Setup

Open a Windows PowerShell terminal in `smart_call_reminder/backend`:

```powershell
# Navigate to the backend directory
cd f:\antigravity\smart_call_reminder\backend

# Create a virtual environment (if not already created)
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
.\venv\Scripts\pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# Copy environment template
cp .env.example .env

# (Optional) Generate new VAPID keys for Web Push:
.\venv\Scripts\python generate_vapid.py

# Initialize database and start the backend server
.\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend server will run at:
- **API Base**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

---

### Step 2: Frontend Setup

Open a second Windows PowerShell terminal in `smart_call_reminder/frontend`:

```powershell
# Navigate to the frontend directory
cd f:\antigravity\smart_call_reminder\frontend

# Install dependencies
cmd.exe /c "npm install"

# Start Vite development server
cmd.exe /c "npm run dev"
```

The frontend will run at:
- **Local URL**: `http://localhost:5173`
- (Requests to `/api` are automatically proxied to `http://127.0.0.1:8000` via `vite.config.ts`).

---

## 🧪 Automated Test Suite

A complete test suite covering models, API routes, priority calculation, timezone resolution, notification job persistence, cancellation, rescheduling, audio validation, and Tanglish extraction is provided in `backend/tests/`.

To run the test suite:

```powershell
cd f:\antigravity\smart_call_reminder\backend
.\venv\Scripts\pytest -v
```

### Actual Test Results
```
tests/test_calls.py::test_create_call_record PASSED
tests/test_calls.py::test_create_call_record_invalid_phone PASSED
tests/test_calls.py::test_get_call_records_and_filter PASSED
tests/test_calls.py::test_update_and_delete_call_record PASSED
tests/test_dashboard_and_errors.py::test_dashboard_stats_calculation PASSED
tests/test_dashboard_and_errors.py::test_calendar_events_grouping PASSED
tests/test_dashboard_and_errors.py::test_404_error_handling PASSED
tests/test_notifications.py::test_vapid_public_key_endpoint PASSED
tests/test_notifications.py::test_push_subscription_lifecycle PASSED
tests/test_notifications.py::test_emergency_creates_immediate_notification_job PASSED
tests/test_notifications.py::test_five_day_reminder_scheduling PASSED
tests/test_notifications.py::test_completion_cancels_pending_notification_jobs PASSED
tests/test_notifications.py::test_rescheduling_due_date_reschedules_jobs PASSED
tests/test_reminders.py::test_create_reminder_with_auto_phone_link PASSED
tests/test_reminders.py::test_invalid_priority_rejected PASSED
tests/test_reminders.py::test_auto_priority_calculation PASSED
tests/test_reminders.py::test_complete_and_reopen_reminder PASSED
tests/test_transcription_and_extractor.py::test_audio_upload_invalid_extension PASSED
tests/test_transcription_and_extractor.py::test_audio_upload_unconfigured_stt_graceful PASSED
tests/test_transcription_and_extractor.py::test_tanglish_extraction_quotation_five_days PASSED
tests/test_transcription_and_extractor.py::test_tanglish_extraction_emergency_today PASSED
tests/test_transcription_and_extractor.py::test_tamil_extraction_tomorrow_call PASSED
tests/test_transcription_and_extractor.py::test_api_extract_reminder_endpoint PASSED

======================= 23 passed in 32.68s (100% SUCCESS) =======================
```

---

## 📱 Mobile Installation & Platform Notes

### iPhone (iOS Safari)
1. Open the web app in **Safari**.
2. Tap the **Share** icon (square with arrow pointing up) on Safari's bottom toolbar.
3. Tap **Add to Home Screen**.
4. Open the installed app from your home screen.
5. In **Settings**, tap **Enable Web Push Notifications** and tap **Allow** when prompted by iOS.

> **Why Manual Number Entry?**
> Apple iOS strictly sandboxes the native Phone app and Recent Calls history from third-party websites and PWAs. No web browser has access to native iPhone call logs. Smart Call Reminder features single-tap clipboard paste and manual number entry with country code prefixes (+91 default).

---

## 🚢 Production Deployment Guide

### 1. Database Provisioning (PostgreSQL)
Create a managed PostgreSQL database instance on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Render](https://render.com).
Copy the connection string:
```
DATABASE_URL=postgresql://user:password@ep-host.neon.tech/smart_call_reminder?sslmode=require
```

### 2. Backend Deployment (Render / Railway)
1. Push the code repository to **GitHub**.
2. In Render, create a new **Web Service** connected to the repository root with root directory `backend`.
3. Set **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
4. Set **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Configure Environment Variables in Render:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://smart-call-reminder.vercel.app`).
   - `VAPID_PUBLIC_KEY`: Output from `python generate_vapid.py`.
   - `VAPID_PRIVATE_KEY`: Private key string.
   - `VAPID_CLAIM_EMAIL`: `mailto:admin@yourdomain.com`
   - `GROQ_API_KEY`: (Optional) Free Groq API key for instant Tamil/English Whisper STT.
   - `RETAIN_AUDIO_FILES`: `false`

### 3. Frontend Deployment (Vercel)
1. In Vercel, import the GitHub repository and select the `frontend` directory as the Root Directory.
2. Build Settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api`
4. Deploy!
