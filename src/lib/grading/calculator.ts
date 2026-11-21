import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE, resolveGrade, resolveOverallGradeFromGpa } from './scale';
import type {
  EvaluatedPaperResult,
  EvaluatedSubjectLine,
  FourthSubjectConfig,
  GradingScaleRule,
  RawMarkEntry,
  StudentExamEvaluation,
  SubjectCombinationConfig,
  SubjectExamConfig,
} from './types';

function safeMark(value: number | null | undefined, active: boolean): number {
  if (!active || value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, value);
}

export function evaluateSinglePaper(
  config: SubjectExamConfig,
  raw: RawMarkEntry | undefined,
  scale: GradingScaleRule[] = DEFAULT_GRADING_SCALE
): EvaluatedPaperResult {
  const cq = safeMark(raw?.cq, config.hasCq);
  const mcq = safeMark(raw?.mcq, config.hasMcq);
  const practical = safeMark(raw?.practical, config.hasPractical);
  const totalObtained = cq + mcq + practical;

  const totalFull =
    (config.hasCq ? config.cqFull : 0) +
    (config.hasMcq ? config.mcqFull : 0) +
    (config.hasPractical ? config.practicalFull : 0);

  let passed = true;
  if (config.passRule === 'separate') {
    if (config.hasCq && cq < config.cqPass) passed = false;
    if (config.hasMcq && mcq < config.mcqPass) passed = false;
    if (config.hasPractical && practical < config.practicalPass) passed = false;
    if (totalObtained < config.totalPass) passed = false;
  } else {
    if (totalObtained < config.totalPass) passed = false;
  }

  const normalizedOutOf100 = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
  const grade = passed ? resolveGrade(normalizedOutOf100, scale) : { letter: 'F', point: 0 };

  return {
    subjectId: config.subjectId,
    subjectName: config.subjectName,
    subjectCode: config.subjectCode,
    cq,
    mcq,
    practical,
    totalObtained,
    totalFull,
    passed,
    normalizedOutOf100,
    letter: grade.letter,
    point: grade.point,
    isFourth: config.isFourth,
  };
}

export function evaluateCombinedSubject(
  combo: SubjectCombinationConfig,
  paperConfigs: SubjectExamConfig[],
  marksBySubjectId: Map<string, RawMarkEntry>,
  scale: GradingScaleRule[] = DEFAULT_GRADING_SCALE
): EvaluatedSubjectLine {
  const papers = paperConfigs.map((cfg) => evaluateSinglePaper(cfg, marksBySubjectId.get(cfg.subjectId), scale));

  const sumObtained = papers.reduce((acc, p) => acc + p.totalObtained, 0);
  const sumFull = papers.reduce((acc, p) => acc + p.totalFull, 0);

  let effectiveObtained = sumObtained;
  let effectiveFull = sumFull;
  let normalizedOutOf100 = 0;

  if (combo.mode === 'sum') {
    normalizedOutOf100 = sumFull > 0 ? (sumObtained / sumFull) * 100 : 0;
  } else {
    // Average mode: average the paper totals (and convert to 100-scale using average full marks)
    const count = papers.length || 1;
    effectiveObtained = Number((sumObtained / count).toFixed(2));
    effectiveFull = Number((sumFull / count).toFixed(2));
    normalizedOutOf100 = effectiveFull > 0 ? (effectiveObtained / effectiveFull) * 100 : 0;
  }

  // Evaluate combined pass rule
  let passed = true;
  if (combo.passRule === 'each_paper') {
    passed = papers.every((p) => p.passed);
  } else if (combo.passRule === 'combined_components') {
    const totalCq = papers.reduce((acc, p) => acc + p.cq, 0);
    const totalMcq = papers.reduce((acc, p) => acc + p.mcq, 0);
    const totalPr = papers.reduce((acc, p) => acc + p.practical, 0);

    const reqCq = paperConfigs.reduce((acc, c) => acc + (c.hasCq ? c.cqPass : 0), 0);
    const reqMcq = paperConfigs.reduce((acc, c) => acc + (c.hasMcq ? c.mcqPass : 0), 0);
    const reqPr = paperConfigs.reduce((acc, c) => acc + (c.hasPractical ? c.practicalPass : 0), 0);
    const reqTotal = paperConfigs.reduce((acc, c) => acc + c.totalPass, 0);

    if (paperConfigs.some((c) => c.hasCq) && totalCq < reqCq) passed = false;
    if (paperConfigs.some((c) => c.hasMcq) && totalMcq < reqMcq) passed = false;
    if (paperConfigs.some((c) => c.hasPractical) && totalPr < reqPr) passed = false;
    if (sumObtained < reqTotal) passed = false;
  } else {
    // combined_total
    const reqTotal = paperConfigs.reduce((acc, c) => acc + c.totalPass, 0);
    if (sumObtained < reqTotal) passed = false;
  }

  const grade = passed ? resolveGrade(normalizedOutOf100, scale) : { letter: 'F', point: 0 };

  return {
    key: `combo:${combo.id}`,
    name: combo.name,
    code: papers.map((p) => p.subjectCode).join('+'),
    isCombined: true,
    isFourth: combo.isFourth,
    papers,
    totalObtained: combo.mode === 'sum' ? sumObtained : effectiveObtained,
    totalFull: combo.mode === 'sum' ? sumFull : effectiveFull,
    normalizedOutOf100,
    letter: grade.letter,
    point: grade.point,
    passed,
  };
}

