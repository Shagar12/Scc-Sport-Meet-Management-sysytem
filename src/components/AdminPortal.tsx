import React, { useState } from 'react';
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Gamepad2,
  KeyRound,
  LogOut,
  RotateCcw,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import {
  AgeCategory,
  EventSchedule,
  GameDefinition,
  Gender,
  HouseCredential,
  HouseId,
  PlaceType,
  PlayerAuditStatus,
  PlayerRole,
  SportsMeetState,
  Student,
  Teacher,
} from '../types/sports';
import { SyncStatus } from '../hooks/useSportsStore';
import { computeHouseStandings } from '../utils/sportsLogic';
import { SyncStatusBar } from './SyncStatusBar';
import { AdminAgeConfig } from './admin/AdminAgeConfig';
import { AdminAppointments } from './admin/AdminAppointments';
import { AdminBulkUpload } from './admin/AdminBulkUpload';
import { AdminGames } from './admin/AdminGames';
import { AdminSchedules } from './admin/AdminSchedules';
import { AdminSecurity } from './admin/AdminSecurity';
import { AdminStandings } from './admin/AdminStandings';
import { AdminStudents } from './admin/AdminStudents';
import { AdminTeamCards } from './admin/AdminTeamCards';

type AdminTab =
  | 'standings'
  | 'age_config'
  | 'games'
  | 'schedules'
  | 'bulk_upload'
  | 'appointments'
  | 'students'
  | 'team_cards'
  | 'security';

interface AdminPortalProps {
  state: SportsMeetState;
  syncStatus: SyncStatus;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
  onSyncNow: () => void;
  onLogout: () => void;
  onResetDemoData: () => void;
  onUpdateAgeConfig: (cutoffDate: string, ageCategories: AgeCategory[]) => void;
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
  onImportStudents: (newStudents: Student[]) => void;
  onAutoDistribute: () => {
    distributedCount: number;
    breakdown: Record<HouseId, number>;
  };
  onUpsertTeacher: (teacher: Omit<Teacher, 'id'> & { id?: string }) => void;
  onRemoveTeacher: (teacherId: string) => void;
  onAssignStudentsHouse: (studentIds: string[], house: HouseId | null) => void;
  onUpsertStudent: (
    payload: Omit<
      Student,
      'id' | 'computedAge' | 'verifiedCategory' | 'dobStatus' | 'dobFlagReason'
    > & { id?: string }
  ) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateHouseCredential: (house: HouseId, patch: Partial<HouseCredential>) => void;
  onUpdateTeamCardEntryAudit: (
    cardId: string,
    entryId: string,
    auditStatus: PlayerAuditStatus,
    rejectionReason?: string
  ) => void;
  onFinalizeTeamCardReview: (
    cardId: string,
    decision: 'approved' | 'revision_requested',
    adminNote?: string
  ) => void;
  onAddScore: (payload: {
    house: HouseId;
    eventName: string;
    ageCategory: string;
    place: PlaceType;
    points: number;
    note?: string;
  }) => void;
  onDeleteScore: (scoreId: string) => void;
  onUpsertSchedule: (
    payload: Omit<EventSchedule, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  onDeleteSchedule: (scheduleId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  state,
  syncStatus,
  onConnectCloud,
  onDisconnectCloud,
  onSyncNow,
  onLogout,
  onResetDemoData,
  onUpdateAgeConfig,
  onUpsertGame,
  onDeleteGame,
  onAssignGamePlayer,
  onTogglePlayerRole,
  onRemoveGamePlayer,
  onImportStudents,
  onAutoDistribute,
  onUpsertTeacher,
  onRemoveTeacher,
  onAssignStudentsHouse,
  onUpsertStudent,
  onDeleteStudent,
  onUpdateHouseCredential,
  onUpdateTeamCardEntryAudit,
  onFinalizeTeamCardReview,
  onAddScore,
  onDeleteScore,
  onUpsertSchedule,
  onDeleteSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('standings');
  const standings = computeHouseStandings(state.scores);
  const pendingReviewCount = state.teamCards.filter(
    (c) => c.status === 'pending_review'
  ).length;

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'standings', label: 'Standings & Ledger', icon: Trophy },
    { id: 'age_config', label: 'Age & DOB Engine', icon: CalendarClock },
    { id: 'games', label: 'Games & Squads', icon: Gamepad2 },
    { id: 'schedules', label: 'Event Schedule', icon: CalendarDays },
    { id: 'bulk_upload', label: 'Excel Upload & Draft', icon: FileSpreadsheet },
    { id: 'appointments', label: 'House Appointments', icon: Users },
    { id: 'students', label: 'Students & Grades', icon: Activity },
    {
      id: 'team_cards',
      label: 'Team Card Review',
      icon: ClipboardCheck,
      badge: pendingReviewCount,
    },
    { id: 'security', label: 'House Passwords', icon: KeyRound },
  ];

