import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Lock,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AgeCategory,
  EventCategoryType,
  GameDefinition,
  Gender,
  HOUSES,
  HouseId,
  MAX_INDIVIDUAL_EVENTS,
  PlayerRole,
  Student,
  TeamCard,
} from '../../types/sports';
import { countGameRoleSlots, countStudentEvents } from '../../utils/sportsLogic';
import { PlayerAuditBadge, TeamCardStatusBadge } from '../HouseBadge';

interface HouseTeamCardBuilderProps {
  house: HouseId;
  meetName: string;
  students: Student[];
  ageCategories: AgeCategory[];
  games: GameDefinition[];
  teamCard: TeamCard | undefined;
  onAddEntry: (
    house: HouseId,
    studentId: string,
    eventName: string,
    ageCategory: string,
    gender: Gender,
    playerRole?: PlayerRole
  ) => { ok: boolean; error?: string };
  onRemoveEntry: (house: HouseId, entryId: string) => void;
  onSubmitCard: (house: HouseId) => void;
}

export const HouseTeamCardBuilder: React.FC<HouseTeamCardBuilderProps> = ({
  house,
  meetName,
  students,
  ageCategories,
  games,
  teamCard,
  onAddEntry,
  onRemoveEntry,
  onSubmitCard,
}) => {
  const meta = HOUSES[house];
  const entries = teamCard?.entries ?? [];
  const status = teamCard?.status ?? 'draft';
  const isLocked = status === 'pending_review' || status === 'approved';

  const [eventTypeTab, setEventTypeTab] = useState<EventCategoryType>('individual');
  const gamesForDiscipline = useMemo(
    () => games.filter((g) => g.eventType === eventTypeTab),
    [games, eventTypeTab]
  );

  const [selectedEvent, setSelectedEvent] = useState<string>(
    gamesForDiscipline[0]?.name ?? games[0]?.name ?? '100m'
  );
  const selectedGame = useMemo(
    () =>
      gamesForDiscipline.find((g) => g.name === selectedEvent) ??
      gamesForDiscipline[0] ??
      games[0],
    [gamesForDiscipline, games, selectedEvent]
  );

  const availableCategories = useMemo(() => {
    if (!selectedGame) return ageCategories;
    const filtered = ageCategories.filter((c) =>
      selectedGame.allowedAgeCategories.includes(c.name)
    );
    return filtered.length > 0 ? filtered : ageCategories;
  }, [ageCategories, selectedGame]);

  const availableGenders = useMemo(() => {
    if (!selectedGame || selectedGame.allowedGenders.length === 0) {
      return ['Male', 'Female'] as Gender[];
    }
    return selectedGame.allowedGenders;
  }, [selectedGame]);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    availableCategories[0]?.name ?? 'U-16'
  );
  const [selectedGender, setSelectedGender] = useState<Gender>(
    availableGenders[0] ?? 'Male'
  );
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('playable');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    if (
      gamesForDiscipline.length > 0 &&
      !gamesForDiscipline.some((g) => g.name === selectedEvent)
    ) {
      setSelectedEvent(gamesForDiscipline[0].name);
    }
  }, [gamesForDiscipline, selectedEvent]);

  useEffect(() => {
    if (
      availableCategories.length > 0 &&
      !availableCategories.some((c) => c.name === selectedCategory)
    ) {
      setSelectedCategory(availableCategories[0].name);
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (
      availableGenders.length > 0 &&
      !availableGenders.includes(selectedGender)
    ) {
      setSelectedGender(availableGenders[0]);
    }
  }, [availableGenders, selectedGender]);

  const roleCounts = useMemo(
    () =>
      countGameRoleSlots(
        entries,
        selectedGame?.name ?? selectedEvent,
        selectedCategory,
        selectedGender
      ),
    [entries, selectedGame, selectedEvent, selectedCategory, selectedGender]
  );

  const houseStudents = useMemo(
    () => students.filter((s) => s.house === house),
    [students, house]
  );

  // Strict Age Category & Gender Lock: only students matching selectedCategory + selectedGender
  const eligibleRoster = useMemo(() => {
    return houseStudents.filter(
      (s) =>
        s.dobStatus === 'verified' &&
        s.verifiedCategory === selectedCategory &&
        s.gender === selectedGender
    );
  }, [houseStudents, selectedCategory, selectedGender]);

  const studentMap = useMemo(
    () => new Map(houseStudents.map((s) => [s.id, s])),
    [houseStudents]
  );

  const handleEventTypeSwitch = (nextType: EventCategoryType) => {
    setEventTypeTab(nextType);
    const nextList = games.filter((g) => g.eventType === nextType);
    if (nextList[0]) {
      setSelectedEvent(nextList[0].name);
    }
    setFeedbackError(null);
  };

  const handleAddPlayer = (studentId: string) => {
    setFeedbackError(null);
    const res = onAddEntry(
      house,
      studentId,
      selectedGame?.name ?? selectedEvent,
      selectedCategory,
      selectedGender,
      selectedRole
    );
    if (!res.ok) {
      setFeedbackError(res.error ?? 'Unable to add athlete.');
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Header & Status */}
      <div className="flex flex-wrap items-start justify-between gap-4 no-print">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Playing Team Card Builder & Submission
          </h2>
          <p className="text-sm text-zinc-400">
            Individual Track & Field events are capped at {MAX_INDIVIDUAL_EVENTS} per athlete. Team Games & Relays are unlimited. Strict Age Category & Gender locks are enforced.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <TeamCardStatusBadge status={status} />
          {status === 'approved' && (
            <button
              type="button"
              onClick={handlePrint}
              style={{ backgroundColor: meta.colorHex }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print Official Playing Team Card
            </button>
          )}
        </div>
      </div>

      {/* Admin Revision Note or Lock Notice */}
      {teamCard?.adminNote && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm no-print ${
            status === 'revision_requested'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          <strong>Admin Review Note:</strong> {teamCard.adminNote}
        </div>
      )}

      {status === 'pending_review' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-center gap-2 no-print">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            This Playing Team Card is submitted and locked while awaiting Admin eligibility confirmation.
          </span>
        </div>
      )}

      {feedbackError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2 no-print"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Event Selector & Roster Picker (Hidden when printing) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        {/* Left: Event & Category Picker + Eligible Players */}
        <section className="lg:col-span-6 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400">
              1. Select Event Discipline
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => handleEventTypeSwitch('individual')}
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  eventTypeTab === 'individual'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Individual Track & Field (Max 3)
              </button>
              <button
                type="button"
                onClick={() => handleEventTypeSwitch('team')}
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  eventTypeTab === 'team'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Team Games & Relays (Unlimited)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="tc-event" className="block text-xs font-medium text-zinc-300">
                Game / Event
              </label>
              <select
                id="tc-event"
                value={selectedGame?.name ?? selectedEvent}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  setFeedbackError(null);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {gamesForDiscipline.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="tc-age" className="block text-xs font-medium text-zinc-300">
                Age Category
              </label>
              <select
                id="tc-age"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setFeedbackError(null);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="tc-gender" className="block text-xs font-medium text-zinc-300">
                Gender Division
              </label>
              <select
                id="tc-gender"
                value={selectedGender}
                onChange={(e) => {
                  setSelectedGender(e.target.value as Gender);
                  setFeedbackError(null);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {availableGenders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Squad Role Selector (Playable vs Sub) */}
          {selectedGame && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">
                  Squad Slot Type ({selectedGame.name})
                </span>
                <span className="font-mono-tabular text-zinc-400">
                  Playable {roleCounts.playableCount}/{selectedGame.playableSlots} · Sub{' '}
                  {roleCounts.subCount}/{selectedGame.subSlots}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedRole('playable')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedRole === 'playable'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  Playable ({roleCounts.playableCount}/{selectedGame.playableSlots})
                </button>
                <button
                  type="button"
                  disabled={selectedGame.subSlots === 0}
                  onClick={() => setSelectedRole('sub')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedRole === 'sub'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  Sub ({roleCounts.subCount}/{selectedGame.subSlots})
                </button>
              </div>
            </div>
          )}

          {/* Eligible House Athletes Matching Age + Gender Lock */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">
                2. Eligible {meta.shortName} Athletes ({selectedCategory} · {selectedGender})
              </span>
              <span className="font-mono-tabular text-zinc-400">
                {eligibleRoster.length} eligible
              </span>
            </div>

            {eligibleRoster.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6 text-center text-xs text-zinc-400">
                No {meta.shortName} athletes verified in {selectedCategory} ({selectedGender}). Only Admin-verified DOB matches can be selected.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800 bg-zinc-950/70">
                {eligibleRoster.map((student) => {
                  const counts = countStudentEvents(entries, student.id);
                  const activeEventName = selectedGame?.name ?? selectedEvent;
                  const alreadyInThisEvent = entries.some(
                    (e) =>
                      e.studentId === student.id &&
                      e.eventName.trim().toLowerCase() ===
                        activeEventName.trim().toLowerCase() &&
                      e.ageCategory === selectedCategory &&
                      e.gender === selectedGender
                  );
                  const hitIndividualCap =
                    eventTypeTab === 'individual' &&
                    counts.individualCount >= MAX_INDIVIDUAL_EVENTS;
                  const roleFull = selectedGame
                    ? selectedRole === 'playable'
                      ? roleCounts.playableCount >= selectedGame.playableSlots
                      : roleCounts.subCount >= selectedGame.subSlots
                    : false;
                  const disabled =
                    isLocked || alreadyInThisEvent || hitIndividualCap || roleFull;

                  return (
                    <div
                      key={student.id}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {student.fullName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-tabular mt-0.5 flex-wrap">
                          <span>{student.admissionNo}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              counts.individualCount >= MAX_INDIVIDUAL_EVENTS
                                ? 'text-amber-400 font-semibold'
                                : 'text-zinc-300'
                            }
                          >
                            Track &amp; Field: {counts.individualCount}/{MAX_INDIVIDUAL_EVENTS}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-300">
                            Team Games: {counts.teamCount}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleAddPlayer(student.id)}
                        aria-label={
                          alreadyInThisEvent
                            ? `${student.fullName} already added to ${activeEventName}`
                            : hitIndividualCap
                            ? `${student.fullName} reached 3 of 3 Track and Field cap`
                            : roleFull
                            ? `${selectedRole} slots full for ${activeEventName}`
                            : `Add ${student.fullName} as ${selectedRole} to ${activeEventName}`
                        }
                        style={!disabled ? { backgroundColor: meta.colorHex } : undefined}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {alreadyInThisEvent
                          ? 'Already Added'
                          : hitIndividualCap
                          ? 'Track Cap (3/3)'
                          : roleFull
                          ? selectedRole === 'playable'
                            ? 'Playable Full'
                            : 'Sub Full'
                          : selectedRole === 'sub'
                          ? 'Add Sub'
                          : 'Add Playable'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right: Current Team Card Roster & Submit */}
        <section className="lg:col-span-6 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                {meta.name} Playing Team Card
              </h3>
              <p className="text-xs text-zinc-400 font-mono-tabular">
                {entries.length} event entries selected
              </p>
            </div>

            {!isLocked && (
              <button
                type="button"
                disabled={entries.length === 0}
                onClick={() => onSubmitCard(house)}
                style={{ backgroundColor: meta.colorHex }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Submit Team Card for Admin Review
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              No events added yet. Select a discipline, age category, and gender on the left to add eligible {meta.shortName} athletes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                    <th className="py-3 px-3">Athlete</th>
                    <th className="py-3 px-3">Event</th>
                    <th className="py-3 px-3">Quota</th>
                    <th className="py-3 px-3">Status</th>
                    {!isLocked && <th className="py-3 px-3 text-right">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-sm">
                  {entries.map((entry) => {
                    const student = studentMap.get(entry.studentId);
                    const counts = countStudentEvents(entries, entry.studentId);
                    return (
                      <tr key={entry.id}>
                        <td className="py-2.5 px-3 min-w-[130px]">
                          <div className="font-medium text-white whitespace-nowrap">
                            {student?.fullName ?? 'Unknown'}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                            {student?.admissionNo}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-100 whitespace-nowrap">
                              {entry.eventName}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-medium border whitespace-nowrap ${
                                (entry.playerRole ?? 'playable') === 'sub'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              }`}
                            >
                              {(entry.playerRole ?? 'playable') === 'sub'
                                ? 'Sub'
                                : 'Playable'}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 whitespace-nowrap">
                            {entry.eventType === 'individual' ? 'Individual' : 'Team'} ·{' '}
                            {entry.ageCategory} {entry.gender}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono-tabular text-zinc-300 whitespace-nowrap">
                          T&amp;F {counts.individualCount}/3 · Team {counts.teamCount}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <PlayerAuditBadge status={entry.auditStatus} />
                          {entry.rejectionReason && (
                            <p className="text-xs text-red-300 mt-1 whitespace-normal">
                              {entry.rejectionReason}
                            </p>
                          )}
                        </td>
                        {!isLocked && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onRemoveEntry(house, entry.id)}
                              aria-label={`Remove ${student?.fullName ?? 'athlete'} from ${entry.eventName}`}
                              className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Athlete Quota Overview Table (Live Track & Field X/3 and Team Games Y) */}
      <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden no-print">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-white">
            Athlete Event Quota Summary ({meta.shortName})
          </h3>
          <p className="text-xs text-zinc-400">
            Live participation counters across all {houseStudents.length} house athletes.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                <th className="py-2.5 px-4">Athlete</th>
                <th className="py-2.5 px-4">Verified Division</th>
                <th className="py-2.5 px-4">Track &amp; Field</th>
                <th className="py-2.5 px-4">Team Games</th>
                <th className="py-2.5 px-4">Selected Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-sm">
              {houseStudents.map((s) => {
                const counts = countStudentEvents(entries, s.id);
                const studentEvents = entries
                  .filter((e) => e.studentId === s.id)
                  .map((e) => e.eventName);
                return (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4 font-medium text-white">
                      {s.fullName}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-300 font-mono-tabular">
                      {s.verifiedCategory ?? 'Unverified'} · {s.gender}
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs">
                      <span
                        className={
                          counts.individualCount >= MAX_INDIVIDUAL_EVENTS
                            ? 'text-amber-400 font-semibold'
                            : 'text-zinc-200'
                        }
                      >
                        Track &amp; Field: {counts.individualCount}/{MAX_INDIVIDUAL_EVENTS}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs text-zinc-200">
                      Team Games: {counts.teamCount}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-400">
                      {studentEvents.length > 0 ? studentEvents.join(', ') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Official Printable Team Card (Shown on approval or print) */}
      {(status === 'approved' || showPrintView) && (
        <section className="print-card rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Official Playing Team Card
              </p>
              <h3 className="font-display text-2xl font-bold text-white">
                {meetName} — {meta.name}
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Valid to Play (Confirmed)
            </div>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                <th className="py-2 px-3">Adm No</th>
                <th className="py-2 px-3">Athlete Name</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Event</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Discipline</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {entries.map((entry) => {
                const s = studentMap.get(entry.studentId);
                return (
                  <tr key={entry.id}>
                    <td className="py-2 px-3 font-mono-tabular text-xs">
                      {s?.admissionNo ?? '—'}
                    </td>
                    <td className="py-2 px-3 font-medium">{s?.fullName ?? '—'}</td>
                    <td className="py-2 px-3 text-xs">
                      {entry.ageCategory} {entry.gender}
                    </td>
                    <td className="py-2 px-3">{entry.eventName}</td>
                    <td className="py-2 px-3 text-xs">
                      {(entry.playerRole ?? 'playable') === 'sub' ? 'Sub' : 'Playable'}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {entry.eventType === 'individual'
                        ? 'Individual Track & Field'
                        : 'Team Game / Relay'}
                    </td>
                    <td className="py-2 px-3 text-xs font-medium text-emerald-400">
                      Valid to Play (Confirmed)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};
