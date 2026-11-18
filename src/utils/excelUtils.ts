import * as XLSX from 'xlsx';
import { AgeCategory, Gender, HouseId, Student } from '../types/sports';
import { verifyStudentDob } from './sportsLogic';

export interface ParsedExcelResult {
  students: Student[];
  errors: string[];
  skippedRows: number;
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseExcelDob(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number' && raw > 1000 && raw < 100000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = String(parsed.y).padStart(4, '0');
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Support YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replace(/\//g, '-');
  return str;
}

function parseHouse(raw: unknown): HouseId | null {
  if (!raw) return null;
  const val = String(raw).trim().toLowerCase();
  if (val.includes('mars')) return 'mars';
  if (val.includes('jupiter')) return 'jupiter';
  if (val.includes('venus')) return 'venus';
  if (val.includes('uranus')) return 'uranus';
  return null;
}

function parseGender(raw: unknown): Gender {
  const val = String(raw ?? '').trim().toLowerCase();
  if (val === 'f' || val === 'female' || val === 'girl' || val === 'girls') {
    return 'Female';
  }
  return 'Male';
}

function parseBoolean(raw: unknown): boolean {
  const val = String(raw ?? '').trim().toLowerCase();
  return val === 'yes' || val === 'true' || val === '1' || val === 'y';
}

export async function parseStudentsExcelFile(
  file: File,
  cutoffDate: string,
  ageCategories: AgeCategory[]
): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { students: [], errors: ['Workbook contains no sheets.'], skippedRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    return { students: [], errors: ['Uploaded sheet has no data rows.'], skippedRows: 0 };
  }

  const students: Student[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  rawRows.forEach((row, idx) => {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeHeader(k)] = v;
    }

    const admissionNo = String(
      normalized['admissionno'] ?? normalized['admno'] ?? normalized['id'] ?? ''
    ).trim();
    const fullName = String(
      normalized['fullname'] ?? normalized['name'] ?? normalized['studentname'] ?? ''
    ).trim();
    const dob = parseExcelDob(
      normalized['dob'] ?? normalized['dateofbirth'] ?? normalized['birthdate']
    );

    if (!admissionNo || !fullName) {
      skippedRows += 1;
      errors.push(`Row ${idx + 2}: Missing Admission_No or Full_Name.`);
      return;
    }

    const gender = parseGender(normalized['gender'] ?? normalized['sex']);
    const grade = String(normalized['grade'] ?? normalized['class'] ?? 'Grade 9').trim();
    const house = parseHouse(normalized['house'] ?? normalized['houseoptional']);
    const talentedAthlete = parseBoolean(
      normalized['talentedathlete'] ?? normalized['talented'] ?? normalized['sportactive']
    );
    const primarySport = String(
      normalized['primarysport'] ?? normalized['sport'] ?? 'Athletics'
    ).trim();

    const verification = verifyStudentDob(dob, cutoffDate, ageCategories);

    students.push({
      id: `stu-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      admissionNo,
      fullName,
      dob,
      gender,
      grade,
      house,
      talentedAthlete,
      primarySport: primarySport || 'Athletics',
      biometrics: {},
      computedAge: verification.computedAge,
      verifiedCategory: verification.verifiedCategory,
      dobStatus: verification.dobStatus,
      dobFlagReason: verification.dobFlagReason,
    });
  });

  return { students, errors, skippedRows };
}

export function downloadSampleExcelTemplate(): void {
  const sampleRows = [
    {
      Admission_No: 'SCC-2026-101',
      Full_Name: 'Kavindu Jayawardena',
      'DOB (YYYY-MM-DD)': '2011-04-12',
      Gender: 'Male',
      Grade: 'Grade 10',
      'House (Optional)': '',
      'Talented_Athlete (Yes/No)': 'Yes',
      Primary_Sport: '100m',
    },
    {
      Admission_No: 'SCC-2026-102',
      Full_Name: 'Nethmi Fernando',
      'DOB (YYYY-MM-DD)': '2011-08-23',
      Gender: 'Female',
      Grade: 'Grade 10',
      'House (Optional)': '',
      'Talented_Athlete (Yes/No)': 'Yes',
      Primary_Sport: 'Long Jump',
    },
    {
      Admission_No: 'SCC-2026-103',
      Full_Name: 'Dilan Perera',
      'DOB (YYYY-MM-DD)': '2013-02-18',
      Gender: 'Male',
      Grade: 'Grade 8',
      'House (Optional)': '',
      'Talented_Athlete (Yes/No)': 'Yes',
      Primary_Sport: '800m',
    },
    {
      Admission_No: 'SCC-2026-104',
      Full_Name: 'Sithumi Wijesinghe',
      'DOB (YYYY-MM-DD)': '2013-11-05',
      Gender: 'Female',
      Grade: 'Grade 8',
      'House (Optional)': 'Venus',
      'Talented_Athlete (Yes/No)': 'No',
      Primary_Sport: 'Netball',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Import');
  XLSX.writeFile(workbook, 'SCC_Sports_Meet_Student_Template.xlsx');
}
