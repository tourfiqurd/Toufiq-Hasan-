import test from 'node:test';
import assert from 'node:assert/strict';
import { toBanglaDigits, toEnglishDigits, formatNumeral, formatGpa } from './numerals';
import { DEFAULT_GRADING_SCALE, calculateThirtyThreePercent, resolveGrade } from './scale';
import { evaluateSinglePaper, evaluateCombinedSubject, evaluateStudentExam, rankExamResults } from './calculator';
import type { SubjectExamConfig, SubjectCombinationConfig, GradingScaleRule } from './types';

function makeSubject(overrides: Partial<SubjectExamConfig> = {}): SubjectExamConfig {
  return {
    subjectId: 'sub-1',
    subjectName: 'গণিত',
    subjectCode: '109',
    isFourth: false,
    hasCq: true,
    cqFull: 70,
    cqPass: 23,
    hasMcq: true,
    mcqFull: 30,
    mcqPass: 10,
    hasPractical: false,
    practicalFull: 0,
    practicalPass: 0,
    passRule: 'separate',
    totalFull: 100,
    totalPass: 33,
    ...overrides,
  };
}

test('01. toBanglaDigits converts ASCII numerals', () => {
  assert.equal(toBanglaDigits('GPA 5.00 - 2026'), 'GPA ৫.০০ - ২০২৬');
});

test('02. toEnglishDigits converts Bangla numerals', () => {
  assert.equal(toEnglishDigits('রোল ১২৩, নম্বর ৮৭.৫'), 'রোল 123, নম্বর 87.5');
});

test('03. formatNumeral formats decimals and handles null', () => {
  assert.equal(formatNumeral(5, 'bn', 2), '৫.০০');
  assert.equal(formatNumeral(5, 'en', 2), '5.00');
  assert.equal(formatNumeral(null, 'bn'), '—');
  assert.equal(formatGpa(4.75, 'bn'), '৪.৭৫');
});

test('04. calculateThirtyThreePercent follows standard BD rounding', () => {
  assert.equal(calculateThirtyThreePercent(100), 33);
  assert.equal(calculateThirtyThreePercent(70), 23);
  assert.equal(calculateThirtyThreePercent(30), 10);
  assert.equal(calculateThirtyThreePercent(50), 17);
  assert.equal(calculateThirtyThreePercent(25), 8);
  assert.equal(calculateThirtyThreePercent(0), 0);
});

test('05. resolveGrade maps all default boundary marks accurately', () => {
  assert.deepEqual(resolveGrade(100), { letter: 'A+', point: 5.0 });
  assert.deepEqual(resolveGrade(80), { letter: 'A+', point: 5.0 });
  assert.deepEqual(resolveGrade(79), { letter: 'A', point: 4.0 });
  assert.deepEqual(resolveGrade(70), { letter: 'A', point: 4.0 });
  assert.deepEqual(resolveGrade(69), { letter: 'A-', point: 3.5 });
  assert.deepEqual(resolveGrade(60), { letter: 'A-', point: 3.5 });
  assert.deepEqual(resolveGrade(59), { letter: 'B', point: 3.0 });
  assert.deepEqual(resolveGrade(50), { letter: 'B', point: 3.0 });
  assert.deepEqual(resolveGrade(49), { letter: 'C', point: 2.0 });
  assert.deepEqual(resolveGrade(40), { letter: 'C', point: 2.0 });
  assert.deepEqual(resolveGrade(39), { letter: 'D', point: 1.0 });
  assert.deepEqual(resolveGrade(33), { letter: 'D', point: 1.0 });
  assert.deepEqual(resolveGrade(32), { letter: 'F', point: 0.0 });
  assert.deepEqual(resolveGrade(0), { letter: 'F', point: 0.0 });
});

test('06. resolveGrade supports custom institution scale', () => {
  const strictScale: GradingScaleRule[] = [
    { letter: 'A+', minMark: 85, maxMark: 100, point: 5.0 },
    { letter: 'A', minMark: 70, maxMark: 84, point: 4.0 },
    { letter: 'F', minMark: 0, maxMark: 69, point: 0.0 },
  ];
  assert.equal(resolveGrade(82, strictScale).letter, 'A');
  assert.equal(resolveGrade(65, strictScale).letter, 'F');
});

