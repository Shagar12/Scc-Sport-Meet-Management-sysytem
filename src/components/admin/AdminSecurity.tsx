import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Lock, RefreshCw, Unlock } from 'lucide-react';
import { HOUSE_ORDER, HOUSES, HouseCredential, HouseId } from '../../types/sports';

interface AdminSecurityProps {
  houseCredentials: Record<HouseId, HouseCredential>;
  onUpdateCredential: (house: HouseId, patch: Partial<HouseCredential>) => void;
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
  houseCredentials,
  onUpdateCredential,
}) => {
  const [draftPasswords, setDraftPasswords] = useState<Record<HouseId, string>>({
    mars: houseCredentials.mars.password,
    jupiter: houseCredentials.jupiter.password,
    venus: houseCredentials.venus.password,
    uranus: houseCredentials.uranus.password,
  });
  const [visibleMap, setVisibleMap] = useState<Record<HouseId, boolean>>({
    mars: false,
    jupiter: false,
    venus: false,
    uranus: false,
  });
  const [savedHouse, setSavedHouse] = useState<HouseId | null>(null);

  const generateRandomPassword = (house: HouseId) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 4; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    const next = `${house.slice(0, 3)}-${token}`;
    setDraftPasswords((prev) => ({ ...prev, [house]: next }));
    onUpdateCredential(house, { password: next });
    setSavedHouse(house);
    setVisibleMap((prev) => ({ ...prev, [house]: true }));
  };

  const handleSavePassword = (house: HouseId) => {
    const pwd = draftPasswords[house].trim();
    if (!pwd) return;
    onUpdateCredential(house, { password: pwd });
    setSavedHouse(house);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white tracking-tight">
          House Portal Password Manager
        </h2>
        <p className="text-sm text-zinc-400">
          Manage isolated login credentials for Mars, Jupiter, Venus, and Uranus. Locking a house immediately blocks portal sign-in for that house.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {HOUSE_ORDER.map((houseId) => {
          const meta = HOUSES[houseId];
          const cred = houseCredentials[houseId];
          const isVisible = visibleMap[houseId];

          return (
            <div
              key={houseId}
              className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-xs shrink-0"
                    style={{ backgroundColor: meta.colorHex }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-white">{meta.name}</h3>
                    <p className="text-xs text-zinc-400">{meta.motto}</p>
                  </div>
                </div>

                {/* Active / Locked Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={cred.isActive}
                  aria-label={`Toggle ${meta.name} access`}
                  onClick={() =>
                    onUpdateCredential(houseId, { isActive: !cred.isActive })
                  }
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    cred.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  {cred.isActive ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                      Active
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Locked
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`pwd-${houseId}`}
                  className="block text-xs font-medium text-zinc-300"
                >
                  House Access Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound
                      className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id={`pwd-${houseId}`}
                      type={isVisible ? 'text' : 'password'}
                      value={draftPasswords[houseId]}
                      onChange={(e) => {
                        setDraftPasswords((prev) => ({
                          ...prev,
                          [houseId]: e.target.value,
                        }));
                        if (savedHouse === houseId) setSavedHouse(null);
                      }}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-10 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMap((prev) => ({
                          ...prev,
                          [houseId]: !prev[houseId],
                        }))
                      }
                      aria-label={
                        isVisible
                          ? `Hide ${meta.name} password`
                          : `Show ${meta.name} password`
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                    >
                      {isVisible ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateRandomPassword(houseId)}
                    title="Random-generate password"
                    aria-label={`Generate random password for ${meta.name}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <span className="text-xs text-zinc-400">
                  {savedHouse === houseId ? (
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Password updated
                    </span>
                  ) : (
                    `Current status: ${cred.isActive ? 'Sign-in enabled' : 'Sign-in blocked'}`
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => handleSavePassword(houseId)}
                  className="rounded-lg bg-white text-zinc-950 px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
                >
                  Save Password
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
