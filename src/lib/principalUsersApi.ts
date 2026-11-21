import { ensureEmulatorAuthToken } from './applicationsApi';

export interface ServerTeacherInput {
  name: string;
  email: string;
  phone: string;
  password?: string;
  academicYear: number;
  institutionCode?: string;
  institutionName?: string;
  assignments: Array<{ classId: string; sectionId: string | null; subjectId: string }>;
}

export interface ServerStudentInput {
  name: string;
  roll: number;
  studentCode: string;
  classId: string;
  sectionId: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  address: string;
  fourthSubjectId: string | null;
  email: string;
  password?: string;
  academicYear: number;
  institutionCode?: string;
  institutionName?: string;
}

export interface ServerBulkStudentsInput {
  academicYear: number;
  institutionCode?: string;
  institutionName?: string;
  rows: Array<Omit<ServerStudentInput, 'academicYear' | 'institutionCode' | 'institutionName'>>;
}

export async function createTeacherViaServer(
  input: ServerTeacherInput
): Promise<{
  ok: boolean;
  uid?: string;
  institutionCode?: string;
  assignments?: Array<{ id: string; teacherUid: string; classId: string; sectionId: string | null; subjectId: string }>;
  offlineSkipped?: boolean;
  error?: string;
}> {
  const token = await ensureEmulatorAuthToken();
  if (!token) {
    return { ok: false, offlineSkipped: true };
  }
  const resp = await fetch('/api/principal/teachers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return resp.json();
}

export async function deleteTeacherViaServer(
  uid: string,
  academicYear: number
): Promise<{ ok: boolean; offlineSkipped?: boolean; error?: string }> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch(
    `/api/principal/teachers/${encodeURIComponent(uid)}?academicYear=${academicYear}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return resp.json();
}

export async function createStudentViaServer(
  input: ServerStudentInput
): Promise<{
  ok: boolean;
  uid?: string;
  studentId?: string;
  institutionCode?: string;
  offlineSkipped?: boolean;
  error?: string;
}> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch('/api/principal/students', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return resp.json();
}

export async function bulkImportStudentsViaServer(
  input: ServerBulkStudentsInput
): Promise<{
  ok: boolean;
  importedCount?: number;
  created?: Array<{ id: string; uid: string; email: string }>;
  skipped?: Array<{ email: string; reason: string }>;
  offlineSkipped?: boolean;
  error?: string;
}> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch('/api/principal/students/bulk', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return resp.json();
}

export async function deleteStudentViaServer(
  studentId: string,
  academicYear: number,
  institutionCode?: string
): Promise<{ ok: boolean; offlineSkipped?: boolean; error?: string }> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const qs = new URLSearchParams({ academicYear: String(academicYear) });
  if (institutionCode) qs.set('institutionCode', institutionCode);
  const resp = await fetch(`/api/principal/students/${encodeURIComponent(studentId)}?${qs.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

export async function createInstitutionViaServer(input: {
  name: string;
  type: 'school' | 'college' | 'madrasa';
  eiin: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  principalName: string;
  password: string;
}): Promise<{ ok: boolean; institutionCode?: string; uid?: string; offlineSkipped?: boolean; error?: string }> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch('/api/admin/institutions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return resp.json();
}

export async function resetUserPasswordViaServer(
  uid: string,
  newPassword: string
): Promise<{ ok: boolean; offlineSkipped?: boolean; error?: string }> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/reset-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newPassword }),
  });
  return resp.json();
}

export async function deleteUserViaServer(
  uid: string
): Promise<{ ok: boolean; offlineSkipped?: boolean; error?: string }> {
  const token = await ensureEmulatorAuthToken();
  if (!token) return { ok: false, offlineSkipped: true };
  const resp = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}
