import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSeedDatabase } from '../data/seed';
import {
  buildPublishedResultsUpdates,
  mapAppRoleToClaimRole,
  mapClaimRoleToAppRole,
  mapRtdbDataYearToPatch,
  mapRtdbInstitutionsToState,
  mapRtdbUsersToState,
  resolveInstitutionCode,
} from './rtdbSync';

test('role and institutionCode mapping handles all Academia roles and seed aliases', () => {
  assert.equal(mapAppRoleToClaimRole('institution_admin'), 'principal');
  assert.equal(mapAppRoleToClaimRole('teacher'), 'teacher');
  assert.equal(mapClaimRoleToAppRole('principal'), 'institution_admin');
  assert.equal(mapClaimRoleToAppRole('super_admin'), 'super_admin');
  assert.equal(mapClaimRoleToAppRole(undefined), 'student');

  const seedDb = createSeedDatabase();
  assert.equal(resolveInstitutionCode('inst-1', seedDb.institutions), 'ACD-00001');
  assert.equal(resolveInstitutionCode('inst-2', seedDb.institutions), 'ACD-00002');
  assert.equal(resolveInstitutionCode('ACD-00099', seedDb.institutions), 'ACD-00099');
  assert.equal(resolveInstitutionCode(null, seedDb.institutions), null);
});

test('mapRtdbInstitutionsToState and mapRtdbUsersToState preserve multi-tenant links', () => {
  const mappedInsts = mapRtdbInstitutionsToState(
    {
      'ACD-00010': {
        meta: {
          code: 'ACD-00010',
          name: 'শহীদ স্মৃতি উচ্চ বিদ্যালয়',
          type: 'school',
          eiin: '108999',
          address: 'মিরপুর',
          district: 'ঢাকা',
          phone: '01711112222',
          email: 'principal@smriti.edu.bd',
          status: 'approved',
          createdAt: '2026-03-01T10:00:00.000Z',
        },
        settings: { numeralLocale: 'bn' },
        academicYears: { '2026': { year: 2026, isCurrent: true } },
      },
    },
    []
  );

  assert.equal(mappedInsts.institutions.length, 1);
  assert.equal(mappedInsts.institutions[0].code, 'ACD-00010');
  assert.equal(mappedInsts.academicYears[0].year, 2026);
  assert.equal(mappedInsts.academicYears[0].isCurrent, true);

  const users = mapRtdbUsersToState(
    {
      'uid-pr-1': {
        uid: 'uid-pr-1',
        name: 'অধ্যক্ষ করিম',
        email: 'principal@smriti.edu.bd',
        role: 'principal',
        institutionCode: 'ACD-00010',
        isActive: true,
        createdAt: '2026-03-01T10:00:00.000Z',
      },
      'uid-sa': {
        uid: 'uid-sa',
        name: 'সুপার অ্যাডমিন',
        email: 'sa@academia.edu.bd',
        role: 'super_admin',
        institutionCode: null,
        isActive: true,
      },
    },
    mappedInsts.institutions
  );

  assert.equal(users.length, 2);
  assert.equal(users[0].role, 'institution_admin');
  assert.equal(users[0].institutionId, 'ACD-00010');
  assert.equal(users[1].role, 'super_admin');
  assert.equal(users[1].institutionId, null);
});

test('mapRtdbDataYearToPatch scopes every record strictly to institutionId and academicYear', () => {
  const patch = mapRtdbDataYearToPatch('inst-1', 2026, {
    classes: { 'cls-9': { id: 'cls-9', name: 'নবম শ্রেণি', code: '9', classTeacherUid: 'u-t1' } },
    sections: { 'sec-9a': { id: 'sec-9a', classId: 'cls-9', name: 'ক' } },
    subjects: { 'sub-bn': { id: 'sub-bn', classId: 'cls-9', name: 'বাংলা', code: '101', hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10, totalFull: 100, totalPass: 33 } },
    teacherAssignments: { 'ta-1': { id: 'ta-1', teacherUid: 'u-t1', classId: 'cls-9', sectionId: 'sec-9a', subjectId: 'sub-bn' } },
    students: { 'st-1': { id: 'st-1', uid: 'u-st-1', classId: 'cls-9', sectionId: 'sec-9a', roll: 1, studentCode: '26-01', name: 'তানভীর', gender: 'male' } },
    marks: { 'ex-1': { 'cls-9': { 'sec-9a': { 'sub-bn': { 'st-1': { cq: 60, mcq: 25, practical: null, status: 'approved', updatedByUid: 'u-t1' } } } } } },
    submissions: { 'asg-1': { 'u-st-1': { id: 'subm-1', studentId: 'st-1', studentUid: 'u-st-1', answerText: 'উত্তরপত্র', marks: 18 } } },
  });

  assert.equal(patch.institutionId, 'inst-1');
  assert.equal(patch.academicYear, 2026);
  assert.equal(patch.classes[0].classTeacherId, 'u-t1');
  assert.equal(patch.teacherAssignments[0].teacherId, 'u-t1');
  assert.equal(patch.students[0].userId, 'u-st-1');
  assert.equal(patch.marks[0].cq, 60);
  assert.equal(patch.marks[0].mcq, 25);
  assert.equal(patch.submissions[0].studentId, 'st-1');
  assert.equal(patch.submissions[0].marks, 18);
});

