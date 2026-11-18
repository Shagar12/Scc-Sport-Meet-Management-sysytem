import React, { useState } from 'react';
import { CalendarCheck, CheckCircle2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AgeCategory, Student } from '../../types/sports';
import { DobVerificationBadge, HouseTag } from '../HouseBadge';

interface AdminAgeConfigProps {
  cutoffDate: string;
  ageCategories: AgeCategory[];
  students: Student[];
  onSaveConfig: (cutoffDate: string, ageCategories: AgeCategory[]) => void;
}

export const AdminAgeConfig: React.FC<AdminAgeConfigProps> = ({
  cutoffDate,
  ageCategories,
  students,
  onSaveConfig,
}) => {
  const [draftCutoff, setDraftCutoff] = useState(cutoffDate);
  const [draftCategories, setDraftCategories] = useState<AgeCategory[]>(ageCategories);
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('20');
  const [newMax, setNewMax] = useState('21');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const verifiedCount = students.filter((s) => s.dobStatus === 'verified').length;
  const flaggedStudents = students.filter((s) => s.dobStatus !== 'verified');

  const handleCategoryChange = (
    id: string,
    field: 'name' | 'minAge' | 'maxAge',
    value: string
  ) => {
    setDraftCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== id) return cat;
        if (field === 'name') return { ...cat, name: value };
        const num = Number(value);
        return { ...cat, [field]: Number.isFinite(num) ? num : 0 };
      })
    );
  };

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    const minAge = Number(newMin);
    const maxAge = Number(newMax);
    if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || minAge > maxAge) return;

    setDraftCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        name: newName.trim(),
        minAge,
        maxAge,
      },
    ]);
    setNewName('');
  };

  const handleRemoveCategory = (id: string) => {
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleApplyAndReverify = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(draftCutoff, draftCategories);
    setSavedNotice(
      `Cutoff date set to ${draftCutoff}. Re-verified all ${students.length} student DOB records.`
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Age Category Configuration & DOB Verification Engine
          </h2>
          <p className="text-sm text-zinc-400">
            Configure the official meet cutoff date and age brackets. Saving automatically recalculates and verifies every student&apos;s age category.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono-tabular">
          <span>Verified: {verifiedCount}/{students.length}</span>
          <span aria-hidden="true">·</span>
          <span className={flaggedStudents.length > 0 ? 'text-amber-400' : 'text-emerald-400'}>
            Flagged DOBs: {flaggedStudents.length}
          </span>
        </div>
      </div>

      {savedNotice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{savedNotice}</span>
        </div>
      )}

      <form onSubmit={handleApplyAndReverify} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cutoff Date & Add Category */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-zinc-300" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">Meet Cutoff Date</h3>
            </div>
            <p className="text-xs text-zinc-400">
              All athlete ages are calculated as completed years on this exact reference date.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="cutoff-date" className="block text-xs font-medium text-zinc-300">
                Reference Cutoff Date (YYYY-MM-DD)
              </label>
              <input
                id="cutoff-date"
                type="date"
                value={draftCutoff}
                onChange={(e) => setDraftCutoff(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-zinc-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Save & Re-Verify All DOBs
            </button>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
            <h3 className="text-base font-semibold text-white">Add Custom Age Category</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="new-cat-name" className="block text-xs text-zinc-400">
                  Label
                </label>
                <input
                  id="new-cat-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="U-21"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-cat-min" className="block text-xs text-zinc-400">
                  Min Age
                </label>
                <input
                  id="new-cat-min"
                  type="number"
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-cat-max" className="block text-xs text-zinc-400">
                  Max Age
                </label>
                <input
                  id="new-cat-max"
                  type="number"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCategory}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Category Bracket
            </button>
          </div>
        </div>

        {/* Right: Configured Age Categories Table */}
        <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Active Age Categories
            </h3>
            <span className="text-xs text-zinc-400">
              {draftCategories.length} brackets configured
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Min Age (yrs)</th>
                  <th className="py-3 px-4">Max Age (yrs)</th>
                  <th className="py-3 px-4 text-right">Verified Students</th>
                  <th className="py-3 px-4 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {draftCategories.map((cat) => {
                  const count = students.filter(
                    (s) => s.verifiedCategory === cat.name
                  ).length;
                  return (
                    <tr key={cat.id} className="hover:bg-zinc-900/40">
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          aria-label={`Category name for ${cat.name}`}
                          value={cat.name}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'name', e.target.value)
                          }
                          className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm font-medium text-white"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          aria-label={`Minimum age for ${cat.name}`}
                          value={cat.minAge}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'minAge', e.target.value)
                          }
                          className="w-20 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm font-mono-tabular text-white"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          aria-label={`Maximum age for ${cat.name}`}
                          value={cat.maxAge}
                          onChange={(e) =>
                            handleCategoryChange(cat.id, 'maxAge', e.target.value)
                          }
                          className="w-20 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm font-mono-tabular text-white"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-zinc-200">
                        {count}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat.id)}
                          aria-label={`Remove ${cat.name}`}
                          className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>

      {/* Live Verification Audit Table */}
      <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              DOB Verification Audit Summary
            </h3>
            <p className="text-xs text-zinc-400">
              Showing computed age as of <span className="font-mono-tabular text-zinc-200">{cutoffDate}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0F172A] z-10">
              <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                <th className="py-3 px-4">Adm No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">DOB</th>
                <th className="py-3 px-4 text-right">Computed Age</th>
                <th className="py-3 px-4">House</th>
                <th className="py-3 px-4">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-sm">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/40">
                  <td className="py-2.5 px-4 font-mono-tabular text-xs text-zinc-400">
                    {s.admissionNo}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-white">{s.fullName}</td>
                  <td className="py-2.5 px-4 font-mono-tabular text-xs text-zinc-300">
                    {s.dob}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-zinc-200">
                    {s.computedAge !== null ? `${s.computedAge} yrs` : '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <HouseTag house={s.house} />
                  </td>
                  <td className="py-2.5 px-4">
                    <DobVerificationBadge
                      status={s.dobStatus}
                      category={s.verifiedCategory}
                      reason={s.dobFlagReason}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
