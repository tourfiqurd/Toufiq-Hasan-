export type NumeralLocale = 'bn' | 'en';

export interface GradingScaleRule {
  letter: string;
  minMark: number;
  maxMark: number;
  point: number;
}

export interface FourthSubjectConfig {
  basePassPoint: number; // default 2.00
  maxBonus: number; // default 3.00
  failZerosBonusOnly: boolean; // true = bonus 0 on fail; false = fails whole exam
}

export type PassRuleType = 'separate' | 'total_only';
export type CombineMode = 'sum' | 'average';
export type CombinePassRule = 'combined_total' | 'combined_components' | 'each_paper';

export interface SubjectExamConfig {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isFourth: boolean;
  hasCq: boolean;
  cqFull: number;
  cqPass: number;
  hasMcq: boolean;
  mcqFull: number;
  mcqPass: number;
  hasPractical: boolean;
  practicalFull: number;
  practicalPass: number;
  passRule: PassRuleType;
  totalFull: number;
  totalPass: number;
}

export interface SubjectCombinationConfig {
  id: string;
  name: string;
  paperSubjectIds: string[];
  mode: CombineMode;
  passRule: CombinePassRule;
  isFourth: boolean;
}

export interface RawMarkEntry {
  subjectId: string;
  cq: number | null;
  mcq: number | null;
  practical: number | null;
}

export interface EvaluatedPaperResult {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  cq: number;
  mcq: number;
  practical: number;
  totalObtained: number;
  totalFull: number;
  passed: boolean;
  normalizedOutOf100: number;
  letter: string;
  point: number;
  isFourth: boolean;
}

export interface EvaluatedSubjectLine {
  key: string;
  name: string;
  code: string;
  isCombined: boolean;
  isFourth: boolean;
  papers: EvaluatedPaperResult[];
  totalObtained: number;
  totalFull: number;
  normalizedOutOf100: number;
  letter: string;
  point: number;
  passed: boolean;
}

export interface StudentExamEvaluation {
  studentId: string;
  subjects: EvaluatedSubjectLine[];
  compulsoryCount: number;
  compulsoryPointSum: number;
  fourthBonus: number;
  gpa: number;
  overallGrade: string;
  passed: boolean;
  totalObtained: number;
  totalFull: number;
  failedSubjects: string[];
}