test('07. separate pass rule fails when MCQ is below pass mark despite total >= 33', () => {
  const cfg = makeSubject();
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 35, mcq: 8, practical: 0 });
  assert.equal(res.totalObtained, 43);
  assert.equal(res.passed, false);
  assert.equal(res.letter, 'F');
  assert.equal(res.point, 0);
});

test('08. separate pass rule fails when CQ is below pass mark despite high MCQ', () => {
  const cfg = makeSubject();
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 20, mcq: 25, practical: 0 });
  assert.equal(res.totalObtained, 45);
  assert.equal(res.passed, false);
  assert.equal(res.letter, 'F');
});

test('09. total_only pass rule passes when combined total >= totalPass even if one part is low', () => {
  const cfg = makeSubject({ passRule: 'total_only', cqPass: 0, mcqPass: 0, totalPass: 33 });
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 30, mcq: 8, practical: 0 });
  assert.equal(res.totalObtained, 38);
  assert.equal(res.passed, true);
  assert.equal(res.letter, 'D');
  assert.equal(res.point, 1.0);
});

test('10. inactive practical component is ignored even if raw mark contains value', () => {
  const cfg = makeSubject({ hasPractical: false, practicalFull: 0 });
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 55, mcq: 25, practical: 20 });
  assert.equal(res.practical, 0);
  assert.equal(res.totalObtained, 80);
  assert.equal(res.letter, 'A+');
});

test('11. practical subject (50+25+25) evaluates all three components separately', () => {
  const cfg = makeSubject({
    subjectName: 'পদার্থবিজ্ঞান',
    cqFull: 50,
    cqPass: 17,
    mcqFull: 25,
    mcqPass: 8,
    hasPractical: true,
    practicalFull: 25,
    practicalPass: 8,
  });
  const failPr = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 45, mcq: 22, practical: 6 });
  assert.equal(failPr.passed, false);
  const passAll = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 42, mcq: 20, practical: 20 });
  assert.equal(passAll.passed, true);
  assert.equal(passAll.totalObtained, 82);
  assert.equal(passAll.letter, 'A+');
});

test('12. 50-mark subject normalizes to 100-scale for grading', () => {
  const cfg = makeSubject({
    subjectName: 'আইসিটি',
    cqFull: 25,
    cqPass: 8,
    mcqFull: 25,
    mcqPass: 8,
    totalFull: 50,
    totalPass: 17,
  });
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 20, mcq: 20, practical: 0 });
  assert.equal(res.totalObtained, 40);
  assert.equal(res.normalizedOutOf100, 80);
  assert.equal(res.letter, 'A+');
  assert.equal(res.point, 5.0);
});

test('13. MCQ-only 100-mark subject evaluates properly', () => {
  const cfg = makeSubject({
    hasCq: false,
    cqFull: 0,
    cqPass: 0,
    hasMcq: true,
    mcqFull: 100,
    mcqPass: 33,
    totalFull: 100,
    totalPass: 33,
  });
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 99, mcq: 72, practical: 0 });
  assert.equal(res.cq, 0);
  assert.equal(res.totalObtained, 72);
  assert.equal(res.letter, 'A');
});

test('14. Written-only 100-mark subject evaluates properly', () => {
  const cfg = makeSubject({
    hasCq: true,
    cqFull: 100,
    cqPass: 33,
    hasMcq: false,
    mcqFull: 0,
    mcqPass: 0,
    totalFull: 100,
    totalPass: 33,
  });
  const res = evaluateSinglePaper(cfg, { subjectId: 'sub-1', cq: 64, mcq: 0, practical: 0 });
  assert.equal(res.letter, 'A-');
  assert.equal(res.point, 3.5);
});

