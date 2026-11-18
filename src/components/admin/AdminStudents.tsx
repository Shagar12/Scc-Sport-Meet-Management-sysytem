import React, { useMemo, useState } from 'react';
import { Activity, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import {
  Gender,
  HOUSE_ORDER,
  HOUSES,
  HouseId,
  Student,
} from '../../types/sports';
import { DobVerificationBadge, HouseTag } from '../HouseBadge';

interface AdminStudentsProps {
  students: Student[];
  onUpsertStudent: (
    payload: Omit<
      Student,
      'id' | 'computedAge' | 'verifiedCategory' | 'dobStatus' | 'dobFlagReason'
    > & { id?: string }
  ) => void;
  onDeleteStudent: (studentId: string) => void;
}

interface StudentFormState {
  id?: string;
  admissionNo: string;
  fullName: string;
  dob: string;
  gender: Gender;
  grade: string;
  house: HouseId | '';
  talentedAthlete: boolean;
  primarySport: string;
  restingHeartRate: string;
  medicalNotes: string;
}

const EMPTY_FORM: StudentFormState = {
  admissionNo: '',
  fullName: '',
  dob: '2010-06-15',
  gender: 'Male',
  grade: 'Grade 10',
  house: 'mars',
  talentedAthlete: false,
  primarySport: '100m',
  restingHeartRate: '',
  medicalNotes: '',
};

export const AdminStudents: React.FC<AdminStudentsProps> = ({
  students,
  onUpsertStudent,
  onDeleteStudent,
}) => {
  const [search, setSearch] = useState('');
  const [filterHouse, setFilterHouse] = useState<'all' | 'unassigned' | HouseId>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterHouse === 'unassigned' && s.house !== null) return false;
      if (filterHouse !== 'all' && filterHouse !== 'unassigned' && s.house !== filterHouse)
        return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.primarySport.toLowerCase().includes(q) ||
        (s.verifiedCategory ?? '').toLowerCase().includes(q)
      );
    });
  }, [students, search, filterHouse]);

  const openNewStudent = () => {
    setForm({
      ...EMPTY_FORM,
      admissionNo: `SCC-${1025 + students.length}`,
    });
    setModalOpen(true);
  };

  const openEditStudent = (s: Student) => {
    setForm({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.fullName,
      dob: s.dob,
      gender: s.gender,
      grade: s.grade,
      house: s.house ?? '',
      talentedAthlete: s.talentedAthlete,
      primarySport: s.primarySport,
      restingHeartRate: s.biometrics.restingHeartRate
        ? String(s.biometrics.restingHeartRate)
        : '',
      medicalNotes: s.biometrics.medicalNotes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.admissionNo.trim() || !form.fullName.trim() || !form.dob) return;

    const rhr = Number(form.restingHeartRate);

    onUpsertStudent({
      id: form.id,
      admissionNo: form.admissionNo.trim(),
      fullName: form.fullName.trim(),
      dob: form.dob,
      gender: form.gender,
      grade: form.grade.trim(),
      house: form.house ? (form.house as HouseId) : null,
      talentedAthlete: form.talentedAthlete,
      primarySport: form.primarySport.trim() || 'Athletics',
      biometrics: {
        restingHeartRate: Number.isFinite(rhr) && rhr > 0 ? rhr : undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
      },
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Student Roster, Grade &amp; Profile Editor
          </h2>
          <p className="text-sm text-zinc-400">
            Admin-exclusive control over student profiles, Grade, DOB verification, Resting Heart Rate, and Medical Notes.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewStudent}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Student
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, admission no, sport, or category..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `All (${students.length})` },
              { id: 'mars', label: 'Mars' },
              { id: 'jupiter', label: 'Jupiter' },
              { id: 'venus', label: 'Venus' },
              { id: 'uranus', label: 'Uranus' },
              { id: 'unassigned', label: 'Unassigned' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterHouse(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filterHouse === tab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No students match the current search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">House</th>
                  <th className="py-3 px-4">DOB &amp; Category</th>
                  <th className="py-3 px-4">Sport &amp; Fitness</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{s.fullName}</div>
                      <div className="text-xs text-zinc-400 font-mono-tabular">
                        {s.admissionNo} · {s.gender}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-zinc-200 whitespace-nowrap">
                      {s.grade}
                    </td>
                    <td className="py-3 px-4">
                      <HouseTag house={s.house} />
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <DobVerificationBadge
                        status={s.dobStatus}
                        category={s.verifiedCategory}
                        reason={s.dobFlagReason}
                      />
                      <div className="text-xs text-zinc-400 font-mono-tabular">
                        {s.dob} ({s.computedAge ?? '—'} yrs)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="text-zinc-200">
                        {s.primarySport}
                        {s.talentedAthlete ? ' · Talented' : ''}
                      </div>
                      <div className="text-zinc-400 max-w-[260px] truncate">
                        {s.biometrics.restingHeartRate
                          ? `RHR: ${s.biometrics.restingHeartRate} bpm`
                          : 'RHR: —'}
                        {s.biometrics.medicalNotes
                          ? ` · ${s.biometrics.medicalNotes}`
                          : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditStudent(s)}
                        aria-label={`Edit profile for ${s.fullName}`}
                        className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(s.id)}
                        aria-label={`Delete ${s.fullName}`}
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

      {/* Modal: Add / Edit Student & Biometrics */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-editor-title"
        >
          <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-[#0F172A] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                <h3 id="student-editor-title" className="text-base font-semibold text-white">
                  {form.id ? 'Edit Student Profile & Grade' : 'Add New Student'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close editor"
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="stu-adm" className="block text-xs font-medium text-zinc-300">
                    Admission No
                  </label>
                  <input
                    id="stu-adm"
                    type="text"
                    value={form.admissionNo}
                    onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="stu-name" className="block text-xs font-medium text-zinc-300">
                    Full Name
                  </label>
                  <input
                    id="stu-name"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="stu-dob" className="block text-xs font-medium text-zinc-300">
                    Date of Birth (YYYY-MM-DD)
                  </label>
                  <input
                    id="stu-dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="stu-gender" className="block text-xs font-medium text-zinc-300">
                      Gender
                    </label>
                    <select
                      id="stu-gender"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value as Gender })
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="stu-grade" className="block text-xs font-medium text-zinc-300">
                      Grade
                    </label>
                    <input
                      id="stu-grade"
                      type="text"
                      value={form.grade}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="stu-house" className="block text-xs font-medium text-zinc-300">
                    Assigned House
                  </label>
                  <select
                    id="stu-house"
                    value={form.house}
                    onChange={(e) =>
                      setForm({ ...form, house: e.target.value as HouseId | '' })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {HOUSE_ORDER.map((h) => (
                      <option key={h} value={h}>
                        {HOUSES[h].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="stu-sport" className="block text-xs font-medium text-zinc-300">
                    Primary Sport
                  </label>
                  <input
                    id="stu-sport"
                    type="text"
                    value={form.primarySport}
                    onChange={(e) => setForm({ ...form, primarySport: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.talentedAthlete}
                  onChange={(e) =>
                    setForm({ ...form, talentedAthlete: e.target.checked })
                  }
                  className="rounded border-zinc-600 bg-zinc-950"
                />
                Flag as Talented / Sport Active Athlete (for Balanced Auto-Draft)
              </label>

              {/* Fitness & Medical Section */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-white">
                  Fitness &amp; Medical Notes (Admin Verified)
                </h4>

                <div className="space-y-1 max-w-xs">
                  <label htmlFor="bio-rhr" className="block text-xs font-medium text-zinc-300">
                    Resting Heart Rate (bpm)
                  </label>
                  <input
                    id="bio-rhr"
                    type="number"
                    value={form.restingHeartRate}
                    onChange={(e) =>
                      setForm({ ...form, restingHeartRate: e.target.value })
                    }
                    placeholder="60"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono-tabular text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="bio-notes" className="block text-xs font-medium text-zinc-300">
                    Fitness / Medical Notes
                  </label>
                  <textarea
                    id="bio-notes"
                    rows={2}
                    value={form.medicalNotes}
                    onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
                    placeholder="Medical clearance, allergy notes, or conditioning observations..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-white text-zinc-950 px-5 py-2 text-sm font-semibold hover:bg-zinc-200"
                >
                  Save Student & Verify DOB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
