import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Edit3,
  Gamepad2,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  AgeCategory,
  EventCategoryType,
  GameDefinition,
  Gender,
  HOUSE_ORDER,
  HOUSES,
  HouseId,
  MAX_INDIVIDUAL_EVENTS,
  PlayerRole,
  Student,
  TeamCard,
} from '../../types/sports';
import { countGameRoleSlots, countStudentEvents } from '../../utils/sportsLogic';
import { HouseTag } from '../HouseBadge';

interface AdminGamesProps {
  games: GameDefinition[];
  ageCategories: AgeCategory[];
  students: Student[];
  teamCards: TeamCard[];
  onUpsertGame: (
    payload: Omit<GameDefinition, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  onDeleteGame: (gameId: string) => void;
  onAssignGamePlayer: (
    house: HouseId,
    studentId: string,
    eventName: string,
    ageCategory: string,
    gender: Gender,
    playerRole: PlayerRole
  ) => { ok: boolean; error?: string };
  onTogglePlayerRole: (
    house: HouseId,
    entryId: string
  ) => { ok: boolean; error?: string };
  onRemoveGamePlayer: (house: HouseId, entryId: string) => void;
}

type GamesSubTab = 'catalog' | 'squads';

interface GameFormState {
  id?: string;
  name: string;
  eventType: EventCategoryType;
  allowedAgeCategories: string[];
  allowedGenders: Gender[];
  playableSlots: string;
  subSlots: string;
}

export const AdminGames: React.FC<AdminGamesProps> = ({
  games,
  ageCategories,
  students,
  teamCards,
  onUpsertGame,
  onDeleteGame,
  onAssignGamePlayer,
  onTogglePlayerRole,
  onRemoveGamePlayer,
}) => {
  const [subTab, setSubTab] = useState<GamesSubTab>('catalog');
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | EventCategoryType>('all');

  const allCategoryNames = useMemo(
    () => ageCategories.map((c) => c.name),
    [ageCategories]
  );

  const [form, setForm] = useState<GameFormState>(() => ({
    name: '',
    eventType: 'team',
    allowedAgeCategories: allCategoryNames,
    allowedGenders: ['Male', 'Female'],
    playableSlots: '7',
    subSlots: '3',
  }));
  const [formFeedback, setFormFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Squad Assignment State
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id ?? '');
  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? games[0],
    [games, selectedGameId]
  );

  const [squadHouse, setSquadHouse] = useState<HouseId>('mars');
  const [squadAge, setSquadAge] = useState<string>(
    selectedGame?.allowedAgeCategories[0] ?? ageCategories[0]?.name ?? 'U-16'
  );
  const [squadGender, setSquadGender] = useState<Gender>(
    selectedGame?.allowedGenders[0] ?? 'Male'
  );
  const [squadFeedback, setSquadFeedback] = useState<string | null>(null);

  // Keep selected game, age category, and gender valid when game changes
  useEffect(() => {
    if (!selectedGame) return;
    if (
      selectedGame.allowedAgeCategories.length > 0 &&
      !selectedGame.allowedAgeCategories.includes(squadAge)
    ) {
      setSquadAge(selectedGame.allowedAgeCategories[0]);
    }
    if (
      selectedGame.allowedGenders.length > 0 &&
      !selectedGame.allowedGenders.includes(squadGender)
    ) {
      setSquadGender(selectedGame.allowedGenders[0]);
    }
  }, [selectedGame, squadAge, squadGender]);

  const filteredGames = useMemo(() => {
    if (disciplineFilter === 'all') return games;
    return games.filter((g) => g.eventType === disciplineFilter);
  }, [games, disciplineFilter]);

  const resetForm = () => {
    setForm({
      name: '',
      eventType: 'team',
      allowedAgeCategories: allCategoryNames,
      allowedGenders: ['Male', 'Female'],
      playableSlots: '7',
      subSlots: '3',
    });
  };

  const handleEditGame = (game: GameDefinition) => {
    setForm({
      id: game.id,
      name: game.name,
      eventType: game.eventType,
      allowedAgeCategories: game.allowedAgeCategories,
      allowedGenders: game.allowedGenders,
      playableSlots: String(game.playableSlots),
      subSlots: String(game.subSlots),
    });
    setFormFeedback(null);
    setSubTab('catalog');
  };