test('15. Combined subject (sum mode, combined_total pass) computes 200-scale total & grade', () => {
  const b1 = makeSubject({ subjectId: 'b1', subjectName: 'বাংলা ১ম', subjectCode: '101' });
  const b2 = makeSubject({ subjectId: 'b2', subjectName: 'বাংলা ২য়', subjectCode: '102', hasMcq: false, cqFull: 100, cqPass: 33, mcqFull: 0, mcqPass: 0 });
  const combo: SubjectCombinationConfig = {
    id: 'c-bn',
    name: 'বাংলা (১ম + ২য় পত্র)',
    paperSubjectIds: ['b1', 'b2'],
    mode: 'sum',
    passRule: 'combined_total',
    isFourth: false,
  };
  const map = new Map([
    ['b1', { subjectId: 'b1', cq: 55, mcq: 25, practical: 0 }],
    ['b2', { subjectId: 'b2', cq: 80, mcq: 0, practical: 0 }],
  ]);
  const res = evaluateCombinedSubject(combo, [b1, b2], map);
  assert.equal(res.totalObtained, 160);
  assert.equal(res.totalFull, 200);
  assert.equal(res.normalizedOutOf100, 80);
  assert.equal(res.letter, 'A+');
  assert.equal(res.passed, true);
});

test('16. Combined subject (sum mode, combined_total) allows compensating weak 1st paper with strong 2nd paper', () => {
  const b1 = makeSubject({ subjectId: 'b1', subjectName: 'বাংলা ১ম', subjectCode: '101' });
  const b2 = makeSubject({ subjectId: 'b2', subjectName: 'বাংলা ২য়', subjectCode: '102', hasMcq: false, cqFull: 100, cqPass: 33, mcqFull: 0, mcqPass: 0 });
  const combo: SubjectCombinationConfig = {
    id: 'c-bn',
    name: 'বাংলা',
    paperSubjectIds: ['b1', 'b2'],
    mode: 'sum',
    passRule: 'combined_total',
    isFourth: false,
  };
  const map = new Map([
    ['b1', { subjectId: 'b1', cq: 18, mcq: 10, practical: 0 }], // 28 < 33 individually
    ['b2', { subjectId: 'b2', cq: 60, mcq: 0, practical: 0 }], // combined 88 >= 66
  ]);
  const res = evaluateCombinedSubject(combo, [b1, b2], map);
  assert.equal(res.passed, true);
  assert.equal(res.letter, 'C');
});

test('17. Combined subject (each_paper pass rule) fails if one paper fails', () => {
  const b1 = makeSubject({ subjectId: 'b1', subjectName: 'বাংলা ১ম', subjectCode: '101' });
  const b2 = makeSubject({ subjectId: 'b2', subjectName: 'বাংলা ২য়', subjectCode: '102' });
  const combo: SubjectCombinationConfig = {
    id: 'c-bn',
    name: 'বাংলা',
    paperSubjectIds: ['b1', 'b2'],
    mode: 'sum',
    passRule: 'each_paper',
    isFourth: false,
  };
  const map = new Map([
    ['b1', { subjectId: 'b1', cq: 20, mcq: 10, practical: 0 }], // fail CQ (20 < 23)
    ['b2', { subjectId: 'b2', cq: 60, mcq: 25, practical: 0 }],
  ]);
  const res = evaluateCombinedSubject(combo, [b1, b2], map);
  assert.equal(res.passed, false);
  assert.equal(res.letter, 'F');
});

test('18. Combined subject (combined_components pass rule) sums CQ & MCQ across papers before threshold', () => {
  const p1 = makeSubject({ subjectId: 'p1', cqFull: 70, cqPass: 23, mcqFull: 30, mcqPass: 10 });
  const p2 = makeSubject({ subjectId: 'p2', cqFull: 70, cqPass: 23, mcqFull: 30, mcqPass: 10 });
  const combo: SubjectCombinationConfig = {
    id: 'c-1',
    name: 'সম্মিলিত',
    paperSubjectIds: ['p1', 'p2'],
    mode: 'sum',
    passRule: 'combined_components',
    isFourth: false,
  };
  // CQ total = 20 + 30 = 50 >= 46; MCQ total = 8 + 14 = 22 >= 20 -> Pass!
  const passMap = new Map([
    ['p1', { subjectId: 'p1', cq: 20, mcq: 8, practical: 0 }],
    ['p2', { subjectId: 'p2', cq: 30, mcq: 14, practical: 0 }],
  ]);
  assert.equal(evaluateCombinedSubject(combo, [p1, p2], passMap).passed, true);

  // CQ total = 20 + 22 = 42 < 46 -> Fail!
  const failMap = new Map([
    ['p1', { subjectId: 'p1', cq: 20, mcq: 15, practical: 0 }],
    ['p2', { subjectId: 'p2', cq: 22, mcq: 15, practical: 0 }],
  ]);
  assert.equal(evaluateCombinedSubject(combo, [p1, p2], failMap).passed, false);
});

