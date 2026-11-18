import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock, Users } from 'lucide-react';
import {
  AgeCategory,
  EventSchedule,
  HOUSES,
  HouseId,
  TeamCard,
} from '../../types/sports';
import {
  countHouseEntriesForSchedule,
  formatScheduleTime,
  sortSchedulesByTime,
} from '../../utils/sportsLogic';

interface HouseScheduleViewProps {
  house: HouseId;
  schedules: EventSchedule[];
  ageCategories: AgeCategory[];
  teamCard?: TeamCard;
}

export const HouseScheduleView: React.FC<HouseScheduleViewProps> = ({
  house,
  schedules,
  ageCategories,
  teamCard,
}) => {
  const meta = HOUSES[house];
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(ageCategories.map((c) => c.name));
    schedules.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [ageCategories, schedules]);

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

  const cardEntries = teamCard?.entries ?? [];
  const eventsWithHouseEntries = useMemo(
    () =>
      sortedSchedules.filter(
        (s) => countHouseEntriesForSchedule(cardEntries, s) > 0
      ).length,
    [sortedSchedules, cardEntries]
  );

  const firstStartTime = sortedSchedules[0]
    ? formatScheduleTime(sortedSchedules[0].startTime)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Upcoming Meet Schedule
          </h2>
          <p className="text-sm text-zinc-400">
            Track official event start times and monitor which upcoming events feature{' '}
            <span style={{ color: meta.colorHex }} className="font-semibold">
              {meta.name}
            </span>{' '}
            entries.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/70 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Scheduled Events</span>
          </div>
          <div className="text-2xl font-bold font-mono-tabular text-white">
            {sortedSchedules.length}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/70 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Events With {meta.shortName} Athletes</span>
          </div>
          <div
            className="text-2xl font-bold font-mono-tabular"
            style={{ color: meta.colorHex }}
          >
            {eventsWithHouseEntries}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/70 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>First Call Time</span>
          </div>
          <div className="text-2xl font-bold font-mono-tabular text-white">
            {firstStartTime}
          </div>
        </div>
      </div>

      {/* Filter & Schedule Table */}
      <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">
            Event Timetable ({filteredSchedules.length})
          </h3>
          <div className="flex items-center gap-2">
            <label htmlFor="house-schedule-filter" className="text-xs text-zinc-400">
              Category:
            </label>
            <select
              id="house-schedule-filter"
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
                <th className="py-2.5 text-right font-medium">
                  {meta.shortName} Entries
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-zinc-500">
                    No events scheduled for the selected category yet.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((item) => {
                  const entryCount = countHouseEntriesForSchedule(cardEntries, item);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
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
                        {entryCount > 0 ? (
                          <span
                            className="inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-mono-tabular font-semibold"
                            style={{
                              borderColor: `${meta.colorHex}55`,
                              backgroundColor: `${meta.colorHex}1A`,
                              color: meta.colorHex,
                            }}
                          >
                            {entryCount} athlete{entryCount === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-xs font-mono-tabular text-zinc-500">
                            0 entries
                          </span>
                        )}
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
  );
};
