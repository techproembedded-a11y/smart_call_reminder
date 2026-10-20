import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { PriorityType } from '../types/reminder';
import { PRIORITY_MAP } from '../utils/priority';
import { getLocalIsoString } from '../utils/date';
import { AudioRecorder } from '../components/ui/AudioRecorder';
import { AudioUploader } from '../components/ui/AudioUploader';
import {
  Phone,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  AlertCircle,
  Save,
  CheckCircle,
  ClipboardPaste,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface AddReminderPageProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
];

export const AddReminderPage: React.FC<AddReminderPageProps> = ({ onShowToast }) => {
  const navigate = useNavigate();

  // Phone details
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  
  // Call timestamp (defaults to current time)
  const [callDateTime, setCallDateTime] = useState<string>(getLocalIsoString());

  // Audio & Transcription
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [voiceText, setVoiceText] = useState<string>('');
  const [transcriptionInfo, setTranscriptionInfo] = useState<string | null>(null);

  // Smart Extraction
  const [extracting, setExtracting] = useState<boolean>(false);
  const [extractionSuggestion, setExtractionSuggestion] = useState<any | null>(null);

  // Task details
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [dueDateTime, setDueDateTime] = useState<string>(() => {
    // Default: 4 hours from now
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return getLocalIsoString(d);
  });
  const [priority, setPriority] = useState<PriorityType>('due_today');
  const [autoPriority, setAutoPriority] = useState<boolean>(false);

  // Submitting
  const [saving, setSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Paste phone number from clipboard
  const handlePastePhone = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Clean text
        let clean = text.trim();
        // If text starts with +, detect country code
        const matchedCountry = COUNTRY_CODES.find((c) => clean.startsWith(c.code));
        if (matchedCountry) {
          setCountryCode(matchedCountry.code);
          clean = clean.substring(matchedCountry.code.length).trim();
        }
        setPhoneNumber(clean.replace(/[^\d]/g, ''));
        onShowToast('info', 'Pasted phone number from clipboard.');
      }
    } catch {
      onShowToast('error', 'Clipboard permission denied or unavailable.');
    }
  };

  // Perform backend speech-to-text transcription
  const handleTranscribe = async () => {
    const audioSource = uploadedFile || recordedBlob;
    if (!audioSource) {
      onShowToast('error', 'Please record audio or upload an audio file first.');
      return;
    }

    try {
      setTranscribing(true);
      setTranscriptionInfo(null);
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else if (recordedBlob) {
        formData.append('file', recordedBlob, 'recording.webm');
      }

      const res = await api.transcribeAudio(formData);
      if (res.text) {
        setVoiceText(res.text);
        if (res.message) {
          setTranscriptionInfo(res.message);
        } else {
          onShowToast('success', `Audio transcribed via ${res.provider.toUpperCase()}!`);
        }
      } else {
        onShowToast('info', res.message || 'No speech detected in audio.');
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Transcription request failed.');
    } finally {
      setTranscribing(false);
    }
  };

  // Extract reminder details (Smart extraction heuristic + AI)
  const handleExtractReminder = async () => {
    if (!voiceText.trim()) {
      onShowToast('error', 'Please enter or transcribe a note before extracting details.');
      return;
    }

    try {
      setExtracting(true);
      const fullPhone = phoneNumber.trim() ? `${countryCode}${phoneNumber.trim()}` : undefined;
      const res = await api.extractReminder({
        transcript: voiceText,
        phone_number: fullPhone,
        call_datetime: new Date(callDateTime).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      });

      setExtractionSuggestion(res);
      // Populate suggested fields
      if (res.task_title) setTaskTitle(res.task_title);
      if (res.priority && res.priority in PRIORITY_MAP) setPriority(res.priority as PriorityType);
      if (res.due_datetime) {
        setDueDateTime(getLocalIsoString(new Date(res.due_datetime)));
      }
      onShowToast('success', 'Extracted reminder details! You can verify or edit them below.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Could not extract reminder details.');
    } finally {
      setExtracting(false);
    }
  };

  // Save Reminder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!phoneNumber.trim()) {
      setValidationError('Please enter a phone number.');
      return;
    }

    if (!taskTitle.trim()) {
      setValidationError('Please enter a task title (e.g. "Send quotation").');
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber.trim().replace(/[^\d]/g, '')}`;

    try {
      setSaving(true);
      await api.createReminder({
        phone_number: fullPhone,
        call_datetime: new Date(callDateTime).toISOString(),
        task_title: taskTitle.trim(),
        voice_text: voiceText.trim() || undefined,
        due_datetime: new Date(dueDateTime).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        priority,
        auto_priority: autoPriority,
      });

      onShowToast('success', 'Call reminder saved and notification scheduled!');
      navigate('/');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Add Call Note & Reminder
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Save action items from your call. No contact access or contact names required.
        </p>
      </div>

      {/* iOS Sandbox Notice */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Why manual entry? </span>
          Web applications and PWAs cannot directly read your iPhone's native Recent Calls history due to iOS security sandboxing. You can paste or type the number below.
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Call Metadata */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Call Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number with Country Code */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handlePastePhone}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Call Date & Time */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Call Date & Time
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={callDateTime}
                  onChange={(e) => setCallDateTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Audio Recording & Transcription */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Voice Note & Speech-to-Text (Optional)
            </h2>
            <span className="text-xs text-slate-400">Tamil, English & Tanglish supported</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AudioRecorder
              onAudioReady={(blob: Blob | null) => setRecordedBlob(blob)}
              disabled={transcribing}
            />
            <AudioUploader
              onFileSelected={(file: File | null) => setUploadedFile(file)}
              disabled={transcribing}
            />
          </div>

          {(recordedBlob || uploadedFile) && (
            <button
              type="button"
              onClick={handleTranscribe}
              disabled={transcribing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
            >
              {transcribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transcribing Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Transcribe Audio to Text</span>
                </>
              )}
            </button>
          )}

          {transcriptionInfo && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              {transcriptionInfo}
            </div>
          )}

          {/* Editable Transcription / Typed Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Call Note / Transcription Text
              </label>
              {voiceText.trim() && (
                <button
                  type="button"
                  onClick={handleExtractReminder}
                  disabled={extracting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {extracting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Extract Reminder Details</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              placeholder="Type your notes or speak your voice note (e.g., 'Ravi ku 5 days la quotation send pannanum' or 'Emergency, innaikke mudikkanum')..."
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Extraction Confirmation Badge */}
          {extractionSuggestion && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span>Smart Extracted Suggestions Applied:</span>
              </div>
              <p>
                • Task: <span className="font-semibold">{extractionSuggestion.task_title}</span>
              </p>
              <p>
                • Priority: <span className="font-semibold">{extractionSuggestion.priority}</span> ({extractionSuggestion.explanation || 'Analyzed'})
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Reminder Schedule & Priority */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            3. Task & Reminder Schedule
          </h2>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Send quotation, Follow up on payment..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Due Date & Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="datetime-local"
                required
                value={dueDateTime}
                onChange={(e) => setDueDateTime(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Explicit Priority Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority Tier
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPriority}
                  onChange={(e) => setAutoPriority(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-calculate based on due date</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  'emergency',
                  'due_today',
                  '2_day',
                  '3_day',
                  '5_day',
                ] as PriorityType[]
              ).map((pKey) => {
                const cfg = PRIORITY_MAP[pKey];
                const isSelected = priority === pKey && !autoPriority;
                return (
                  <button
                    key={pKey}
                    type="button"
                    disabled={autoPriority}
                    onClick={() => setPriority(pKey)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white ring-2 ring-blue-500/30 bg-slate-50 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    } ${autoPriority ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className="w-3 h-3 rounded-full mb-1.5"
                      style={{ backgroundColor: cfg.colorHex }}
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {cfg.colorHex}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Reminder...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Reminder</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