test('19. Combined subject (average mode) computes average score correctly', () => {
  const e1 = makeSubject({ subjectId: 'e1', subjectName: 'ইংরেজি ১ম', hasMcq: false, cqFull: 100, cqPass: 33, mcqFull: 0, mcqPass: 0 });
  const e2 = makeSubject({ subjectId: 'e2', subjectName: 'ইংরেজি ২য়', hasMcq: false, cqFull: 100, cqPass: 33, mcqFull: 0, mcqPass: 0 });
  const combo: SubjectCombinationConfig = {
    id: 'c-en',
    name: 'ইংরেজি',
    paperSubjectIds: ['e1', 'e2'],
    mode: 'average',
    passRule: 'combined_total',
    isFourth: false,
  };
  const map = new Map([
    ['e1', { subjectId: 'e1', cq: 74, mcq: 0, practical: 0 }],
    ['e2', { subjectId: 'e2', cq: 86, mcq: 0, practical: 0 }],
  ]);
  const res = evaluateCombinedSubject(combo, [e1, e2], map);
  assert.equal(res.totalObtained, 80);
  assert.equal(res.totalFull, 100);
  assert.equal(res.letter, 'A+');
});

test('20. Fourth subject adds bonus = point - 2.00 when passed', () => {
  const c1 = makeSubject({ subjectId: 's1', subjectName: 'বাংলা' });
  const c2 = makeSubject({ subjectId: 's2', subjectName: 'ইংরেজি' });
  const c3 = makeSubject({ subjectId: 's3', subjectName: 'গণিত' });
  const f1 = makeSubject({ subjectId: 's4', subjectName: 'উচ্চতর গণিত', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, c3, f1],
    marks: [
      { subjectId: 's1', cq: 50, mcq: 22, practical: 0 }, // 72 -> 4.00
      { subjectId: 's2', cq: 50, mcq: 20, practical: 0 }, // 70 -> 4.00
      { subjectId: 's3', cq: 50, mcq: 20, practical: 0 }, // 70 -> 4.00
      { subjectId: 's4', cq: 60, mcq: 25, practical: 0 }, // 85 -> 5.00 -> bonus 3.00
    ],
  });
  assert.equal(res.fourthBonus, 3.0);
  assert.equal(res.gpa, 5.0);
  assert.equal(res.overallGrade, 'A+');
});

test('21. Fourth subject gives 0 bonus when grade point <= 2.00 (C or D)', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const c2 = makeSubject({ subjectId: 's2' });
  const f1 = makeSubject({ subjectId: 's4', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 50, mcq: 20, practical: 0 }, // 4.0
      { subjectId: 's2', cq: 50, mcq: 20, practical: 0 }, // 4.0
      { subjectId: 's4', cq: 30, mcq: 12, practical: 0 }, // 42 -> C -> 2.0 -> bonus 0
    ],
  });
  assert.equal(res.fourthBonus, 0);
  assert.equal(res.gpa, 4.0);
});

test('22. Fourth subject bonus respects custom maxBonus cap', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const c2 = makeSubject({ subjectId: 's2' });
  const f1 = makeSubject({ subjectId: 's4', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 45, mcq: 15, practical: 0 }, // 60 -> 3.5
      { subjectId: 's2', cq: 45, mcq: 15, practical: 0 }, // 60 -> 3.5
      { subjectId: 's4', cq: 60, mcq: 25, practical: 0 }, // 85 -> 5.0 -> raw bonus 3.0, capped at 2.0
    ],
    fourthConfig: { basePassPoint: 2.0, maxBonus: 2.0, failZerosBonusOnly: true },
  });
  assert.equal(res.fourthBonus, 2.0);
  assert.equal(res.gpa, 4.5);
});

