import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  GameDefinition,
  HOUSES,
  MAX_INDIVIDUAL_EVENTS,
  PlayerAuditStatus,
  Student,
  TeamCard,
} from '../../types/sports';
import { auditTeamCardPlayer } from '../../utils/sportsLogic';
import { HouseTag, PlayerAuditBadge, TeamCardStatusBadge } from '../HouseBadge';

interface AdminTeamCardsProps {
  teamCards: TeamCard[];
  students: Student[];
  games: GameDefinition[];
  onUpdatePlayerAudit: (
    cardId: string,
    entryId: string,
    auditStatus: PlayerAuditStatus,
    rejectionReason?: string
  ) => void;
  onFinalizeCard: (
    cardId: string,
    decision: 'approved' | 'revision_requested',
    adminNote?: string
  ) => void;
}

export const AdminTeamCards: React.FC<AdminTeamCardsProps> = ({
  teamCards,
  students,
  games,
  onUpdatePlayerAudit,
  onFinalizeCard,
}) => {
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<string, string>>({});
  const [cardNotes, setCardNotes] = useState<Record<string, string>>({});

  const studentById = new Map(students.map((s) => [s.id, s]));

  // Order cards: pending_review first, then revision_requested, approved, draft
  const priorityOrder: Record<TeamCard['status'], number> = {
    pending_review: 0,
    revision_requested: 1,
    approved: 2,
    draft: 3,
  };

  const sortedCards = [...teamCards].sort(
    (a, b) => priorityOrder[a.status] - priorityOrder[b.status]
  );

  const pendingCount = teamCards.filter((c) => c.status === 'pending_review').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Team Card Review & Player Validity Confirmation
          </h2>
          <p className="text-sm text-zinc-400">
            Automated eligibility audit verifies House membership, DOB Age Category & Gender match, and ≤ {MAX_INDIVIDUAL_EVENTS} Individual Track & Field events per player.
          </p>
        </div>
        <div className="text-xs font-mono-tabular text-amber-300">
          Pending Review Queue: {pendingCount}
        </div>
      </div>

      <div className="space-y-6">
        {sortedCards.map((card) => {
          const meta = HOUSES[card.house];
          const hasEntries = card.entries.length > 0;
          const allAuditsPassed =
            hasEntries &&
            card.entries.every((entry) => {
              const audit = auditTeamCardPlayer(
                entry,
                studentById.get(entry.studentId),
                card.house,
                card.entries,
                games
              );
              return audit.allPassed && entry.auditStatus !== 'rejected';
            });

          return (
            <section
              key={card.id}
              className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <HouseTag house={card.house} size="md" />
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono-tabular">
                      {card.entries.length} event entries
                      {card.submittedAt
                        ? ` · Submitted ${new Date(card.submittedAt).toLocaleString()}`
                        : ' · Not yet submitted'}
                    </p>
                  </div>
                </div>

                <TeamCardStatusBadge status={card.status} />
              </div>

              {!hasEntries ? (
                <div className="p-6 text-sm text-zinc-400">
                  {meta.name} has not added any players to their Playing Team Card yet.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                          <th className="py-3 px-4">Athlete</th>
                          <th className="py-3 px-4">Event</th>
                          <th className="py-3 px-4">Automated Eligibility Audit</th>
                          <th className="py-3 px-4">Admin Status</th>
                          <th className="py-3 px-4 text-right">Confirmation Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70 text-sm">
                        {card.entries.map((entry) => {
                          const student = studentById.get(entry.studentId);
                          const audit = auditTeamCardPlayer(
                            entry,
                            student,
                            card.house,
                            card.entries,
                            games
                          );
                          const role = entry.playerRole ?? 'playable';

                          return (
                            <tr key={entry.id} className="hover:bg-zinc-900/40">
                              <td className="py-3 px-4">
                                <div className="font-medium text-white">
                                  {student?.fullName ?? 'Unknown Athlete'}
                                </div>
                                <div className="text-xs text-zinc-400 font-mono-tabular">
                                  {student?.admissionNo ?? '—'} ·{' '}
                                  {student?.verifiedCategory ?? 'Unverified'} ·{' '}
                                  {student?.gender ?? '—'}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-zinc-100">
                                    {entry.eventName}
                                  </span>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium border ${
                                      role === 'sub'
                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                    }`}
                                  >
                                    {role === 'sub' ? 'Sub' : 'Playable'}
                                  </span>
                                </div>
                                <div className="text-xs text-zinc-400">
                                  {entry.eventType === 'individual'
                                    ? 'Individual T&F'
                                    : 'Team Game / Relay'}{' '}
                                  · {entry.ageCategory} {entry.gender}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-3 flex-wrap font-mono-tabular">
                                    <span
                                      className={
                                        audit.belongsToHouse
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }
                                    >
                                      {audit.belongsToHouse ? '✓' : '✗'} House
                                    </span>
                                    <span
                                      className={
                                        audit.dobAndGenderMatch
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }
                                    >
                                      {audit.dobAndGenderMatch ? '✓' : '✗'} DOB/Gender
                                    </span>
                                    <span
                                      className={
                                        audit.individualCountWithinLimit
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }
                                    >
                                      {audit.individualCountWithinLimit ? '✓' : '✗'} T&amp;F{' '}
                                      {audit.individualCount}/{MAX_INDIVIDUAL_EVENTS}
                                    </span>
                                    <span
                                      className={
                                        audit.gameQuotaOk
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }
                                    >
                                      {audit.gameQuotaOk ? '✓' : '✗'} Squad Slots
                                    </span>
                                  </div>
                                  {!audit.allPassed && (
                                    <p className="text-red-300 flex items-center gap-1">
                                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                      {audit.issues.join(' · ')}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <PlayerAuditBadge status={entry.auditStatus} />
                                  {entry.rejectionReason && (
                                    <p className="text-xs text-red-300">
                                      Reason: {entry.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex flex-col items-end gap-2">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdatePlayerAudit(card.id, entry.id, 'confirmed')
                                      }
                                      className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      Confirm Valid
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdatePlayerAudit(
                                          card.id,
                                          entry.id,
                                          'rejected',
                                          rejectionDrafts[entry.id] ||
                                            audit.issues[0] ||
                                            'Eligibility discrepancy'
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                                    >
                                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                      Reject
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    aria-label={`Rejection note for ${student?.fullName ?? 'player'} in ${entry.eventName}`}
                                    value={rejectionDrafts[entry.id] ?? ''}
                                    onChange={(e) =>
                                      setRejectionDrafts((prev) => ({
                                        ...prev,
                                        [entry.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Rejection reason (optional)..."
                                    className="w-48 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white placeholder:text-zinc-500"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Card-Level Review Controls */}
                  <div className="px-5 py-4 bg-zinc-950/70 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-[240px]">
                      <input
                        type="text"
                        aria-label={`Admin review note for ${meta.name}`}
                        value={cardNotes[card.id] ?? card.adminNote ?? ''}
                        onChange={(e) =>
                          setCardNotes((prev) => ({
                            ...prev,
                            [card.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional review note for House Master..."
                        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          onFinalizeCard(
                            card.id,
                            'revision_requested',
                            cardNotes[card.id]
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Return to House for Revision
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onFinalizeCard(card.id, 'approved', cardNotes[card.id])
                        }
                        disabled={!allAuditsPassed}
                        title={
                          allAuditsPassed
                            ? 'Approve entire team card'
                            : 'Resolve ineligible/rejected entries before approving'
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {card.status === 'approved' ? (
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                        Approve Full Team Card
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
