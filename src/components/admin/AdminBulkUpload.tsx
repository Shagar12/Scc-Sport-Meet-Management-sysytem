import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Shuffle,
  Upload,
} from 'lucide-react';
import {
  AgeCategory,
  HOUSE_ORDER,
  HOUSES,
  HouseId,
  Student,
} from '../../types/sports';
import {
  downloadSampleExcelTemplate,
  parseStudentsExcelFile,
} from '../../utils/excelUtils';
import { DobVerificationBadge, HouseTag } from '../HouseBadge';

interface AdminBulkUploadProps {
  cutoffDate: string;
  ageCategories: AgeCategory[];
  students: Student[];
  onImportStudents: (newStudents: Student[]) => void;
  onAutoDistribute: () => {
    distributedCount: number;
    breakdown: Record<HouseId, number>;
  };
}

export const AdminBulkUpload: React.FC<AdminBulkUploadProps> = ({
  cutoffDate,
  ageCategories,
  students,
  onImportStudents,
  onAutoDistribute,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Student[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const unassignedTalented = students.filter(
    (s) => s.house === null && s.talentedAthlete
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setStatusMessage(null);
    setParseErrors([]);
    try {
      const result = await parseStudentsExcelFile(file, cutoffDate, ageCategories);
      setParsedPreview(result.students);
      setParseErrors(result.errors);
    } catch {
      setParseErrors(['Failed to read spreadsheet. Ensure it is a valid .xlsx or .csv file.']);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onImportStudents(parsedPreview);
    setStatusMessage(
      `Imported ${parsedPreview.length} students and automatically verified their DOB age categories against ${cutoffDate}.`
    );
    setParsedPreview(null);
    setParseErrors([]);
  };

  const handleRunAutoDistribute = () => {
    const res = onAutoDistribute();
    if (res.distributedCount === 0) {
      setStatusMessage('No unassigned talented athletes found in the draft pool.');
      return;
    }
    setStatusMessage(
      `Balanced Auto-Draft complete: assigned ${res.distributedCount} talented athletes (Mars +${res.breakdown.mars}, Jupiter +${res.breakdown.jupiter}, Venus +${res.breakdown.venus}, Uranus +${res.breakdown.uranus}) balancing Age Category and Gender.`
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Bulk Excel Student Upload & Smart House Allocation
          </h2>
          <p className="text-sm text-zinc-400">
            Import student rosters via .xlsx or .csv with instant DOB verification, then auto-draft talented athletes evenly across all 4 houses.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadSampleExcelTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Sample Excel Template
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Excel Uploader */}
        <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-zinc-300" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              Excel / CSV Roster Import
            </h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Expected columns:{' '}
            <span className="font-mono-tabular text-zinc-300">
              Admission_No, Full_Name, DOB (YYYY-MM-DD), Gender, Grade, House (Optional), Talented_Athlete (Yes/No), Primary_Sport
            </span>
          </p>

          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/70 p-8 text-center space-y-4">
            <Upload className="h-8 w-8 text-zinc-400 mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Select an Excel (.xlsx) or CSV (.csv) student sheet
              </p>
              <p className="text-xs text-zinc-400">
                DOBs are automatically checked against cutoff date{' '}
                <span className="font-mono-tabular text-zinc-300">{cutoffDate}</span>
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                id="excel-file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-white text-zinc-950 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap"
              >
                {isParsing ? 'Parsing Sheet...' : 'Choose Spreadsheet File'}
              </button>
            </div>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-1">
              <p className="text-xs font-semibold text-amber-300">
                Import Warnings ({parseErrors.length})
              </p>
              <ul className="text-xs text-amber-200/90 list-disc pl-4 space-y-0.5">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: 1-Click Balanced Auto-Draft */}
        <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-[#0F172A]/60 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Shuffle className="h-5 w-5 text-zinc-300" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              1-Click Balanced Auto-Draft
            </h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Evenly distributes unassigned &ldquo;Talented / Sport Active&rdquo; students across Mars, Jupiter, Venus, and Uranus while balancing both <strong className="text-zinc-200">Age Category</strong> and <strong className="text-zinc-200">Gender</strong>.
          </p>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Unassigned Talented Pool</span>
              <span className="font-mono-tabular font-semibold text-white">
                {unassignedTalented.length} athletes
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {HOUSE_ORDER.map((h) => {
                const count = students.filter(
                  (s) => s.house === h && s.talentedAthlete
                ).length;
                return (
                  <div
                    key={h}
                    className="flex items-center justify-between rounded border border-zinc-800/80 px-2.5 py-1.5"
                  >
                    <span className="text-zinc-300">{HOUSES[h].shortName}</span>
                    <span className="font-mono-tabular text-zinc-200 font-semibold">
                      {count} talented
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunAutoDistribute}
            disabled={unassignedTalented.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Auto-Distribute Talented Athletes ({unassignedTalented.length})
          </button>

          {unassignedTalented.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-zinc-400">
                Waiting in Talented Draft Pool:
              </p>
              <div className="divide-y divide-zinc-800/70 border border-zinc-800 rounded-lg bg-zinc-950/60">
                {unassignedTalented.map((s) => (
                  <div
                    key={s.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-zinc-200 truncate">
                      {s.fullName}
                    </span>
                    <span className="text-zinc-400 whitespace-nowrap font-mono-tabular">
                      {s.verifiedCategory ?? 'Unverified'} · {s.gender} · {s.primarySport}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parsed Excel Preview Table */}
      {parsedPreview && parsedPreview.length > 0 && (
        <section className="rounded-lg border border-zinc-700 bg-[#0F172A]/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Parsed Spreadsheet Preview ({parsedPreview.length} students)
              </h3>
              <p className="text-xs text-zinc-400">
                Review automatic DOB verification and Grade before committing to master roster.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="rounded-lg border border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-lg bg-emerald-500 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-emerald-400 transition-colors"
              >
                Confirm Import ({parsedPreview.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400">
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">DOB & Age</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">House</th>
                  <th className="py-3 px-4">Talented</th>
                  <th className="py-3 px-4">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {parsedPreview.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs text-zinc-400">
                      {s.admissionNo}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-white">{s.fullName}</td>
                    <td className="py-2.5 px-4 text-xs font-mono-tabular text-zinc-300">
                      {s.dob} ({s.computedAge ?? '—'}y)
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-300">{s.gender}</td>
                    <td className="py-2.5 px-4 text-xs text-zinc-300">{s.grade}</td>
                    <td className="py-2.5 px-4">
                      <HouseTag house={s.house} />
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-300">
                      {s.talentedAthlete ? `Yes · ${s.primarySport}` : 'No'}
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
      )}
    </div>
  );
};