test('23. Overall GPA is capped at 5.00 even with fourth subject bonus', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const c2 = makeSubject({ subjectId: 's2' });
  const f1 = makeSubject({ subjectId: 's4', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 60, mcq: 25, practical: 0 }, // 5.0
      { subjectId: 's2', cq: 60, mcq: 25, practical: 0 }, // 5.0
      { subjectId: 's4', cq: 60, mcq: 25, practical: 0 }, // 5.0 (+3 bonus)
    ],
  });
  assert.equal(res.gpa, 5.0);
  assert.equal(res.overallGrade, 'A+');
});

test('24. Fourth subject fail sets bonus to 0 and keeps student passed when failZerosBonusOnly=true', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const c2 = makeSubject({ subjectId: 's2' });
  const f1 = makeSubject({ subjectId: 's4', subjectName: 'কৃষিশিক্ষা', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 50, mcq: 20, practical: 0 }, // 4.0
      { subjectId: 's2', cq: 50, mcq: 20, practical: 0 }, // 4.0
      { subjectId: 's4', cq: 10, mcq: 5, practical: 0 }, // F
    ],
    fourthConfig: { basePassPoint: 2.0, maxBonus: 3.0, failZerosBonusOnly: true },
  });
  assert.equal(res.passed, true);
  assert.equal(res.fourthBonus, 0);
  assert.equal(res.gpa, 4.0);
});

test('25. Fourth subject fail fails the entire exam when failZerosBonusOnly=false', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const c2 = makeSubject({ subjectId: 's2' });
  const f1 = makeSubject({ subjectId: 's4', subjectName: 'কৃষিশিক্ষা', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 60, mcq: 25, practical: 0 }, // 5.0
      { subjectId: 's2', cq: 60, mcq: 25, practical: 0 }, // 5.0
      { subjectId: 's4', cq: 10, mcq: 5, practical: 0 }, // F
    ],
    fourthConfig: { basePassPoint: 2.0, maxBonus: 3.0, failZerosBonusOnly: false },
  });
  assert.equal(res.passed, false);
  assert.equal(res.gpa, 0);
  assert.equal(res.overallGrade, 'F');
  assert.deepEqual(res.failedSubjects, ['কৃষিশিক্ষা']);
});

test('26. Any compulsory subject F causes overall exam fail and GPA 0.00', () => {
  const c1 = makeSubject({ subjectId: 's1', subjectName: 'বাংলা' });
  const c2 = makeSubject({ subjectId: 's2', subjectName: 'গণিত' });
  const f1 = makeSubject({ subjectId: 's4', subjectName: 'উচ্চতর গণিত', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, c2, f1],
    marks: [
      { subjectId: 's1', cq: 65, mcq: 25, practical: 0 }, // 90 -> A+
      { subjectId: 's2', cq: 20, mcq: 25, practical: 0 }, // CQ fail (20 < 23) -> F
      { subjectId: 's4', cq: 65, mcq: 25, practical: 0 }, // 90 -> A+ (+3.00)
    ],
  });
  assert.equal(res.passed, false);
  assert.equal(res.gpa, 0);
  assert.equal(res.overallGrade, 'F');
  assert.deepEqual(res.failedSubjects, ['গণিত']);
});

test('27. Student-specific fourthSubjectId overrides default subject isFourth flag', () => {
  const s1 = makeSubject({ subjectId: 's1', subjectName: 'উচ্চতর গণিত', isFourth: false });
  const s2 = makeSubject({ subjectId: 's2', subjectName: 'জীববিজ্ঞান', isFourth: false });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [s1, s2],
    studentFourthSubjectId: 's2',
    marks: [
      { subjectId: 's1', cq: 50, mcq: 20, practical: 0 }, // compulsory 4.00
      { subjectId: 's2', cq: 60, mcq: 25, practical: 0 }, // 4th 5.00 -> bonus 3.00
    ],
  });
  assert.equal(res.compulsoryCount, 1);
  assert.equal(res.fourthBonus, 3.0);
  assert.equal(res.gpa, 5.0);
});

