import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock, Edit3, Plus, Trash2, X } from 'lucide-react';
import { AgeCategory, EventSchedule, GameDefinition } from '../../types/sports';
import { formatScheduleTime, sortSchedulesByTime } from '../../utils/sportsLogic';

interface AdminSchedulesProps {
  schedules: EventSchedule[];
  ageCategories: AgeCategory[];
  games: GameDefinition[];
  onUpsertSchedule: (
    payload: Omit<EventSchedule, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  onDeleteSchedule: (scheduleId: string) => void;
}

export const AdminSchedules: React.FC<AdminSchedulesProps> = ({
  schedules,
  ageCategories,
  games,
  onUpsertSchedule,
  onDeleteSchedule,
}) => {
  const defaultCategory = ageCategories[0]?.name ?? 'U-16';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [eventName, setEventName] = useState<string>('');
  const [category, setCategory] = useState<string>(defaultCategory);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const categoryOptions = useMemo(() => {
    const names = ageCategories.map((c) => c.name);
    if (!names.includes('Open / All')) {
      names.push('Open / All');
    }
    return names;
  }, [ageCategories]);

  const sortedSchedules = useMemo(
    () => sortSchedulesByTime(schedules),
    [schedules]
  );

  const filteredSchedules = useMemo(
    () =>
      filterCategory === 'all'
        ? sortedSchedules
        : sortedSchedules.filter((s) => s.category === filterCategory),
    [sortedSchedules, filterCategory]
  );

  const resetForm = () => {
    setEditingId(null);
    setStartTime('09:00');
    setEventName('');
    setCategory(ageCategories[0]?.name ?? 'Open / All');
  };

  const handleStartEdit = (item: EventSchedule) => {
    setEditingId(item.id);
    setStartTime(item.startTime);
    setEventName(item.eventName);
    setCategory(item.category);
    setFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onUpsertSchedule({
      id: editingId ?? undefined,
      startTime,
      eventName,
      category,
    });
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.error ?? 'Unable to save schedule.' });
      return;
    }
    setFeedback({
      type: 'ok',
      text: editingId
        ? `Updated "${eventName.trim()}" at ${formatScheduleTime(startTime)}.`
        : `Scheduled "${eventName.trim()}" (${category}) at ${formatScheduleTime(startTime)}.`,
    });
    resetForm();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Meet Event Schedule Manager
          </h2>
          <p className="text-sm text-zinc-400">
            Define official event start times, event names, and age categories. All four House Portals receive updates in real time.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/70 px-4 py-2 text-xs text-zinc-300 font-mono-tabular">
          {schedules.length} Scheduled Event{schedules.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add or Edit Schedule */}
        <section className="lg:col-span-5 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">
                {editingId ? 'Edit Scheduled Event' : 'Add Scheduled Event'}
              </h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="schedule-start-time"
                className="block text-xs font-medium text-zinc-400 mb-1"
              >
                Start Time
              </label>
              <input
                id="schedule-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm font-mono-tabular text-white [color-scheme:dark] focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="schedule-event-name"
                className="block text-xs font-medium text-zinc-400 mb-1"
              >
                Event Name
              </label>
              <input
                id="schedule-event-name"
                type="text"
                required
                maxLength={80}
                list="schedule-game-suggestions"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. 100m Heats or Cricket Finals"
                className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
              <datalist id="schedule-game-suggestions">
                {games.map((g) => (
                  <option key={g.id} value={g.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="schedule-category"
                className="block text-xs font-medium text-zinc-400 mb-1"
              >
                Category
              </label>
              <select
                id="schedule-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {feedback && (
              <div
                role="status"
                className={`rounded-lg border px-3 py-2 text-xs ${
                  feedback.type === 'err'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {editingId ? 'Save Schedule Changes' : 'Add to Schedule'}
            </button>
          </form>
        </section>

        {/* Right Table: Chronological Timetable */}
        <section className="lg:col-span-7 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">
                Official Meet Timetable ({filteredSchedules.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="admin-schedule-filter" className="sr-only">
                Filter schedule by category
              </label>
              <select
                id="admin-schedule-filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1.5 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                  <th className="py-2.5 pr-4 font-medium">Start Time</th>
                  <th className="py-2.5 pr-4 font-medium">Event Name</th>
                  <th className="py-2.5 pr-4 font-medium">Category</th>
                  <th className="py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-zinc-500">
                      No events scheduled for this filter yet.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isEditing ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <div className="font-mono-tabular font-semibold text-white">
                            {formatScheduleTime(item.startTime)}
                          </div>
                          <div className="font-mono-tabular text-[11px] text-zinc-500">
                            {item.startTime} (24h)
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-medium text-zinc-100">
                          {item.eventName}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs font-mono-tabular text-zinc-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              aria-label={`Edit ${item.eventName}`}
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingId === item.id) resetForm();
                                onDeleteSchedule(item.id);
                              }}
                              aria-label={`Delete ${item.eventName}`}
                              className="rounded p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
