import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Reminder, PriorityType } from '../types/reminder';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { PRIORITY_MAP, getPriorityConfig } from '../utils/priority';
import { formatDate } from '../utils/date';
import {
  ArrowLeft,
  Phone,
  Clock,
  Trash2,
  CheckCircle,
  RotateCcw,
  Save,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ReminderDetailsPageProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ReminderDetailsPage: React.FC<ReminderDetailsPageProps> = ({ onShowToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Edit fields
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [voiceText, setVoiceText] = useState<string>('');
  const [dueDateTime, setDueDateTime] = useState<string>('');
  const [priority, setPriority] = useState<PriorityType>('due_today');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [callDateTime, setCallDateTime] = useState<string>('');

  const fetchReminder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getReminder(Number(id));
      setReminder(data);
      setTaskTitle(data.task_title);
      setVoiceText(data.voice_text || '');
      setDueDateTime(data.due_datetime.slice(0, 16));
      setPriority(data.priority);
      setPhoneNumber(data.phone_number || '');
      if (data.call_datetime) {
        setCallDateTime(data.call_datetime.slice(0, 16));
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to fetch reminder details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminder();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reminder) return;

    if (!taskTitle.trim()) {
      onShowToast('error', 'Task title cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateReminder(Number(id), {
        task_title: taskTitle.trim(),
        voice_text: voiceText.trim() || undefined,
        due_datetime: new Date(dueDateTime).toISOString(),
        priority,
      });

      // If call record phone number changed and call_record_id exists
      if (reminder.call_record_id && phoneNumber !== reminder.phone_number) {
        await api.updateCall(reminder.call_record_id, {
          phone_number: phoneNumber.trim(),
          call_datetime: callDateTime ? new Date(callDateTime).toISOString() : undefined,
        });
      }

      setReminder(updated);
      onShowToast('success', 'Reminder updated and notifications rescheduled!');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update reminder.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!id) return;
    try {
      const updated = await api.completeReminder(Number(id));
      setReminder(updated);
      onShowToast(
        'success',
        updated.completed
          ? 'Marked as completed! Pending notifications cancelled.'
          : 'Reminder reopened! Notifications rescheduled.'
      );
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await api.deleteReminder(Number(id));
      onShowToast('success', 'Reminder deleted.');
      navigate('/');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to delete reminder.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading reminder details...</p>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold">Reminder Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This reminder may have been deleted.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const priorityCfg = getPriorityConfig(reminder.priority, reminder.completed);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Complete / Reopen button */}
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
              reminder.completed
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {reminder.completed ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Task</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark as Completed</span>
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
            title="Delete reminder"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Status Header Card */}
      <div
        className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm ${priorityCfg.borderLeft}`}
      >
        <div className="flex items-center justify-between gap-3">
          <PriorityBadge priority={reminder.priority} completed={reminder.completed} size="md" />
          <span className="text-xs text-slate-400">Created {formatDate(reminder.created_at)}</span>
        </div>
        <h1
          className={`text-xl sm:text-2xl font-bold mt-2 text-slate-900 dark:text-white ${
            reminder.completed ? 'line-through text-slate-400' : ''
          }`}
        >
          {reminder.task_title}
        </h1>
        {reminder.completed && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            Completed on {formatDate(reminder.completed_at || reminder.updated_at)}. Notifications are cancelled.
          </p>
        )}
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Edit Details & Schedule
          </h2>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Due Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date & Time
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
            <p className="text-[11px] text-slate-400 mt-1">
              Editing the due date automatically reschedules pending push notification jobs.
            </p>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
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
                const isSelected = priority === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPriority(pKey)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white ring-2 ring-blue-500/30 bg-slate-50 dark:bg-slate-800 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mb-1"
                      style={{ backgroundColor: cfg.colorHex }}
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call Note / Voice Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Call Note / Voice Transcript
            </label>
            <textarea
              rows={3}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Reminder?</h3>
            <p className="text-xs text-slate-500 mt-1">
              This action cannot be undone. All pending notifications scheduled for this task will be cancelled immediately.
            </p>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