test('28. Missing mark entry treats scores as 0 and fails subject', () => {
  const s1 = makeSubject({ subjectId: 's1', subjectName: 'গণিত' });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [s1],
    marks: [],
  });
  assert.equal(res.passed, false);
  assert.equal(res.totalObtained, 0);
});

test('29. Combined subject integrates cleanly inside evaluateStudentExam', () => {
  const b1 = makeSubject({ subjectId: 'b1', subjectName: 'বাংলা ১ম', subjectCode: '101' });
  const b2 = makeSubject({ subjectId: 'b2', subjectName: 'বাংলা ২য়', subjectCode: '102', hasMcq: false, cqFull: 100, cqPass: 33, mcqFull: 0, mcqPass: 0 });
  const m = makeSubject({ subjectId: 'm', subjectName: 'গণিত', subjectCode: '109' });
  const combo: SubjectCombinationConfig = {
    id: 'c-bn',
    name: 'বাংলা (১ম + ২য়)',
    paperSubjectIds: ['b1', 'b2'],
    mode: 'sum',
    passRule: 'combined_total',
    isFourth: false,
  };
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [b1, b2, m],
    combinations: [combo],
    marks: [
      { subjectId: 'b1', cq: 55, mcq: 25, practical: 0 }, // 80
      { subjectId: 'b2', cq: 80, mcq: 0, practical: 0 }, // 80 -> combined 160/200 -> 5.0
      { subjectId: 'm', cq: 50, mcq: 20, practical: 0 }, // 70 -> 4.0
    ],
  });
  assert.equal(res.subjects.length, 2);
  assert.equal(res.compulsoryCount, 2);
  assert.equal(res.gpa, 4.5);
  assert.equal(res.overallGrade, 'A');
});

test('30. rankExamResults ranks passed students before failed, then GPA desc, then totalObtained desc', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const sA = evaluateStudentExam({
    studentId: 'A',
    subjectConfigs: [c1],
    marks: [{ subjectId: 's1', cq: 60, mcq: 20, practical: 0 }], // 80 -> 5.0
  });
  const sB = evaluateStudentExam({
    studentId: 'B',
    subjectConfigs: [c1],
    marks: [{ subjectId: 's1', cq: 65, mcq: 25, practical: 0 }], // 90 -> 5.0
  });
  const sC = evaluateStudentExam({
    studentId: 'C',
    subjectConfigs: [c1],
    marks: [{ subjectId: 's1', cq: 15, mcq: 5, practical: 0 }], // Fail
  });
  const ranks = rankExamResults([sA, sC, sB]);
  assert.equal(ranks.get('B'), 1);
  assert.equal(ranks.get('A'), 2);
  assert.equal(ranks.get('C'), 3);
});

test('31. Fractional GPA rounds to 2 decimal places accurately', () => {
  const s1 = makeSubject({ subjectId: 's1' });
  const s2 = makeSubject({ subjectId: 's2' });
  const s3 = makeSubject({ subjectId: 's3' });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [s1, s2, s3],
    marks: [
      { subjectId: 's1', cq: 60, mcq: 20, practical: 0 }, // 5.0
      { subjectId: 's2', cq: 50, mcq: 20, practical: 0 }, // 4.0
      { subjectId: 's3', cq: 50, mcq: 20, practical: 0 }, // 4.0 -> 13/3 = 4.33
    ],
  });
  assert.equal(res.gpa, 4.33);
  assert.equal(res.overallGrade, 'A');
});

test('32. Fourth subject custom basePassPoint works (e.g., 1.00 instead of 2.00)', () => {
  const c1 = makeSubject({ subjectId: 's1' });
  const f1 = makeSubject({ subjectId: 's4', isFourth: true });
  const res = evaluateStudentExam({
    studentId: 'st-1',
    subjectConfigs: [c1, f1],
    marks: [
      { subjectId: 's1', cq: 45, mcq: 15, practical: 0 }, // 3.5
      { subjectId: 's4', cq: 30, mcq: 12, practical: 0 }, // 42 -> 2.0
    ],
    fourthConfig: { basePassPoint: 1.0, maxBonus: 3.0, failZerosBonusOnly: true },
  });
  assert.equal(res.fourthBonus, 1.0);
  assert.equal(res.gpa, 4.5);
});
