import React, { useState } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import {
  AgeCategory,
  GameDefinition,
  HOUSE_ORDER,
  HOUSES,
  HouseId,
  PlaceType,
  ScoreEntry,
} from '../../types/sports';
import { HouseStanding } from '../../utils/sportsLogic';
import { HouseTag } from '../HouseBadge';

interface AdminStandingsProps {
  standings: HouseStanding[];
  scores: ScoreEntry[];
  ageCategories: AgeCategory[];
  games: GameDefinition[];
  onAddScore: (payload: {
    house: HouseId;
    eventName: string;
    ageCategory: string;
    place: PlaceType;
    points: number;
    note?: string;
  }) => void;
  onDeleteScore: (scoreId: string) => void;
}

const DEFAULT_PLACE_POINTS: Record<PlaceType, number> = {
  '1st': 10,
  '2nd': 7,
  '3rd': 5,
  'Record Bonus': 5,
  Deduction: -5,
};

export const AdminStandings: React.FC<AdminStandingsProps> = ({
  standings,
  scores,
  ageCategories,
  games,
  onAddScore,
  onDeleteScore,
}) => {
  const [house, setHouse] = useState<HouseId>('mars');
  const [eventName, setEventName] = useState<string>('100m Boys');
  const [ageCategory, setAgeCategory] = useState<string>(
    ageCategories[2]?.name ?? ageCategories[0]?.name ?? 'U-16'
  );
  const [place, setPlace] = useState<PlaceType>('1st');
  const [points, setPoints] = useState<string>('10');
  const [note, setNote] = useState<string>('');
  const [filterHouse, setFilterHouse] = useState<'all' | HouseId>('all');

  const topPoints = Math.max(...standings.map((s) => s.totalPoints), 1);

  const handlePlaceChange = (nextPlace: PlaceType) => {
    setPlace(nextPlace);
    setPoints(String(DEFAULT_PLACE_POINTS[nextPlace]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPoints = Number(points);
    if (!eventName.trim() || !Number.isFinite(numericPoints)) return;
    onAddScore({
      house,
      eventName,
      ageCategory,
      place,
      points: numericPoints,
      note,
    });
    setNote('');
  };

  const filteredScores =
    filterHouse === 'all'
      ? scores
      : scores.filter((s) => s.house === filterHouse);

  const allEventSuggestions = games.map((g) => g.name);

  return (
    <div className="space-y-8">
      {/* Live 4-House Podium Standings */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Live Championship Standings
            </h2>
            <p className="text-sm text-zinc-400">
              Real-time total points, podium placements, and meet record bonuses across all 4 houses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {standings.map((item) => {
            const meta = HOUSES[item.house];
            const barWidth = Math.max(
              0,
              Math.min(100, Math.round((item.totalPoints / topPoints) * 100))
            );
            return (
              <div
                key={item.house}
                className="rounded-lg border border-zinc-800 bg-[#0F172A]/70 p-5 space-y-4"
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
                  <span className="font-mono-tabular text-xs font-semibold text-zinc-400">
                    Rank #{item.rank}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-bold text-white font-mono-tabular">
                    {item.totalPoints}
                  </span>
                  <span className="text-xs text-zinc-400">points</span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: meta.colorHex,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono-tabular pt-1">
                  <span>1st: {item.goldCount}</span>
                  <span>2nd: {item.silverCount}</span>
                  <span>3rd: {item.bronzeCount}</span>
                  <span>Rec: {item.recordCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Score Entry Form + Ledger Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Add / Deduct Points Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-zinc-300" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              Record Event Points
            </h3>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="score-house" className="block text-xs font-medium text-zinc-300">
              House
            </label>
            <select
              id="score-house"
              value={house}
              onChange={(e) => setHouse(e.target.value as HouseId)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
            >
              {HOUSE_ORDER.map((h) => (
                <option key={h} value={h}>
                  {HOUSES[h].name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="score-event" className="block text-xs font-medium text-zinc-300">
              Event Name
            </label>
            <input
              id="score-event"
              list="score-event-options"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. 100m Boys Finals"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              required
            />
            <datalist id="score-event-options">
              {allEventSuggestions.map((ev) => (
                <option key={ev} value={ev} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="score-age" className="block text-xs font-medium text-zinc-300">
                Age Category
              </label>
              <select
                id="score-age"
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              >
                {ageCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="Open">Open</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="score-place" className="block text-xs font-medium text-zinc-300">
                Place / Type
              </label>
              <select
                id="score-place"
                value={place}
                onChange={(e) => handlePlaceChange(e.target.value as PlaceType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="1st">1st (+10)</option>
                <option value="2nd">2nd (+7)</option>
                <option value="3rd">3rd (+5)</option>
                <option value="Record Bonus">Record Bonus (+5)</option>
                <option value="Deduction">Deduction (-)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="score-points" className="block text-xs font-medium text-zinc-300">
              Points (use negative for deductions)
            </label>
            <input
              id="score-points"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-zinc-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="score-note" className="block text-xs font-medium text-zinc-300">
              Official Note (Optional)
            </label>
            <input
              id="score-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Meet record 11.04s or lane infraction"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post Points to Ledger
          </button>
        </form>

        {/* Points Ledger Table */}
        <div className="lg:col-span-8 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Points & Standings Ledger
              </h3>
              <p className="text-xs text-zinc-400">
                {filteredScores.length} recorded entries
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterHouse('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterHouse === 'all'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Houses
              </button>
              {HOUSE_ORDER.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setFilterHouse(h)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    filterHouse === h
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {HOUSES[h].shortName}
                </button>
              ))}
            </div>
          </div>

          {filteredScores.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              No points recorded for this filter yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                    <th className="py-3 px-4">House</th>
                    <th className="py-3 px-4">Event & Category</th>
                    <th className="py-3 px-4">Place</th>
                    <th className="py-3 px-4 text-right">Points</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-sm">
                  {filteredScores.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-900/40">
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
                      <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                        {entry.place}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                          entry.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {entry.points >= 0 ? `+${entry.points}` : entry.points}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteScore(entry.id)}
                          aria-label={`Delete score for ${entry.eventName}`}
                          className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
