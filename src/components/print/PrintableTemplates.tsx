import React from 'react';
import { GraduationCap } from 'lucide-react';
import { formatGpa, formatNumeral } from '../../lib/grading/numerals';
import type { NumeralLocale, StudentExamEvaluation } from '../../lib/grading/types';
import type { ClassRoom, Exam, ExamRule, Institution, Section, Student, Subject } from '../../types/domain';

interface AdmitCardSheetProps {
  institution: Institution;
  exam: Exam;
  student: Student;
  classRoom?: ClassRoom;
  section?: Section;
  rules: ExamRule[];
  subjects: Subject[];
  locale: NumeralLocale;
  pageBreak?: boolean;
}

export const AdmitCardSheet: React.FC<AdmitCardSheetProps> = ({
  institution,
  exam,
  student,
  classRoom,
  section,
  rules,
  subjects,
  locale,
  pageBreak = false,
}) => {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <article
      className={`print-only-sheet bg-white text-[#111936] border border-[#E2E6F3] rounded-[16px] overflow-hidden shadow-sm ${
        pageBreak ? 'print-page-break mb-6' : ''
      }`}
    >
      {/* Navy Top Band */}
      <div className="bg-[#0B1437] text-white px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {institution.logoDataUrl ? (
            <img
              src={institution.logoDataUrl}
              alt={institution.name}
              className="w-12 h-12 rounded-[10px] object-cover bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-[12px] bg-brand-gradient flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold leading-snug">{institution.name}</h2>
            <p className="text-xs text-white/80">
              {institution.address} · EIIN: {formatNumeral(institution.eiin, locale)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block px-3.5 py-1 rounded-full bg-warm-gradient text-[#0B1437] text-xs font-bold">
            প্রবেশপত্র
          </span>
          <p className="text-xs text-white/80 mt-1">{exam.name}</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Student Details Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[12px] border border-[#E2E6F3] bg-[#F4F6FC]/60 p-4 text-sm">
          <div>
            <p className="text-xs text-[#5D6785]">শিক্ষার্থীর নাম</p>
            <p className="font-bold">{student.name}</p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">রোল নম্বর</p>
            <p className="font-bold tabular-nums">{formatNumeral(student.roll, locale)}</p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">শিক্ষার্থী আইডি</p>
            <p className="font-bold tabular-nums">{student.studentCode}</p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">শ্রেণি ও শাখা</p>
            <p className="font-bold">
              {classRoom?.name ?? ''} ({section?.name ?? ''})
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">পিতার নাম</p>
            <p className="font-semibold">{student.fatherName}</p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">মাতার নাম</p>
            <p className="font-semibold">{student.motherName}</p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">পরীক্ষার সময়কাল</p>
            <p className="font-semibold tabular-nums">
              {formatNumeral(exam.startDate, locale)} – {formatNumeral(exam.endDate, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5D6785]">শিক্ষাবর্ষ</p>
            <p className="font-bold tabular-nums">{formatNumeral(exam.academicYear, locale)}</p>
          </div>
        </div>

        {/* Subjects Table */}
        <table className="w-full text-sm border border-[#E2E6F3] border-collapse">
          <thead>
            <tr className="bg-[#4F46E5]/10 text-[#111936]">
              <th className="border border-[#E2E6F3] px-3 py-2 text-left">বিষয় কোড</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-left">বিষয়ের নাম</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">CQ</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">MCQ</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">ব্যবহারিক</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">পূর্ণমান</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const sub = subjectMap.get(r.subjectId);
              if (!sub) return null;
              return (
                <tr key={r.id}>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 tabular-nums">
                    {formatNumeral(sub.code, locale)}
                  </td>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 font-semibold">
                    {sub.name}
                    {sub.id === student.fourthSubjectId || sub.isFourth ? ' (৪র্থ বিষয়)' : ''}
                  </td>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                    {r.hasCq ? formatNumeral(r.cqFull, locale) : '—'}
                  </td>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                    {r.hasMcq ? formatNumeral(r.mcqFull, locale) : '—'}
                  </td>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                    {r.hasPractical ? formatNumeral(r.practicalFull, locale) : '—'}
                  </td>
                  <td className="border border-[#E2E6F3] px-3 py-1.5 text-center font-bold tabular-nums">
                    {formatNumeral(r.totalFull, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature Row */}
        <div className="pt-8 flex items-end justify-between text-xs text-[#5D6785]">
          <div className="text-center">
            <div className="w-40 border-t border-[#111936]/40 pt-1.5 font-semibold text-[#111936]">
              শ্রেণি শিক্ষকের স্বাক্ষর
            </div>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-[#111936]/40 pt-1.5 font-semibold text-[#111936]">
              অধ্যক্ষ / প্রধান শিক্ষকের স্বাক্ষর
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

interface MarksheetSheetProps {
  institution: Institution;
  exam: Exam;
  student: Student;
  classRoom?: ClassRoom;
  section?: Section;
  evaluation: StudentExamEvaluation;
  meritRank?: number;
  locale: NumeralLocale;
  pageBreak?: boolean;
}

export const MarksheetSheet: React.FC<MarksheetSheetProps> = ({
  institution,
  exam,
  student,
  classRoom,
  section,
  evaluation,
  meritRank,
  locale,
  pageBreak = false,
}) => {
  return (
    <article
      className={`print-only-sheet bg-white text-[#111936] border border-[#E2E6F3] rounded-[16px] overflow-hidden shadow-sm ${
        pageBreak ? 'print-page-break mb-6' : ''
      }`}
    >
      {/* Navy Top Band */}
      <div className="bg-[#0B1437] text-white px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {institution.logoDataUrl ? (
            <img
              src={institution.logoDataUrl}
              alt={institution.name}
              className="w-12 h-12 rounded-[10px] object-cover bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-[12px] bg-brand-gradient flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold leading-snug">{institution.name}</h2>
            <p className="text-xs text-white/80">
              {institution.address} · EIIN: {formatNumeral(institution.eiin, locale)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block px-3.5 py-1 rounded-full bg-warm-gradient text-[#0B1437] text-xs font-bold">
            একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট
          </span>
          <p className="text-xs text-white/80 mt-1">{exam.name}</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Student & Summary Header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-[12px] border border-[#E2E6F3] bg-[#F4F6FC]/60 p-4 text-sm">
            <div>
              <p className="text-xs text-[#5D6785]">শিক্ষার্থীর নাম</p>
              <p className="font-bold">{student.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D6785]">রোল ও আইডি</p>
              <p className="font-bold tabular-nums">
                {formatNumeral(student.roll, locale)} ({student.studentCode})
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5D6785]">শ্রেণি ও শাখা</p>
              <p className="font-bold">
                {classRoom?.name ?? ''} ({section?.name ?? ''})
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5D6785]">পিতার নাম</p>
              <p className="font-semibold">{student.fatherName}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D6785]">মাতার নাম</p>
              <p className="font-semibold">{student.motherName}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D6785]">মেধাক্রম</p>
              <p className="font-bold tabular-nums">
                {meritRank ? formatNumeral(meritRank, locale) : '—'}
              </p>
            </div>
          </div>

          {/* Warm Accent GPA Seal */}
          <div className="md:w-52 rounded-[14px] bg-[#0B1437] text-white p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-white/75">প্রাপ্ত GPA</span>
            <span className="text-3xl font-bold text-[#FCD34D] tabular-nums my-0.5">
              {formatGpa(evaluation.gpa, locale)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold">গ্রেড: {evaluation.overallGrade}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  evaluation.passed
                    ? 'bg-warm-gradient text-[#0B1437]'
                    : 'bg-[#DC2626] text-white'
                }`}
              >
                {evaluation.passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
              </span>
            </div>
          </div>
        </div>

        {/* Subject Breakdown Table */}
        <table className="w-full text-sm border border-[#E2E6F3] border-collapse">
          <thead>
            <tr className="bg-[#4F46E5]/10 text-[#111936]">
              <th className="border border-[#E2E6F3] px-3 py-2 text-left">বিষয়</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">CQ</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">MCQ</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">ব্যবহারিক</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">মোট / পূর্ণমান</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">লেটার গ্রেড</th>
              <th className="border border-[#E2E6F3] px-3 py-2 text-center">গ্রেড পয়েন্ট</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.subjects.map((sub) => (
              <React.Fragment key={sub.key}>
                {sub.papers.map((paper, idx) => (
                  <tr key={paper.subjectId} className={!sub.passed ? 'bg-[#DC2626]/[0.04]' : ''}>
                    <td className="border border-[#E2E6F3] px-3 py-1.5">
                      <span className="font-semibold">{paper.subjectName}</span>
                      <span className="text-xs text-[#5D6785] ml-1.5">
                        ({formatNumeral(paper.subjectCode, locale)})
                      </span>
                      {sub.isFourth && idx === 0 && (
                        <span className="ml-1.5 text-xs font-semibold text-[#4F46E5]">[৪র্থ বিষয়]</span>
                      )}
                    </td>
                    <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                      {formatNumeral(paper.cq, locale)}
                    </td>
                    <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                      {formatNumeral(paper.mcq, locale)}
                    </td>
                    <td className="border border-[#E2E6F3] px-3 py-1.5 text-center tabular-nums">
                      {formatNumeral(paper.practical, locale)}
                    </td>
                    {idx === 0 && (
                      <>
                        <td
                          rowSpan={sub.papers.length}
                          className="border border-[#E2E6F3] px-3 py-1.5 text-center font-bold tabular-nums"
                        >
                          {formatNumeral(sub.totalObtained, locale)} /{' '}
                          {formatNumeral(sub.totalFull, locale)}
                        </td>
                        <td
                          rowSpan={sub.papers.length}
                          className={`border border-[#E2E6F3] px-3 py-1.5 text-center font-bold ${
                            sub.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          {sub.letter}
                        </td>
                        <td
                          rowSpan={sub.papers.length}
                          className="border border-[#E2E6F3] px-3 py-1.5 text-center font-bold tabular-nums"
                        >
                          {formatGpa(sub.point, locale)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#E2E6F3] bg-[#F4F6FC]/60 px-4 py-3 text-sm">
          <div className="tabular-nums">
            মোট প্রাপ্ত নম্বর:{' '}
            <span className="font-bold">
              {formatNumeral(evaluation.totalObtained, locale)} /{' '}
              {formatNumeral(evaluation.totalFull, locale)}
            </span>
          </div>
          <div className="tabular-nums">
            ৪র্থ বিষয় বোনাস পয়েন্ট:{' '}
            <span className="font-bold text-[#4F46E5]">
              +{formatGpa(evaluation.fourthBonus, locale)}
            </span>
          </div>
          <div className="tabular-nums">
            তারিখ: <span className="font-semibold">{formatNumeral(new Date().toISOString().slice(0, 10), locale)}</span>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 flex items-end justify-between text-xs text-[#5D6785]">
          <div className="text-center">
            <div className="w-40 border-t border-[#111936]/40 pt-1.5 font-semibold text-[#111936]">
              শ্রেণি শিক্ষকের স্বাক্ষর
            </div>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-[#111936]/40 pt-1.5 font-semibold text-[#111936]">
              অধ্যক্ষের স্বাক্ষর ও সিল
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
