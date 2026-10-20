import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { CallRecord } from '../types/call';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import type { PriorityType } from '../types/reminder';
import { formatDate } from '../utils/date';
import {
  PhoneCall,
  Search,
  Plus,
  Clock,
  ChevronRight,
  ShieldCheck,
  Phone,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface CallRecordsPageProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const CallRecordsPage: React.FC<CallRecordsPageProps> = ({ onShowToast }) => {
  const navigate = useNavigate();

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New call modal form state
  const [modalPhone, setModalPhone] = useState<string>('+91');
  const [modalCallTime, setModalCallTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [modalSaving, setModalSaving] = useState<boolean>(false);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const data = await api.getCalls({ phone: searchPhone.trim() || undefined });
      setCalls(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to fetch call records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [searchPhone]);

  const handleCreateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPhone.trim() || modalPhone.trim().length < 5) {
      onShowToast('error', 'Please enter a valid phone number.');
      return;
    }

    try {
      setModalSaving(true);
      await api.createCall({
        phone_number: modalPhone.trim(),
        call_datetime: new Date(modalCallTime).toISOString(),
      });
      onShowToast('success', 'Call record added successfully!');
      setShowAddModal(false);
      setModalPhone('+91');
      fetchCalls();
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to create call record.');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Recent Call Records
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse call notes and reminders indexed strictly by phone number.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Call Record</span>
          </button>
        </div>
      </div>

      {/* iPhone Limitation Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            iPhone & Mobile Browser Sandbox Note:{' '}
          </span>
          Mobile operating systems (iOS Safari and Android) protect user privacy by strictly isolating native phone dialer logs from web apps. Smart Call Reminder lets you effortlessly log, paste, and attach voice notes to any phone number without requiring address book access.
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by phone number..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Call Records List */}
      <div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
              />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 shadow-sm">
            <Phone className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No Call Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a call note or record to view communication history.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-base tracking-wide">
                        {call.phone_number}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Called: {formatDate(call.call_datetime)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/add?phone=${encodeURIComponent(call.phone_number)}`)}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reminder to this Number</span>
                  </button>
                </div>

                {/* Associated Reminders */}
                <div className="mt-3 space-y-2">
                  {call.reminders && call.reminders.length > 0 ? (
                    call.reminders.map((rem: any) => (
                      <div
                        key={rem.id}
                        onClick={() => navigate(`/reminder/${rem.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {rem.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-medium text-slate-800 dark:text-slate-200 truncate ${
                              rem.completed ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {rem.task_title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge
                            priority={rem.priority as PriorityType}
                            completed={rem.completed}
                          />
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      No task reminders attached yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Add Call Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Call Record Manually
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a record for a phone call to start attaching notes and reminders.
            </p>

            <form onSubmit={handleCreateCall} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+919876543210"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Call Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={modalCallTime}
                  onChange={(e) => setModalCallTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : 'Save Call Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
