import React, { useState } from 'react';
import { Lock, Search, ShieldCheck } from 'lucide-react';
import { HOUSES, HouseId, Student, Teacher } from '../../types/sports';
import { DobVerificationBadge } from '../HouseBadge';

interface HouseRosterViewProps {
  house: HouseId;
  students: Student[];
  teachers: Teacher[];
}

export const HouseRosterView: React.FC<HouseRosterViewProps> = ({
  house,
  students,
  teachers,
}) => {
  const [search, setSearch] = useState('');
  const meta = HOUSES[house];

  const houseStudents = students.filter((s) => s.house === house);
  const houseTeachers = teachers.filter((t) => t.house === house);

  const filteredStudents = houseStudents.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q) ||
      (s.verifiedCategory ?? '').toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      s.primarySport.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            {meta.name} Roster & Appointed Staff
          </h2>
          <p className="text-sm text-zinc-400">
            Official house athletes and teachers appointed by the Meet Admin. Profiles, Grade, and DOB verification are locked against edits.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 whitespace-nowrap">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Admin Verified - Read Only
        </span>
      </div>

      {/* Appointed Staff */}
      <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Appointed Teachers & Coaches ({houseTeachers.length})
          </h3>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Admin Verified - Read Only
          </span>
        </div>

        {houseTeachers.length === 0 ? (
          <p className="text-sm text-zinc-400">No teachers appointed to this house yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {houseTeachers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-1"
              >
                <p className="text-sm font-semibold text-white">{t.fullName}</p>
                <p className="text-xs font-medium" style={{ color: meta.colorHex }}>
                  {t.role}
                </p>
                <p className="text-xs text-zinc-400">{t.staffIdOrSubject}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Assigned Students (Read Only) */}
      <section className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Assigned House Athletes ({houseStudents.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Verified age categories, grades, and fitness notes are locked by Administration.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search house roster"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter house athletes..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No athletes found in {meta.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4">Athlete</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">DOB &amp; Verified Age Category</th>
                  <th className="py-3 px-4">Primary Sport</th>
                  <th className="py-3 px-4">Fitness &amp; Medical</th>
                  <th className="py-3 px-4">Record Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{s.fullName}</div>
                      <div className="text-xs text-zinc-400 font-mono-tabular">
                        {s.admissionNo} · {s.gender}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-zinc-200 whitespace-nowrap">
                      {s.grade}
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <DobVerificationBadge
                        status={s.dobStatus}
                        category={s.verifiedCategory}
                        reason={s.dobFlagReason}
                      />
                      <div className="text-xs text-zinc-400 font-mono-tabular">
                        DOB: {s.dob} ({s.computedAge ?? '—'} yrs)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-200">
                      {s.primarySport}
                      {s.talentedAthlete ? ' · Talented Athlete' : ''}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-tabular text-zinc-300">
                      <div className="text-zinc-400">
                        RHR:{' '}
                        {s.biometrics.restingHeartRate
                          ? `${s.biometrics.restingHeartRate} bpm`
                          : '—'}
                        {s.biometrics.medicalNotes ? ` · ${s.biometrics.medicalNotes}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300 whitespace-nowrap">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Admin Verified - Read Only
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