  const toggleFormCategory = (catName: string) => {
    setForm((prev) => {
      const exists = prev.allowedAgeCategories.includes(catName);
      return {
        ...prev,
        allowedAgeCategories: exists
          ? prev.allowedAgeCategories.filter((c) => c !== catName)
          : [...prev.allowedAgeCategories, catName],
      };
    });
  };

  const toggleFormGender = (gender: Gender) => {
    setForm((prev) => {
      const exists = prev.allowedGenders.includes(gender);
      return {
        ...prev,
        allowedGenders: exists
          ? prev.allowedGenders.filter((g) => g !== gender)
          : [...prev.allowedGenders, gender],
      };
    });
  };

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);
    const playable = Number(form.playableSlots);
    const sub = Number(form.subSlots);

    if (!Number.isInteger(playable) || playable < 1) {
      setFormFeedback({
        type: 'err',
        text: 'Playable players count must be a whole number of at least 1.',
      });
      return;
    }
    if (!Number.isInteger(sub) || sub < 0) {
      setFormFeedback({
        type: 'err',
        text: 'Substitute players count must be 0 or greater.',
      });
      return;
    }

    const res = onUpsertGame({
      id: form.id,
      name: form.name.trim(),
      eventType: form.eventType,
      allowedAgeCategories: form.allowedAgeCategories,
      allowedGenders: form.allowedGenders,
      playableSlots: playable,
      subSlots: sub,
    });

    if (!res.ok) {
      setFormFeedback({
        type: 'err',
        text: res.error ?? 'Could not save game configuration.',
      });
      return;
    }

    setFormFeedback({
      type: 'ok',
      text: form.id
        ? `Updated "${form.name.trim()}" rules, age categories, and squad quotas.`
        : `Added new game "${form.name.trim()}" (${playable} Playable, ${sub} Sub).`,
    });
    resetForm();
  };

  const openSquadManagerForGame = (game: GameDefinition) => {
    setSelectedGameId(game.id);
    if (game.allowedAgeCategories.length > 0) {
      setSquadAge(game.allowedAgeCategories[0]);
    }
    if (game.allowedGenders.length > 0) {
      setSquadGender(game.allowedGenders[0]);
    }
    setSquadFeedback(null);
    setSubTab('squads');
  };

  // Data for Squad Assignment Tab
  const activeHouseCard = useMemo(
    () => teamCards.find((tc) => tc.house === squadHouse),
    [teamCards, squadHouse]
  );
  const houseCardEntries = activeHouseCard?.entries ?? [];

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const eligibleHouseStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.house === squadHouse &&
        s.dobStatus === 'verified' &&
        s.verifiedCategory === squadAge &&
        s.gender === squadGender
    );
  }, [students, squadHouse, squadAge, squadGender]);

  const gameSquadEntries = useMemo(() => {
    if (!selectedGame) return [];
    const target = selectedGame.name.trim().toLowerCase();
    return houseCardEntries.filter(
      (e) =>
        e.eventName.trim().toLowerCase() === target &&
        e.ageCategory === squadAge &&
        e.gender === squadGender
    );
  }, [houseCardEntries, selectedGame, squadAge, squadGender]);

  const playableEntries = useMemo(
    () => gameSquadEntries.filter((e) => (e.playerRole ?? 'playable') === 'playable'),
    [gameSquadEntries]
  );
  const subEntries = useMemo(
    () => gameSquadEntries.filter((e) => e.playerRole === 'sub'),
    [gameSquadEntries]
  );

  const handleAssign = (studentId: string, role: PlayerRole) => {
    if (!selectedGame) return;
    setSquadFeedback(null);
    const res = onAssignGamePlayer(
      squadHouse,
      studentId,
      selectedGame.name,
      squadAge,
      squadGender,
      role
    );
    if (!res.ok) {
      setSquadFeedback(res.error ?? 'Unable to assign player.');
    }
  };

  const handleSwapRole = (entryId: string) => {
    setSquadFeedback(null);
    const res = onTogglePlayerRole(squadHouse, entryId);
    if (!res.ok) {
      setSquadFeedback(res.error ?? 'Unable to swap role.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Games, Age Categories &amp; Squad Assignments
          </h2>
          <p className="text-sm text-zinc-400">
            Create or configure meet games, assign eligible age categories, set playable &amp; substitute quotas, and appoint players per game.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Games module views"
          className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'catalog'}
            onClick={() => setSubTab('catalog')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === 'catalog'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
            Game Rules &amp; Age Categories
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'squads'}
            onClick={() => setSubTab('squads')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === 'squads'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Assign Playable &amp; Sub Players
          </button>
        </div>
      </div>

      {subTab === 'catalog' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add / Edit Game Form */}
          <form
            onSubmit={handleSaveGame}
            className="lg:col-span-5 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">
                {form.id ? `Edit Game: ${form.name}` : 'Assign New Game / Event'}
              </h3>
              {form.id && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormFeedback(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </button>
              )}
            </div>

            {formFeedback && (
              <div
                role="alert"
                className={`rounded-lg border px-3.5 py-2.5 text-xs flex items-center gap-2 ${
                  formFeedback.type === 'ok'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/40 bg-red-500/10 text-red-200'
                }`}
              >
                {formFeedback.type === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{formFeedback.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="game-name" className="block text-xs font-medium text-zinc-300">
                Game / Event Name
              </label>
              <input
                id="game-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Badminton, Rugby, 1500m, Tug of War"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="game-type" className="block text-xs font-medium text-zinc-300">
                Discipline Type
              </label>
              <select
                id="game-type"
                value={form.eventType}
                onChange={(e) =>
                  setForm({ ...form, eventType: e.target.value as EventCategoryType })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                <option value="individual">Individual Track &amp; Field (Counts toward 3-event cap)</option>
                <option value="team">Team Game / Relay (Unlimited events per player)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="game-playable" className="block text-xs font-medium text-zinc-300">
                  Playable Players (Per House)
                </label>
                <input
                  id="game-playable"
                  type="number"
                  min={1}
                  max={30}
                  value={form.playableSlots}
                  onChange={(e) => setForm({ ...form, playableSlots: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="game-subs" className="block text-xs font-medium text-zinc-300">
                  Sub Players (Per House)
                </label>
                <input
                  id="game-subs"
                  type="number"
                  min={0}
                  max={20}
                  value={form.subSlots}
                  onChange={(e) => setForm({ ...form, subSlots: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">
                  Assign Age Categories
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      allowedAgeCategories:
                        prev.allowedAgeCategories.length === allCategoryNames.length
                          ? []
                          : allCategoryNames,
                    }))
                  }
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  {form.allowedAgeCategories.length === allCategoryNames.length
                    ? 'Clear all'
                    : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ageCategories.map((cat) => {
                  const checked = form.allowedAgeCategories.includes(cat.name);
                  return (
                    <label
                      key={cat.id}
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-zinc-500 bg-zinc-800 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormCategory(cat.name)}
                        className="rounded border-zinc-600 bg-zinc-900"
                      />
                      <span className="font-mono-tabular font-medium">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-zinc-300">
                Allowed Gender Divisions
              </span>
              <div className="flex items-center gap-3">
                {(['Male', 'Female'] as Gender[]).map((gender) => {
                  const checked = form.allowedGenders.includes(gender);
                  return (
                    <label
                      key={gender}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-zinc-500 bg-zinc-800 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormGender(gender)}
                        className="rounded border-zinc-600 bg-zinc-900"
                      />
                      <span>{gender}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {form.id ? 'Update Game Configuration' : 'Add Game to Meet'}
            </button>
          </form>

          {/* Configured Games Table */}
          <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Configured Meet Games ({filteredGames.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  House Team Card Builders and Admin Squads enforce these quotas and age limits automatically.
                </p>
              </div>

              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'individual', label: 'Individual' },
                    { id: 'team', label: 'Team' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDisciplineFilter(f.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      disciplineFilter === f.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                    <th className="py-3 px-4">Game &amp; Type</th>
                    <th className="py-3 px-4">Age Categories</th>
                    <th className="py-3 px-4">Squad Slots</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-sm">
                  {filteredGames.map((game) => (
                    <tr key={game.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{game.name}</div>
                        <div className="text-xs text-zinc-400">
                          {game.eventType === 'individual'
                            ? 'Individual T&F'
                            : 'Team Game / Relay'}{' '}
                          · {game.allowedGenders.join(' & ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono-tabular text-zinc-200">
                        {game.allowedAgeCategories.length > 0
                          ? game.allowedAgeCategories.join(', ')
                          : 'None'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono-tabular whitespace-nowrap">
                        <span className="text-emerald-300 font-medium">
                          {game.playableSlots} Playable
                        </span>
                        <span className="text-zinc-500 mx-1.5">·</span>
                        <span className="text-amber-300 font-medium">
                          {game.subSlots} Sub
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openSquadManagerForGame(game)}
                          aria-label={`Assign players for ${game.name}`}
                          className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          Squads
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditGame(game)}
                          aria-label={`Edit ${game.name}`}
                          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGame(game.id)}
                          aria-label={`Delete ${game.name}`}
                          className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Assign Playable & Sub Players per Game */
        <div className="space-y-6">
          {/* Selector Controls */}
          <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="sq-game" className="block text-xs font-medium text-zinc-300">
                  1. Select Game
                </label>
                <select
                  id="sq-game"
                  value={selectedGame?.id ?? ''}
                  onChange={(e) => {
                    setSelectedGameId(e.target.value);
                    setSquadFeedback(null);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.playableSlots} Playable · {g.subSlots} Sub)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sq-age" className="block text-xs font-medium text-zinc-300">
                  2. Age Category
                </label>
                <select
                  id="sq-age"
                  value={squadAge}
                  onChange={(e) => {
                    setSquadAge(e.target.value);
                    setSquadFeedback(null);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {(selectedGame?.allowedAgeCategories ?? allCategoryNames).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sq-gender" className="block text-xs font-medium text-zinc-300">
                  3. Gender Division
                </label>
                <select
                  id="sq-gender"
                  value={squadGender}
                  onChange={(e) => {
                    setSquadGender(e.target.value as Gender);
                    setSquadFeedback(null);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {(selectedGame?.allowedGenders ?? (['Male', 'Female'] as Gender[])).map(
                    (g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sq-house" className="block text-xs font-medium text-zinc-300">
                  4. House Squad
                </label>
                <select
                  id="sq-house"
                  value={squadHouse}
                  onChange={(e) => {
                    setSquadHouse(e.target.value as HouseId);
                    setSquadFeedback(null);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {HOUSE_ORDER.map((h) => (
                    <option key={h} value={h}>
                      {HOUSES[h].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cross-House Coverage Overview for Selected Game & Division */}
            {selectedGame && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80">
                {HOUSE_ORDER.map((h) => {
                  const hc = teamCards.find((tc) => tc.house === h);
                  const counts = countGameRoleSlots(
                    hc?.entries ?? [],
                    selectedGame.name,
                    squadAge,
                    squadGender
                  );
                  const isCurrent = h === squadHouse;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setSquadHouse(h);
                        setSquadFeedback(null);
                      }}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        isCurrent
                          ? 'border-zinc-500 bg-zinc-900'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <HouseTag house={h} />
                      </div>
                      <div className="mt-2 text-xs font-mono-tabular text-zinc-300">
                        Playable {counts.playableCount}/{selectedGame.playableSlots} · Sub{' '}
                        {counts.subCount}/{selectedGame.subSlots}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {squadFeedback && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{squadFeedback}</span>
            </div>
          )}

          {selectedGame && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Eligible House Players */}
              <section className="lg:col-span-6 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Eligible {HOUSES[squadHouse].name} Athletes
                    </h3>
                    <p className="text-xs text-zinc-400">
                      DOB-verified for {squadAge} · {squadGender} ({eligibleHouseStudents.length} available)
                    </p>
                  </div>
                </div>

                {eligibleHouseStudents.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">
                    No {HOUSES[squadHouse].shortName} athletes verified in {squadAge} ({squadGender}).
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/70">
                    {eligibleHouseStudents.map((s) => {
                      const assignedEntry = gameSquadEntries.find(
                        (e) => e.studentId === s.id
                      );
                      const counts = countStudentEvents(houseCardEntries, s.id);
                      const hitIndividualCap =
                        selectedGame.eventType === 'individual' &&
                        counts.individualCount >= MAX_INDIVIDUAL_EVENTS;
                      const playableFull =
                        playableEntries.length >= selectedGame.playableSlots;
                      const subFull = subEntries.length >= selectedGame.subSlots;

                      return (
                        <div
                          key={s.id}
                          className="p-4 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-white">
                              {s.fullName}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono-tabular">
                              {s.admissionNo} · {s.grade} · {s.primarySport}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono-tabular mt-0.5">
                              T&amp;F {counts.individualCount}/{MAX_INDIVIDUAL_EVENTS} · Team{' '}
                              {counts.teamCount}
                            </div>
                          </div>

                          {assignedEntry ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                                assignedEntry.playerRole === 'sub'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Assigned ({assignedEntry.playerRole === 'sub' ? 'Sub' : 'Playable'})
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={playableFull || hitIndividualCap}
                                onClick={() => handleAssign(s.id, 'playable')}
                                aria-label={`Assign ${s.fullName} as Playable in ${selectedGame.name}`}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              >
                                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                Playable
                              </button>

                              <button
                                type="button"
                                disabled={subFull || hitIndividualCap}
                                onClick={() => handleAssign(s.id, 'sub')}
                                aria-label={`Assign ${s.fullName} as Sub in ${selectedGame.name}`}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              >
                                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                Sub
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Right: Playable & Sub Squad Lineup */}
              <section className="lg:col-span-6 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {HOUSES[squadHouse].name} — {selectedGame.name} ({squadAge} {squadGender})
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Players assigned here sync directly to the House&apos;s Playing Team Card as Admin Confirmed.
                    </p>
                  </div>
                  <div className="text-xs font-mono-tabular flex items-center gap-3">
                    <span className="text-emerald-300 font-semibold">
                      Playable: {playableEntries.length}/{selectedGame.playableSlots}
                    </span>
                    <span className="text-amber-300 font-semibold">
                      Sub: {subEntries.length}/{selectedGame.subSlots}
                    </span>
                  </div>
                </div>

                {/* Playable List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Playable Players ({playableEntries.length} / {selectedGame.playableSlots})
                  </h4>
                  {playableEntries.length === 0 ? (
                    <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500">
                      No playable athletes assigned yet for {selectedGame.name}.
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800 bg-zinc-950/60">
                      {playableEntries.map((entry, idx) => {
                        const s = studentMap.get(entry.studentId);
                        return (
                          <div
                            key={entry.id}
                            className="px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">
                                {idx + 1}. {s?.fullName ?? 'Unknown'}
                              </div>
                              <div className="text-xs text-zinc-400 font-mono-tabular">
                                {s?.admissionNo ?? '—'} · {s?.grade ?? '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {selectedGame.subSlots > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSwapRole(entry.id)}
                                  aria-label={`Move ${s?.fullName ?? 'player'} to Sub`}
                                  className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800 whitespace-nowrap"
                                >
                                  <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                                  Make Sub
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onRemoveGamePlayer(squadHouse, entry.id)}
                                aria-label={`Remove ${s?.fullName ?? 'player'} from ${selectedGame.name}`}
                                className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Substitute List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Substitute Players ({subEntries.length} / {selectedGame.subSlots})
                  </h4>
                  {selectedGame.subSlots === 0 ? (
                    <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500">
                      Substitutes are set to 0 for this game.
                    </p>
                  ) : subEntries.length === 0 ? (
                    <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500">
                      No substitute players assigned yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800 bg-zinc-950/60">
                      {subEntries.map((entry, idx) => {
                        const s = studentMap.get(entry.studentId);
                        return (
                          <div
                            key={entry.id}
                            className="px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">
                                Sub {idx + 1}. {s?.fullName ?? 'Unknown'}
                              </div>
                              <div className="text-xs text-zinc-400 font-mono-tabular">
                                {s?.admissionNo ?? '—'} · {s?.grade ?? '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSwapRole(entry.id)}
                                aria-label={`Move ${s?.fullName ?? 'player'} to Playable`}
                                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800 whitespace-nowrap"
                              >
                                <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                                Make Playable
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveGamePlayer(squadHouse, entry.id)}
                                aria-label={`Remove ${s?.fullName ?? 'player'} from ${selectedGame.name}`}
                                className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
