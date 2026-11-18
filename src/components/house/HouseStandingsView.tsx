import React from 'react';
import { Lock } from 'lucide-react';
import { HOUSES, HouseId, ScoreEntry } from '../../types/sports';
import { HouseStanding } from '../../utils/sportsLogic';
import { HouseTag } from '../HouseBadge';

interface HouseStandingsViewProps {
  currentHouse: HouseId;
  standings: HouseStanding[];
  scores: ScoreEntry[];
}

export const HouseStandingsView: React.FC<HouseStandingsViewProps> = ({
  currentHouse,
  standings,
  scores,
}) => {
  const topPoints = Math.max(...standings.map((s) => s.totalPoints), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Live Total Points & Standings
          </h2>
          <p className="text-sm text-zinc-400">
            Real-time championship rank comparison across Mars, Jupiter, Venus, and Uranus Houses.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300 whitespace-nowrap">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Admin Verified · Read Only
        </span>
      </div>

      {/* 4-House Standings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {standings.map((item) => {
          const meta = HOUSES[item.house];
          const isCurrent = item.house === currentHouse;
          const barWidth = Math.max(
            0,
            Math.min(100, Math.round((item.totalPoints / topPoints) * 100))
          );

          return (
            <div
              key={item.house}
              className={`rounded-lg border p-5 space-y-4 ${
                isCurrent
                  ? `${meta.borderClass} ${meta.softBgClass}`
                  : 'border-zinc-800 bg-[#0F172A]/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-xs shrink-0"
                    style={{ backgroundColor: meta.colorHex }}
                    aria-hidden="true"
                  />
                  <span className="text-base font-semibold text-white">
                    {meta.name}
                  </span>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-zinc-300">
                  #{item.rank}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-display text-4xl font-bold text-white font-mono-tabular">
                  {item.totalPoints}
                </span>
                <span className="text-xs text-zinc-400">
                  {isCurrent ? 'Your House' : 'points'}
                </span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: meta.colorHex,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono-tabular">
                <span>1st: {item.goldCount}</span>
                <span>2nd: {item.silverCount}</span>
                <span>3rd: {item.bronzeCount}</span>
                <span>Rec: {item.recordCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Read-Only Event Points History */}
      <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Official Event Points History
          </h3>
          <span className="text-xs text-zinc-400 font-mono-tabular">
            {scores.length} entries
          </span>
        </div>

        {scores.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No event scores posted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4">House</th>
                  <th className="py-3 px-4">Event & Age Category</th>
                  <th className="py-3 px-4">Place</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {scores.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 px-4">
                      <HouseTag house={entry.house} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{entry.eventName}</div>
                      <div className="text-xs text-zinc-400">
                        {entry.ageCategory}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{entry.place}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                        entry.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {entry.points >= 0 ? `+${entry.points}` : entry.points}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-400 font-mono-tabular">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
