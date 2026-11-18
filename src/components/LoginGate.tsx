import React, { useState } from 'react';
import { KeyRound, Lock, Shield, Trophy, Users } from 'lucide-react';
import { SyncStatus } from '../hooks/useSportsStore';
import { HOUSE_ORDER, HOUSES, HouseCredential, HouseId } from '../types/sports';
import { HouseStanding } from '../utils/sportsLogic';
import { SyncStatusBar } from './SyncStatusBar';

interface LoginGateProps {
  meetName: string;
  houseCredentials: Record<HouseId, HouseCredential>;
  standings: HouseStanding[];
  syncStatus: SyncStatus;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
  onSyncNow: () => void;
  onLoginAdmin: (password: string) => { ok: boolean; error?: string };
  onLoginHouse: (
    house: HouseId,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  meetName,
  houseCredentials,
  standings,
  syncStatus,
  onConnectCloud,
  onDisconnectCloud,
  onSyncNow,
  onLoginAdmin,
  onLoginHouse,
}) => {
  const [portalMode, setPortalMode] = useState<'admin' | 'house'>('admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<HouseId>('mars');
  const [housePasswordInput, setHousePasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onLoginAdmin(adminPasswordInput);
    if (!res.ok) {
      setError(res.error ?? 'Authentication failed.');
    }
  };

  const handleQuickAdminLogin = () => {
    setError(null);
    onLoginAdmin('admin2026');
  };

  const handleHouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await onLoginHouse(selectedHouse, housePasswordInput);
    if (!res.ok) {
      setError(res.error ?? 'Authentication failed.');
    }
  };

  const activeHouseMeta = HOUSES[selectedHouse];
  const activeHouseCred = houseCredentials[selectedHouse];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-zinc-800/80 bg-[#09090B]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <Trophy className="h-5 w-5 text-zinc-200" aria-hidden="true" />
            <span className="font-display text-xl font-bold tracking-wide text-white">
              SCC Sports Meet
            </span>
            <span className="text-xs text-zinc-400 hidden lg:inline">
              · {meetName}
            </span>
          </div>
          <SyncStatusBar
            syncStatus={syncStatus}
            onConnectCloud={onConnectCloud}
            onDisconnectCloud={onDisconnectCloud}
            onSyncNow={onSyncNow}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Brief & Live Standings Preview */}
        <section className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Inter-House Athletics Management
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-balance leading-[1.08]">
              SCC Inter-House Sports Meet Portal
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
              Centralized meet governance for Mars, Jupiter, Venus, and Uranus Houses. Verify student dates of birth, balance house squads, audit playing team cards, and track live points.
            </p>
          </div>

          {/* Live 4-House Standings Strip */}
          <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">
                Current Championship Standings
              </h2>
              <span className="text-xs text-zinc-400">Live Points</span>
            </div>
            <div className="divide-y divide-zinc-800/80">
              {standings.map((item) => {
                const meta = HOUSES[item.house];
                return (
                  <div
                    key={item.house}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-tabular text-xs font-semibold text-zinc-400 w-5">
                        #{item.rank}
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: meta.colorHex }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-white truncate">
                        {meta.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-zinc-400 hidden sm:inline font-mono-tabular">
                        1st: {item.goldCount} · 2nd: {item.silverCount} · 3rd: {item.bronzeCount}
                      </span>
                      <span className="font-mono-tabular text-base font-semibold text-white whitespace-nowrap text-right">
                        {item.totalPoints} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* House Access Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HOUSE_ORDER.map((houseId) => {
              const meta = HOUSES[houseId];
              const cred = houseCredentials[houseId];
              return (
                <div
                  key={houseId}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/80 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: meta.colorHex }}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        cred.isActive ? 'text-zinc-400' : 'text-red-400'
                      }`}
                    >
                      {cred.isActive ? 'Active' : 'Locked'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{meta.shortName}</p>
                  <p className="text-xs text-zinc-400 truncate">{meta.motto}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Dual Role-Based Login Card */}
        <section className="lg:col-span-6">
          <div className="rounded-xl border border-zinc-800 bg-[#0F172A]/75 p-6 sm:p-8 space-y-6">
            {/* Role Switcher */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400">Select Entry Portal</span>
              <div
                className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800"
                role="tablist"
                aria-label="Entry portal selector"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={portalMode === 'admin'}
                  onClick={() => {
                    setPortalMode('admin');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    portalMode === 'admin'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Admin Portal
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={portalMode === 'house'}
                  onClick={() => {
                    setPortalMode('house');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    portalMode === 'house'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                  House Portal
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            {portalMode === 'admin' ? (
              <form onSubmit={handleAdminSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">
                    Meet Administration Sign In
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Full read/write governance for DOB rules, bulk Excel uploads, student grades &amp; profiles, team card audits, and house passwords.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium text-zinc-200"
                  >
                    Admin Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-password"
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Enter admin password (demo: admin2026)"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-white text-zinc-950 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
                  >
                    Enter Admin Portal
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAdminLogin}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap"
                  >
                    Quick Demo Admin Login
                  </button>
                </div>

                <p className="text-xs text-zinc-400 pt-1">
                  Default demo password: <span className="font-mono-tabular text-zinc-200">admin2026</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleHouseSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">
                    House Captain & Master Sign In
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Select your assigned house and enter the house-specific password issued by the Meet Admin.
                  </p>
                </div>

                {/* House Selection Grid */}
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-zinc-200">
                    Select House
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {HOUSE_ORDER.map((houseId) => {
                      const meta = HOUSES[houseId];
                      const cred = houseCredentials[houseId];
                      const isSelected = selectedHouse === houseId;
                      return (
                        <button
                          key={houseId}
                          type="button"
                          onClick={() => {
                            setSelectedHouse(houseId);
                            setError(null);
                          }}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                            isSelected
                              ? `${meta.borderClass} ${meta.softBgClass} text-white`
                              : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 text-sm font-medium whitespace-nowrap">
                            <span
                              className="h-3 w-3 rounded-xs shrink-0"
                              style={{ backgroundColor: meta.colorHex }}
                              aria-hidden="true"
                            />
                            {meta.shortName}
                          </span>
                          {!cred.isActive && (
                            <Lock
                              className="h-3.5 w-3.5 text-red-400 shrink-0"
                              aria-label="Locked"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="house-password"
                    className="block text-sm font-medium text-zinc-200"
                  >
                    {activeHouseMeta.name} Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="house-password"
                      type="password"
                      value={housePasswordInput}
                      onChange={(e) => setHousePasswordInput(e.target.value)}
                      placeholder={
                        activeHouseCred.isActive
                          ? `Enter ${activeHouseMeta.shortName} password`
                          : `${activeHouseMeta.name} is locked by Admin`
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    style={{ backgroundColor: activeHouseMeta.colorHex }}
                    className="flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Enter {activeHouseMeta.name} Portal
                  </button>
                </div>

                <p className="text-xs text-zinc-400 pt-1">
                  Demo house passwords:{' '}
                  <span className="font-mono-tabular text-zinc-300">
                    mars123 · jupiter123 · venus123 · uranus123
                  </span>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
