import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Reminder } from '../types/reminder';
import type { CalendarDayGroup } from '../types/dashboard';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { getPriorityConfig } from '../utils/priority';
import { formatDate, formatTime } from '../utils/date';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface CalendarPageProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onShowToast }) => {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarGroups, setCalendarGroups] = useState<CalendarDayGroup[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Quick reschedule state
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const fetchCalendar = async () => {
    try {
      const data = await api.getCalendar(monthStr);
      setCalendarGroups(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to fetch calendar data.');
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [monthStr]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().slice(0, 10));
  };

  // Build 35 or 42 grid cells for the month
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Map of date string -> group
  const groupMap = new Map<string, CalendarDayGroup>();
  calendarGroups.forEach((g) => groupMap.set(g.date, g));

  const selectedGroup = groupMap.get(selectedDateStr);
  const selectedReminders = selectedGroup ? selectedGroup.reminders : [];

  const handleQuickReschedule = async (reminder: Reminder) => {
    if (!rescheduleDateTime) return;
    try {
      await api.updateReminder(reminder.id, {
        due_datetime: new Date(rescheduleDateTime).toISOString(),
      });
      onShowToast('success', 'Reminder rescheduled successfully!');
      setReschedulingId(null);
      fetchCalendar();
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to reschedule.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Reminder Calendar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse schedule by month and date with priority indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            Today
          </button>

          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[110px] text-center">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grid Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        {/* Day header names */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="py-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl opacity-30" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDateStr === dayStr;
            const group = groupMap.get(dayStr);
            const count = group ? group.count : 0;

            const isToday =
              new Date().toISOString().slice(0, 10) === dayStr;

            return (
              <div
                key={dayStr}
                onClick={() => setSelectedDateStr(dayStr)}
                className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {count > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {count}
                    </span>
                  )}
                </div>

                {/* Priority Colored Dots */}
                {group && (
                  <div className="flex items-center gap-1 flex-wrap mt-auto">
                    {group.reminders.slice(0, 4).map((rem: Reminder, rIdx: number) => {
                      const cfg = getPriorityConfig(rem.priority, rem.completed);
                      return (
                        <span
                          key={rIdx}
                          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cfg.colorHex }}
                          title={`${rem.task_title} (${cfg.label})`}
                        />
                      );
                    })}
                    {group.reminders.length > 4 && (
                      <span className="text-[9px] text-slate-400 leading-none">
                        +{group.reminders.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Reminders Agenda */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>Reminders for {formatDate(selectedDateStr + 'T00:00:00')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedReminders.length} task{selectedReminders.length === 1 ? '' : 's'} scheduled for this date
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/add?date=${selectedDateStr}`)}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold transition-colors"
          >
            + Add on this date
          </button>
        </div>

        {selectedReminders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            No reminders scheduled for this date.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedReminders.map((rem: Reminder) => {
              const cfg = getPriorityConfig(rem.priority, rem.completed);
              const isRescheduling = reschedulingId === rem.id;

              return (
                <div
                  key={rem.id}
                  className={`p-4 rounded-xl border ${cfg.borderLeft} bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <PriorityBadge priority={rem.priority} completed={rem.completed} />
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due {formatTime(rem.due_datetime)}</span>
                      </div>
                    </div>

                    <h4
                      onClick={() => navigate(`/reminder/${rem.id}`)}
                      className={`text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer ${
                        rem.completed ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {rem.task_title}
                    </h4>

                    {rem.phone_number && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <Phone className="w-3 h-3 text-blue-600" />
                        <span>{rem.phone_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Reschedule inline action */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isRescheduling ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="datetime-local"
                          value={rescheduleDateTime}
                          onChange={(e) => setRescheduleDateTime(e.target.value)}
                          className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(rem)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          title="Save new date"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReschedulingId(null)}
                          className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setReschedulingId(rem.id);
                            setRescheduleDateTime(rem.due_datetime.slice(0, 16));
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Reschedule</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/reminder/${rem.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          View Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
