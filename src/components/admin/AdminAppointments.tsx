import React, { useMemo, useState } from 'react';
import {
  Edit2,
  GraduationCap,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  HOUSE_ORDER,
  HOUSES,
  HouseId,
  Student,
  Teacher,
  TeacherRole,
} from '../../types/sports';
import {
  computeHouseBalances,
  getHouseAppointments,
} from '../../utils/sportsLogic';
import { DobVerificationBadge, HouseTag } from '../HouseBadge';

interface AdminAppointmentsProps {
  students: Student[];
  teachers: Teacher[];
  onUpsertTeacher: (teacher: Omit<Teacher, 'id'> & { id?: string }) => void;
  onRemoveTeacher: (teacherId: string) => void;
  onAssignStudentsHouse: (studentIds: string[], house: HouseId | null) => void;
}

type HouseSectionView = 'both' | 'teachers' | 'students';

const TEACHER_ROLES: TeacherRole[] = [
  'Master-in-Charge',
  'Assistant Master-in-Charge',
  'Track Coach',
  'Field Coach',
];

export const AdminAppointments: React.FC<AdminAppointmentsProps> = ({
  students,
  teachers,
  onUpsertTeacher,
  onRemoveTeacher,
  onAssignStudentsHouse,
}) => {
  // Active house focus when clicking a House card (or 'all' for full roster)
  const [selectedHouse, setSelectedHouse] = useState<'all' | HouseId>('all');
  const [houseSectionView, setHouseSectionView] =
    useState<HouseSectionView>('both');
  const [onlyUnassignedStudents, setOnlyUnassignedStudents] = useState(false);

  // Teacher form state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherRole, setTeacherRole] =
    useState<TeacherRole>('Master-in-Charge');
  const [teacherHouse, setTeacherHouse] = useState<HouseId>('mars');

  // Student appointment state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkTargetHouse, setBulkTargetHouse] = useState<HouseId>('mars');

  const balances = computeHouseBalances(students, teachers);

  const handleSelectHouse = (house: 'all' | HouseId) => {
    setSelectedHouse(house);
    setOnlyUnassignedStudents(false);
    setSelectedStudentIds([]);
    if (house !== 'all') {
      if (!editingTeacherId) {
        setTeacherHouse(house);
      }
      setBulkTargetHouse(house);
      setHouseSectionView('both');
    }
  };

  const handleHouseCardClick = (houseId: HouseId) => {
    if (selectedHouse === houseId) {
      handleSelectHouse('all');
    } else {
      handleSelectHouse(houseId);
    }
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherSubject.trim()) return;
    onUpsertTeacher({
      id: editingTeacherId ?? undefined,
      fullName: teacherName.trim(),
      staffIdOrSubject: teacherSubject.trim(),
      role: teacherRole,
      house: teacherHouse,
    });
    setEditingTeacherId(null);
    setTeacherName('');
    setTeacherSubject('');
    setTeacherRole('Master-in-Charge');
  };

  const startEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherName(t.fullName);
    setTeacherSubject(t.staffIdOrSubject);
    setTeacherRole(t.role);
    setTeacherHouse(t.house);
  };

  const { houseTeachers, houseStudents } = useMemo(
    () => getHouseAppointments(students, teachers, selectedHouse),
    [students, teachers, selectedHouse]
  );

  const displayedStudents = useMemo(() => {
    if (selectedHouse === 'all' && onlyUnassignedStudents) {
      return students.filter((s) => s.house === null);
    }
    return houseStudents;
  }, [selectedHouse, onlyUnassignedStudents, students, houseStudents]);

  const toggleStudentCheck = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const visibleIds = displayedStudents.map((s) => s.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedStudentIds((prev) =>
        Array.from(new Set([...prev, ...visibleIds]))
      );
    }
  };

  const handleBulkAssign = () => {
    if (selectedStudentIds.length === 0) return;
    onAssignStudentsHouse(selectedStudentIds, bulkTargetHouse);
    setSelectedStudentIds([]);
  };

  const activeHouseMeta = selectedHouse === 'all' ? null : HOUSES[selectedHouse];
  const showTeachersSection =
    selectedHouse === 'all' ||
    houseSectionView === 'both' ||
    houseSectionView === 'teachers';
  const showStudentsSection =
    selectedHouse === 'all' ||
    houseSectionView === 'both' ||
    houseSectionView === 'students';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Teacher &amp; Student House Appointments
          </h2>
          <p className="text-sm text-zinc-400">
            Click any House card below to inspect that house&apos;s appointed teachers and students separately, or manage appointments across all houses.
          </p>
        </div>
        {selectedHouse !== 'all' && (
          <button
            type="button"
            onClick={() => handleSelectHouse('all')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Show All Houses
          </button>
        )}
      </div>

      {/* Interactive House Cards */}
      <section aria-label="Filter appointments by house" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {HOUSE_ORDER.map((houseId) => {
          const meta = HOUSES[houseId];
          const b = balances[houseId];
          const isSelected = selectedHouse === houseId;
          return (
            <button
              key={houseId}
              type="button"
              onClick={() => handleHouseCardClick(houseId)}
              aria-pressed={isSelected}
              style={
                isSelected
                  ? {
                      borderColor: meta.colorHex,
                      backgroundColor: `${meta.colorHex}18`,
                    }
                  : undefined
              }
              className={`text-left rounded-lg border p-4 space-y-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isSelected
                  ? 'shadow-sm'
                  : 'border-zinc-800 bg-[#0F172A]/70 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span
                    className="h-2.5 w-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: meta.colorHex }}
                    aria-hidden="true"
                  />
                  {meta.name}
                </span>
                <span
                  className="font-mono-tabular text-[11px] font-medium"
                  style={isSelected ? { color: meta.colorHex } : undefined}
                >
                  {isSelected ? 'Selected' : 'View House'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-zinc-800/80">
                <div>
                  <p className="font-mono-tabular text-lg font-semibold text-white">
                    {b.totalStudents}
                  </p>
                  <p className="text-[11px] text-zinc-400">Students</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-lg font-semibold text-white">
                    {b.talentedAthletes}
                  </p>
                  <p className="text-[11px] text-zinc-400">Talented</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-lg font-semibold text-white">
                    {b.appointedTeachers}
                  </p>
                  <p className="text-[11px] text-zinc-400">Teachers</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Focused House Header & Separate Teachers / Students Toggle */}
      {activeHouseMeta && (
        <section
          aria-label={`${activeHouseMeta.name} separate roster controls`}
          className="rounded-lg border bg-[#0F172A]/80 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
          style={{ borderColor: `${activeHouseMeta.colorHex}55` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 rounded-xs shrink-0"
              style={{ backgroundColor: activeHouseMeta.colorHex }}
              aria-hidden="true"
            />
            <div>
              <h3 className="text-base font-semibold text-white">
                {activeHouseMeta.name} Roster Breakdown
              </h3>
              <p className="text-xs text-zinc-400 font-mono-tabular">
                {houseTeachers.length} Appointed Teacher
                {houseTeachers.length === 1 ? '' : 's'} · {houseStudents.length}{' '}
                Assigned Student{houseStudents.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="House view filter"
            className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1"
          >
            {(
              [
                {
                  id: 'both',
                  label: 'Separate Sections (Both)',
                },
                {
                  id: 'teachers',
                  label: `Teachers (${houseTeachers.length})`,
                },
                {
                  id: 'students',
                  label: `Students (${houseStudents.length})`,
                },
              ] as const
            ).map((opt) => {
              const active = houseSectionView === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHouseSectionView(opt.id)}
                  style={
                    active
                      ? {
                          backgroundColor: `${activeHouseMeta.colorHex}26`,
                          color: '#FFFFFF',
                        }
                      : undefined
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 1: House Teachers (Separate Section) */}
      {showTeachersSection && (
        <section
          aria-label={
            activeHouseMeta
              ? `${activeHouseMeta.name} Teachers`
              : 'Appointed House Teachers'
          }
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <form
            onSubmit={handleTeacherSubmit}
            className="lg:col-span-4 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                {editingTeacherId
                  ? 'Edit Teacher Appointment'
                  : activeHouseMeta
                    ? `Appoint ${activeHouseMeta.shortName} Teacher`
                    : 'Appoint Teacher'}
              </h3>
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacherId(null);
                    setTeacherName('');
                    setTeacherSubject('');
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="teacher-name"
                className="block text-xs font-medium text-zinc-300"
              >
                Full Name
              </label>
              <input
                id="teacher-name"
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Kamal Senaratne"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="teacher-subject"
                className="block text-xs font-medium text-zinc-300"
              >
                Staff ID / Subject
              </label>
              <input
                id="teacher-subject"
                type="text"
                value={teacherSubject}
                onChange={(e) => setTeacherSubject(e.target.value)}
                placeholder="e.g. STF-130 · Physical Education"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="teacher-role"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Role
                </label>
                <select
                  id="teacher-role"
                  value={teacherRole}
                  onChange={(e) => setTeacherRole(e.target.value as TeacherRole)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-sm text-white"
                >
                  {TEACHER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="teacher-house"
                  className="block text-xs font-medium text-zinc-300"
                >
                  House
                </label>
                <select
                  id="teacher-house"
                  value={teacherHouse}
                  onChange={(e) => setTeacherHouse(e.target.value as HouseId)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-sm text-white"
                >
                  {HOUSE_ORDER.map((h) => (
                    <option key={h} value={h}>
                      {HOUSES[h].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {editingTeacherId ? 'Update Teacher' : 'Appoint to House'}
            </button>
          </form>

          {/* Appointed Teachers Table */}
          <div className="lg:col-span-8 rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {activeHouseMeta
                      ? `${activeHouseMeta.name} Teachers (${houseTeachers.length})`
                      : `Appointed House Teachers (${houseTeachers.length})`}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {activeHouseMeta
                      ? `Staff and coaches appointed exclusively to ${activeHouseMeta.name}.`
                      : 'All house masters-in-charge and coaches across the 4 houses.'}
                  </p>
                </div>
              </div>
              {activeHouseMeta && (
                <HouseTag house={activeHouseMeta.id} />
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned House</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-sm">
                  {houseTeachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-sm text-zinc-500"
                      >
                        No teachers appointed to{' '}
                        {activeHouseMeta ? activeHouseMeta.name : 'any house'}{' '}
                        yet.
                      </td>
                    </tr>
                  ) : (
                    houseTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-900/40">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">
                            {t.fullName}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {t.staffIdOrSubject}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-300 text-xs whitespace-nowrap">
                          {t.role}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Transfer house for ${t.fullName}`}
                            value={t.house}
                            onChange={(e) =>
                              onUpsertTeacher({
                                ...t,
                                house: e.target.value as HouseId,
                              })
                            }
                            className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white"
                          >
                            {HOUSE_ORDER.map((h) => (
                              <option key={h} value={h}>
                                {HOUSES[h].name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => startEditTeacher(t)}
                            aria-label={`Edit ${t.fullName}`}
                            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveTeacher(t.id)}
                            aria-label={`Remove ${t.fullName}`}
                            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: House Students (Separate Section) */}
      {showStudentsSection && (
        <section
          aria-label={
            activeHouseMeta
              ? `${activeHouseMeta.name} Students`
              : 'Student House Assignments'
          }
          className="rounded-lg border border-zinc-800 bg-[#0F172A]/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {activeHouseMeta ? (
                <GraduationCap
                  className="h-4 w-4 text-zinc-300"
                  aria-hidden="true"
                />
              ) : (
                <Users className="h-4 w-4 text-zinc-300" aria-hidden="true" />
              )}
              <div>
                <h3 className="text-base font-semibold text-white">
                  {activeHouseMeta
                    ? `${activeHouseMeta.name} Students (${displayedStudents.length})`
                    : `Student House Assignments & Transfers (${displayedStudents.length})`}
                </h3>
                <p className="text-xs text-zinc-400">
                  {activeHouseMeta
                    ? `Students assigned to ${activeHouseMeta.name}. Transfer individual athletes or bulk-reassign selected students.`
                    : 'Filter unassigned students for bulk assignment, click a House to separate its Teachers and Students, or transfer via dropdown.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedHouse('all');
                  setOnlyUnassignedStudents(false);
                  setSelectedStudentIds([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedHouse === 'all' && !onlyUnassignedStudents
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedHouse('all');
                  setOnlyUnassignedStudents(true);
                  setSelectedStudentIds([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedHouse === 'all' && onlyUnassignedStudents
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Unassigned
              </button>
              {HOUSE_ORDER.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectHouse(h)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedHouse === h
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {HOUSES[h].shortName}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Assign Bar */}
          {selectedStudentIds.length > 0 && (
            <div className="px-5 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-200 font-mono-tabular">
                {selectedStudentIds.length} student(s) selected
              </span>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="bulk-target-house"
                  className="text-xs text-zinc-400"
                >
                  Assign to:
                </label>
                <select
                  id="bulk-target-house"
                  value={bulkTargetHouse}
                  onChange={(e) => setBulkTargetHouse(e.target.value as HouseId)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
                >
                  {HOUSE_ORDER.map((h) => (
                    <option key={h} value={h}>
                      {HOUSES[h].name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  className="rounded-md bg-white text-zinc-950 px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
                >
                  Bulk Assign Selected
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0F172A] z-10">
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all visible students"
                      checked={
                        displayedStudents.length > 0 &&
                        displayedStudents.every((s) =>
                          selectedStudentIds.includes(s.id)
                        )
                      }
                      onChange={handleSelectAllFiltered}
                      className="rounded border-zinc-600 bg-zinc-950"
                    />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Age Category</th>
                  <th className="py-3 px-4">Sport &amp; Talent</th>
                  <th className="py-3 px-4">Current House</th>
                  <th className="py-3 px-4">Transfer House</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {displayedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-zinc-500"
                    >
                      No students found for this selection.
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-900/40">
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${s.fullName}`}
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={() => toggleStudentCheck(s.id)}
                          className="rounded border-zinc-600 bg-zinc-950"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-white">
                          {s.fullName}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono-tabular">
                          {s.admissionNo} · {s.gender} · {s.grade}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <DobVerificationBadge
                          status={s.dobStatus}
                          category={s.verifiedCategory}
                          reason={s.dobFlagReason}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-300">
                        {s.primarySport}
                        {s.talentedAthlete ? ' · Talented' : ''}
                      </td>
                      <td className="py-2.5 px-4">
                        <HouseTag house={s.house} />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          aria-label={`Assign house for ${s.fullName}`}
                          value={s.house ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            onAssignStudentsHouse(
                              [s.id],
                              val ? (val as HouseId) : null
                            );
                          }}
                          className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white"
                        >
                          <option value="">Unassigned</option>
                          {HOUSE_ORDER.map((h) => (
                            <option key={h} value={h}>
                              {HOUSES[h].name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
