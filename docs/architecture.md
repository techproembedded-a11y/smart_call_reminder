# Smart Call Reminder — Architecture & System Design

## 1. System Overview

**Smart Call Reminder** is a privacy-first, responsive Progressive Web App (PWA) designed to capture post-call action items, transcribe voice notes in Tamil, English, and Tanglish, schedule multi-tier priority reminders, and reliably deliver notifications across mobile (iOS Safari via PWA Home Screen, Android Chrome) and desktop devices.

### Privacy-First Principle
- **Zero Contact Access**: The application intentionally does not request browser contact permissions, nor does it store contact names, address books, or external directories.
- **Phone Number Identifier**: All call notes and tasks are keyed solely to the phone number and call timestamp.
- **Audio Minimization**: Voice uploads are kept in temporary storage only for transcription and purged immediately unless explicit audio archiving is configured.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              Client Devices (PWA)                                 |
|  - iOS 16.4+ (Safari -> Add to Home Screen -> Web Push API)                       |
|  - Android (Chrome / Edge / Firefox -> PWA Standalone / Browser)                  |
|  - Desktop / Laptop (Chrome / Safari / Edge PWA)                                  |
+-----------------------------------------+-----------------------------------------+
                                          |
                      HTTPS REST API / Web Push Subscription
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             FastAPI Backend Layer                                 |
|                                                                                   |
|  +--------------------+  +-----------------------+  +--------------------------+  |
|  | Call & Note API    |  | Transcription Engine  |  | Smart Reminder Extractor |  |
|  | - CRUD Calls       |  | - Whisper (Groq/OAI)  |  | - Tamil/Tanglish/English |  |
|  | - CRUD Reminders   |  | - Audio file validator|  | - Rule-based + AI parser |  |
|  +--------------------+  +-----------------------+  +--------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Scheduled Notification Dispatcher (Background Worker)                       |  |
|  | - Persistent NotificationJob queue evaluation                               |  |
|  | - Emergency immediate push dispatch                                         |  |
|  | - Due-date offset calculation (1d, 2d, 3d, 5d lead notifications)           |  |
|  | - WebPush via VAPID (pywebpush) -> Apple APNs / Google FCM Push Service     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             Persistence Layer                                     |
|  - SQLite (Local Development) / PostgreSQL (Production on Render/Neon/Supabase)  |
|  - Tables: call_records, reminders, push_subscriptions, notification_jobs         |
+-----------------------------------------------------------------------------------+
```

---

## 3. Key Components

### 3.1 Frontend (React + Vite + TypeScript + Tailwind CSS)
- **App Shell**: Single-page application with responsive layouts (Desktop sidebar, Mobile bottom navigation).
- **Service Worker (`sw.js`)**: Handles background push events, offline caching of static assets, badge incrementing, and notification click navigation.
- **Audio Capture**: Browser `MediaRecorder` API recording compressed WebM/OGG/MP4 audio with live elapsed timers and audio playback.
- **Dynamic Priority & Color Engine**: Canonical mapping for Emergency (Red `#DC2626`), Due Today (Orange-Red `#EA580C`), 2-Day (Orange `#F59E0B`), 3-Day (Yellow `#EAB308`), 5-Day (Blue `#2563EB`), and Completed (Green `#16A34A`).
- **Calendar Engine**: Interactive monthly grid and day-view agenda with visual color dots, quick rescheduling, and filters.

### 3.2 Backend (FastAPI + SQLAlchemy)
- **Async & Thread-safe Architecture**: Background notification dispatcher running on a synchronized loop checking pending jobs every 20 seconds.
- **Transcription Service**: Pluggable provider supporting Groq Whisper (blazing fast, multilingual Tamil/English), OpenAI Whisper, or graceful fallback with detailed diagnostic logs when API keys are not supplied.
- **Smart Extractor**: Heuristic rule engine + optional LLM that parses colloquial Tamil and Tanglish terms (e.g., "innaikke" -> today, "naalaikku" -> tomorrow, "five days la" -> in 5 days, "quotation anupanum" -> send quotation).
- **Push Notification Service**: RFC 8292 compliant Web Push utilizing VAPID authentication with automatic retry and invalid endpoint pruning.

### 3.3 Database Design
- Normalized schema with foreign keys, cascading deletes, index on `due_datetime`, `phone_number`, and `status`.
- Complete separation between due dates and priorities.