  const activeNavLabel =
    navItems.find((item) => item.id === activeTab)?.label ?? 'Standings & Ledger';

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#09090B] flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-white shrink-0" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-wide text-white whitespace-nowrap">
              SCC Admin Control
            </span>
          </div>
        </div>

        <nav
          aria-label="Admin portal modules"
          className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible flex-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-zinc-800/90 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[11px] font-mono-tabular font-semibold text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block p-4 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Cutoff Date</span>
            <span className="font-mono-tabular text-zinc-200">{state.cutoffDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Master Roster</span>
            <span className="font-mono-tabular text-zinc-200">
              {state.students.length} students
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-800/80 bg-[#09090B] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-zinc-400 flex items-center gap-2 truncate">
            <span className="text-zinc-200 font-medium whitespace-nowrap">
              {state.meetName}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{activeNavLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SyncStatusBar
              syncStatus={syncStatus}
              onConnectCloud={onConnectCloud}
              onDisconnectCloud={onDisconnectCloud}
              onSyncNow={onSyncNow}
              compact
            />
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Demo
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'standings' && (
            <AdminStandings
              standings={standings}
              scores={state.scores}
              ageCategories={state.ageCategories}
              games={state.games}
              onAddScore={onAddScore}
              onDeleteScore={onDeleteScore}
            />
          )}

          {activeTab === 'age_config' && (
            <AdminAgeConfig
              cutoffDate={state.cutoffDate}
              ageCategories={state.ageCategories}
              students={state.students}
              onSaveConfig={onUpdateAgeConfig}
            />
          )}

          {activeTab === 'games' && (
            <AdminGames
              games={state.games}
              ageCategories={state.ageCategories}
              students={state.students}
              teamCards={state.teamCards}
              onUpsertGame={onUpsertGame}
              onDeleteGame={onDeleteGame}
              onAssignGamePlayer={onAssignGamePlayer}
              onTogglePlayerRole={onTogglePlayerRole}
              onRemoveGamePlayer={onRemoveGamePlayer}
            />
          )}

          {activeTab === 'schedules' && (
            <AdminSchedules
              schedules={state.schedules}
              ageCategories={state.ageCategories}
              games={state.games}
              onUpsertSchedule={onUpsertSchedule}
              onDeleteSchedule={onDeleteSchedule}
            />
          )}

          {activeTab === 'bulk_upload' && (
            <AdminBulkUpload
              cutoffDate={state.cutoffDate}
              ageCategories={state.ageCategories}
              students={state.students}
              onImportStudents={onImportStudents}
              onAutoDistribute={onAutoDistribute}
            />
          )}

          {activeTab === 'appointments' && (
            <AdminAppointments
              students={state.students}
              teachers={state.teachers}
              onUpsertTeacher={onUpsertTeacher}
              onRemoveTeacher={onRemoveTeacher}
              onAssignStudentsHouse={onAssignStudentsHouse}
            />
          )}

          {activeTab === 'students' && (
            <AdminStudents
              students={state.students}
              onUpsertStudent={onUpsertStudent}
              onDeleteStudent={onDeleteStudent}
            />
          )}

          {activeTab === 'team_cards' && (
            <AdminTeamCards
              teamCards={state.teamCards}
              students={state.students}
              games={state.games}
              onUpdatePlayerAudit={onUpdateTeamCardEntryAudit}
              onFinalizeCard={onFinalizeTeamCardReview}
            />
          )}

          {activeTab === 'security' && (
            <AdminSecurity
              houseCredentials={state.houseCredentials}
              onUpdateCredential={onUpdateHouseCredential}
            />
          )}
        </main>
      </div>
    </div>
  );
};
