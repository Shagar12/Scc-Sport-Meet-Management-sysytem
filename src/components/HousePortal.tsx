import React, { useState } from 'react';
import { CalendarDays, ClipboardList, LogOut, Trophy, Users } from 'lucide-react';
import {
  Gender,
  HOUSES,
  HouseId,
  PlayerRole,
  SportsMeetState,
} from '../types/sports';
import { SyncStatus } from '../hooks/useSportsStore';
import { computeHouseStandings } from '../utils/sportsLogic';
import { SyncStatusBar } from './SyncStatusBar';
import { HouseRosterView } from './house/HouseRosterView';
import { HouseScheduleView } from './house/HouseScheduleView';
import { HouseStandingsView } from './house/HouseStandingsView';
import { HouseTeamCardBuilder } from './house/HouseTeamCardBuilder';

type HouseTab = 'standings' | 'roster' | 'schedule' | 'team_card';

interface HousePortalProps {
  house: HouseId;
  state: SportsMeetState;
  syncStatus: SyncStatus;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
  onSyncNow: () => void;
  onLogout: () => void;
  onAddTeamCardEntry: (
    house: HouseId,
    studentId: string,
    eventName: string,
    ageCategory: string,
    gender: Gender,
    playerRole?: PlayerRole
  ) => { ok: boolean; error?: string };
  onRemoveTeamCardEntry: (house: HouseId, entryId: string) => void;
  onSubmitTeamCard: (house: HouseId) => void;
}

export const HousePortal: React.FC<HousePortalProps> = ({
  house,
  state,
  syncStatus,
  onConnectCloud,
  onDisconnectCloud,
  onSyncNow,
  onLogout,
  onAddTeamCardEntry,
  onRemoveTeamCardEntry,
  onSubmitTeamCard,
}) => {
  const [activeTab, setActiveTab] = useState<HouseTab>('team_card');
  const meta = HOUSES[house];
  const standings = computeHouseStandings(state.scores);
  const myStanding = standings.find((s) => s.house === house);
  const houseTeamCard = state.teamCards.find((tc) => tc.house === house);

  const navItems: {
    id: HouseTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'roster', label: 'Roster & Staff', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'team_card', label: 'Team Card', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      {/* House-Themed Header */}
      <header
        className="border-b bg-[#09090B] no-print"
        style={{ borderColor: `${meta.colorHex}40` }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
              <span
                className="h-3.5 w-3.5 rounded-xs shrink-0"
                style={{ backgroundColor: meta.colorHex }}
                aria-hidden="true"
              />
              <span className="font-display text-xl font-bold tracking-wide text-white">
                {meta.name} Portal
              </span>
            </div>

            <div className="flex md:hidden items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>

          <nav
            aria-label="House portal sections"
            className="flex items-center gap-1.5 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${meta.colorHex}20`,
                          borderColor: `${meta.colorHex}66`,
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                        }
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <SyncStatusBar
              syncStatus={syncStatus}
              onConnectCloud={onConnectCloud}
              onDisconnectCloud={onDisconnectCloud}
              onSyncNow={onSyncNow}
              compact
            />
            <span className="text-xs font-mono-tabular text-zinc-400">
              Rank #{myStanding?.rank ?? '—'} · {myStanding?.totalPoints ?? 0} pts
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
          <div className="flex md:hidden items-center justify-between gap-2 pt-1">
            <SyncStatusBar
              syncStatus={syncStatus}
              onConnectCloud={onConnectCloud}
              onDisconnectCloud={onDisconnectCloud}
              onSyncNow={onSyncNow}
              compact
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        {activeTab === 'standings' && (
          <HouseStandingsView
            currentHouse={house}
            standings={standings}
            scores={state.scores}
          />
        )}

        {activeTab === 'roster' && (
          <HouseRosterView
            house={house}
            students={state.students}
            teachers={state.teachers}
          />
        )}

        {activeTab === 'schedule' && (
          <HouseScheduleView
            house={house}
            schedules={state.schedules}
            ageCategories={state.ageCategories}
            teamCard={houseTeamCard}
          />
        )}

        {activeTab === 'team_card' && (
          <HouseTeamCardBuilder
            house={house}
            meetName={state.meetName}
            students={state.students}
            ageCategories={state.ageCategories}
            games={state.games}
            teamCard={houseTeamCard}
            onAddEntry={onAddTeamCardEntry}
            onRemoveEntry={onRemoveTeamCardEntry}
            onSubmitCard={onSubmitTeamCard}
          />
        )}
      </main>
    </div>
  );
};