export function evaluateStudentExam(params: {
  studentId: string;
  subjectConfigs: SubjectExamConfig[];
  combinations?: SubjectCombinationConfig[];
  marks: RawMarkEntry[];
  studentFourthSubjectId?: string | null;
  scale?: GradingScaleRule[];
  fourthConfig?: FourthSubjectConfig;
}): StudentExamEvaluation {
  const {
    studentId,
    subjectConfigs,
    combinations = [],
    marks,
    studentFourthSubjectId,
    scale = DEFAULT_GRADING_SCALE,
    fourthConfig = DEFAULT_FOURTH_CONFIG,
  } = params;

  const marksMap = new Map<string, RawMarkEntry>();
  for (const m of marks) {
    marksMap.set(m.subjectId, m);
  }

  // Mark student-specific fourth subject override if assigned
  const effectiveConfigs = subjectConfigs.map((cfg) => ({
    ...cfg,
    isFourth: studentFourthSubjectId ? cfg.subjectId === studentFourthSubjectId : cfg.isFourth,
  }));

  const configMap = new Map<string, SubjectExamConfig>();
  for (const cfg of effectiveConfigs) {
    configMap.set(cfg.subjectId, cfg);
  }

  const combinedSubjectIds = new Set<string>();
  const subjectLines: EvaluatedSubjectLine[] = [];

  for (const combo of combinations) {
    const paperCfgs = combo.paperSubjectIds
      .map((id) => configMap.get(id))
      .filter((c): c is SubjectExamConfig => Boolean(c));

    if (paperCfgs.length === 0) continue;
    for (const c of paperCfgs) {
      combinedSubjectIds.add(c.subjectId);
    }
    const isFourth = combo.isFourth || paperCfgs.every((p) => p.isFourth);
    subjectLines.push(
      evaluateCombinedSubject({ ...combo, isFourth }, paperCfgs, marksMap, scale)
    );
  }

  for (const cfg of effectiveConfigs) {
    if (combinedSubjectIds.has(cfg.subjectId)) continue;
    const paper = evaluateSinglePaper(cfg, marksMap.get(cfg.subjectId), scale);
    subjectLines.push({
      key: `sub:${cfg.subjectId}`,
      name: cfg.subjectName,
      code: cfg.subjectCode,
      isCombined: false,
      isFourth: cfg.isFourth,
      papers: [paper],
      totalObtained: paper.totalObtained,
      totalFull: paper.totalFull,
      normalizedOutOf100: paper.normalizedOutOf100,
      letter: paper.letter,
      point: paper.point,
      passed: paper.passed,
    });
  }

  const compulsoryLines = subjectLines.filter((s) => !s.isFourth);
  const fourthLines = subjectLines.filter((s) => s.isFourth);

  const failedCompulsory = compulsoryLines.filter((s) => !s.passed);
  const failedFourth = fourthLines.filter((s) => !s.passed);

  let fourthBonus = 0;
  for (const fl of fourthLines) {
    if (fl.passed) {
      const rawBonus = Math.max(0, fl.point - fourthConfig.basePassPoint);
      fourthBonus += rawBonus;
    }
  }
  fourthBonus = Math.min(fourthConfig.maxBonus, Number(fourthBonus.toFixed(2)));

  let overallPassed = failedCompulsory.length === 0;
  if (!fourthConfig.failZerosBonusOnly && failedFourth.length > 0) {
    overallPassed = false;
  }

  const compulsoryPointSum = compulsoryLines.reduce((acc, s) => acc + s.point, 0);
  const compulsoryCount = compulsoryLines.length;

  let gpa = 0;
  if (overallPassed && compulsoryCount > 0) {
    const rawGpa = (compulsoryPointSum + fourthBonus) / compulsoryCount;
    gpa = Math.min(5.0, Number(rawGpa.toFixed(2)));
  }

  const totalObtained = subjectLines.reduce((acc, s) => acc + s.totalObtained, 0);
  const totalFull = subjectLines.reduce((acc, s) => acc + s.totalFull, 0);

  const failedSubjects = [
    ...failedCompulsory.map((s) => s.name),
    ...(!fourthConfig.failZerosBonusOnly ? failedFourth.map((s) => s.name) : []),
  ];

  return {
    studentId,
    subjects: subjectLines,
    compulsoryCount,
    compulsoryPointSum: Number(compulsoryPointSum.toFixed(2)),
    fourthBonus,
    gpa,
    overallGrade: resolveOverallGradeFromGpa(gpa, overallPassed),
    passed: overallPassed,
    totalObtained: Number(totalObtained.toFixed(2)),
    totalFull: Number(totalFull.toFixed(2)),
    failedSubjects,
  };
}

export function rankExamResults(evaluations: StudentExamEvaluation[]): Map<string, number> {
  const sorted = [...evaluations].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    return b.totalObtained - a.totalObtained;
  });
  const rankMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    rankMap.set(item.studentId, index + 1);
  });
  return rankMap;
}