test('buildPublishedResultsUpdates builds section publication + student publishedResults on publish and nulls on unpublish', () => {
  const db = createSeedDatabase();
  const exam = db.exams.find((e) => e.institutionId === 'inst-1');
  assert.ok(exam, 'seed exam should exist');
  const sectionStudents = db.students.filter(
    (s) => s.institutionId === 'inst-1' && s.classId === exam.defaultClassId
  );
  assert.ok(sectionStudents.length > 0, 'seed students should exist');
  const targetSectionId = sectionStudents[0].sectionId;

  const publishUpdates = buildPublishedResultsUpdates({
    institutionCode: 'ACD-00001',
    institutionId: 'inst-1',
    academicYear: 2026,
    examId: exam.id,
    classId: exam.defaultClassId,
    sectionId: targetSectionId,
    published: true,
    publishedAt: '2026-06-30',
    db,
  });

  const pubFlag = publishUpdates[
    `data/ACD-00001/2026/resultPublications/${exam.id}/${targetSectionId}`
  ] as { published: boolean; publishedAt: string | null };
  assert.equal(pubFlag.published, true);
  assert.equal(pubFlag.publishedAt, '2026-06-30');

  const firstStudent = sectionStudents[0];
  const stRes = publishUpdates[
    `data/ACD-00001/2026/publishedResults/${firstStudent.userId}/${exam.id}`
  ] as { gpa: number; overallGrade: string; meritRank: number; subjects: unknown[] };
  assert.ok(stRes, 'published result should be written for section student');
  assert.equal(typeof stRes.gpa, 'number');
  assert.ok(stRes.meritRank >= 1);
  assert.ok(Array.isArray(stRes.subjects));

  const unpublishUpdates = buildPublishedResultsUpdates({
    institutionCode: 'ACD-00001',
    institutionId: 'inst-1',
    academicYear: 2026,
    examId: exam.id,
    classId: exam.defaultClassId,
    sectionId: targetSectionId,
    published: false,
    publishedAt: null,
    db,
  });

  assert.equal(
    unpublishUpdates[`data/ACD-00001/2026/publishedResults/${firstStudent.userId}/${exam.id}`],
    null
  );
});

test('database.rules.json enforces strict default deny, no client user/password writes, and role-scoped read/write rules', () => {
  const rulesPath = path.resolve(process.cwd(), 'database.rules.json');
  const raw = fs.readFileSync(rulesPath, 'utf8');
  const parsed = JSON.parse(raw) as { rules: Record<string, any> };
  const rules = parsed.rules;

  // Root and counters must be default-deny
  assert.equal(rules['.read'], false);
  assert.equal(rules['.write'], false);
  assert.equal(rules.counters['.read'], false);
  assert.equal(rules.counters['.write'], false);

  // Public application write must forbid password / passwordHash and require pending status
  const appWriteRule: string = rules.institutionApplications.$applicationId['.write'];
  assert.match(appWriteRule, /!newData\.hasChild\('password'\)/);
  assert.match(appWriteRule, /!newData\.hasChild\('passwordHash'\)/);
  assert.match(appWriteRule, /status'\)\.val\(\)\s*===\s*'pending'/);

  // Client writes to /users must be blocked completely (firebase-admin only)
  assert.equal(rules.users['.write'], false);
  assert.equal(rules.users.$uid['.write'], false);

  // Teacher mark writes must verify teacherSubjectAccess and prevent editing approved marks
  const markWriteRule: string =
    rules.data.$code.$year.marks.$examId.$classId.$sectionId.$subjectId.$studentId['.write'];
  assert.match(markWriteRule, /teacherSubjectAccess/);
  assert.match(markWriteRule, /status'\)\.val\(\)\s*!==\s*'approved'/);

  // Student & parent published results read must verify resultPublications/.../published === true
  const pubReadRule: string =
    rules.data.$code.$year.publishedResults.$studentUid.$examId['.read'];
  assert.match(pubReadRule, /resultPublications/);
  assert.match(pubReadRule, /published'\)\.val\(\)\s*===\s*true/);
  assert.match(pubReadRule, /parentLinks/);
});
