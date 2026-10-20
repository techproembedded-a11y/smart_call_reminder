import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Reminder } from '../types/reminder';
import type { DashboardStats } from '../types/dashboard';
import { ReminderCard } from '../components/ui/ReminderCard';
import {
  ListTodo,
  CalendarCheck,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  PhoneCall,
} from 'lucide-react';

interface DashboardPageProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onShowToast }) => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, remindersData] = await Promise.all([
        api.getDashboardStats(),
        api.getReminders(),
      ]);
      setStats(statsData);
      setReminders(remindersData);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleComplete = async (id: number) => {
    try {
      const updated = await api.completeReminder(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      // Refresh stats
      const newStats = await api.getDashboardStats();
      setStats(newStats);
      onShowToast(
        'success',
        updated.completed ? 'Reminder marked as completed!' : 'Reminder reopened.'
      );
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to update reminder status.');
    }
  };

  // Filtering reminders
  const filteredReminders = reminders.filter((r) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = r.task_title.toLowerCase().includes(q);
      const matchVoice = r.voice_text?.toLowerCase().includes(q) || false;
      const matchPhone = r.phone_number?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchVoice && !matchPhone) return false;
    }

    // Tab filter
    if (activeFilter === 'emergency') {
      return r.priority === 'emergency' && !r.completed;
    } else if (activeFilter === 'today') {
      const due = new Date(r.due_datetime);
      const now = new Date();
      return (
        due.getFullYear() === now.getFullYear() &&
        due.getMonth() === now.getMonth() &&
        due.getDate() === now.getDate() &&
        !r.completed
      );
    } else if (activeFilter === 'overdue') {
      const due = new Date(r.due_datetime);
      return due.getTime() < Date.now() && !r.completed;
    } else if (activeFilter === 'upcoming') {
      const due = new Date(r.due_datetime);
      return due.getTime() >= Date.now() && !r.completed;
    } else if (activeFilter === 'completed') {
      return r.completed;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Call Reminders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Privacy-first task tracking for your voice notes and phone calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {/* Modern Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Reminders */}
        <div
          onClick={() => setActiveFilter('all')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
            <ListTodo className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats ? stats.total_reminders : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">All registered tasks</div>
        </div>

        {/* Today's Reminders */}
        <div
          onClick={() => setActiveFilter('today')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'today'
              ? 'border-orange-500 ring-2 ring-orange-500/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats ? stats.today_reminders : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Due today</div>
        </div>

        {/* Emergency Tasks */}
        <div
          onClick={() => setActiveFilter('emergency')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'emergency'
              ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50/20 dark:bg-red-950/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Emergency</span>
            <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {stats ? stats.emergency_tasks : '—'}
          </div>
          <div className="mt-1 text-[11px] text-red-500/80 font-medium">Immediate action</div>
        </div>

        {/* Overdue Tasks */}
        <div
          onClick={() => setActiveFilter('overdue')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'overdue'
              ? 'border-orange-600 ring-2 ring-orange-600/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-orange-600 dark:text-orange-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-500">
            {stats ? stats.overdue_tasks : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Past deadline</div>
        </div>

        {/* Upcoming Reminders */}
        <div
          onClick={() => setActiveFilter('upcoming')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'upcoming'
              ? 'border-blue-600 ring-2 ring-blue-600/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats ? stats.upcoming_reminders : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Future scheduled</div>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => setActiveFilter('completed')}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
            activeFilter === 'completed'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Done</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats ? stats.completed_tasks : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Completed items</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone number or note text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'emergency', label: 'Emergency' },
            { id: 'today', label: 'Today' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Done' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>Reminders</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredReminders.length} items)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
              />
            ))}
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
              <PhoneCall className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No reminders found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
              {searchQuery
                ? 'No reminders match your current search query or filter.'
                : 'You have not added any call reminders yet. Record a voice note or enter a phone number to get started.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/add')}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Record or Add Call Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggleComplete={handleToggleComplete}
                onSelect={(r: Reminder) => navigate(`/reminder/${r.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
