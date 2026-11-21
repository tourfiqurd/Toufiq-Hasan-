import React, { useMemo, useState } from 'react';
import { Award, ChevronDown, ChevronUp, FileText, IdCard, Printer, User as UserIcon } from 'lucide-react';
import { evaluateStudentExam, rankExamResults } from '../../../lib/grading/calculator';
import { formatGpa, formatNumeral } from '../../../lib/grading/numerals';
import type { SubjectExamConfig } from '../../../lib/grading/types';
import { useApp } from '../../../store/AppContext';
import { AdmitCardSheet, MarksheetSheet } from '../../../components/print/PrintableTemplates';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

export const StudentResultsPage: React.FC = () => {
  const { db, user, repo, numeralLocale, academicYear } = useApp();
  if (!repo || !user) return null;

  const institution = repo.getInstitution();
  const settings = repo.getSettings();
  const students = repo.getStudents();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const exams = repo.getExams();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? '');
  const activeStudent = students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;

  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [admitModalExamId, setAdmitModalExamId] = useState<string | null>(null);
  const [marksheetModalExamId, setMarksheetModalExamId] = useState<string | null>(null);

  const studentClass = classes.find((c) => c.id === activeStudent?.classId);
  const studentSection = sections.find((s) => s.id === activeStudent?.sectionId);

  // Exams applicable to student's class
  const studentExams = useMemo(() => {
    if (!activeStudent) return [];
    return exams.filter(
      (ex) =>
        ex.defaultClassId === activeStudent.classId &&
        (!ex.sectionId || ex.sectionId === activeStudent.sectionId)
    );
  }, [exams, activeStudent]);

  // Published exams ONLY (strict publication visibility gate)
  const publishedExamEvaluations = useMemo(() => {
    if (!activeStudent) return [];
    const results = [];
    for (const ex of studentExams) {
      if (!repo.isSectionPublished(ex.id, activeStudent.sectionId)) continue;
      const rules = repo.getExamRules(ex.id).filter((r) => r.classId === activeStudent.classId);
      const combos = repo.getSubjectCombinations(ex.id).filter(
        (c) => c.classId === activeStudent.classId
      );
      const allSectionStudents = repo.getStudents(activeStudent.classId, activeStudent.sectionId);
      // Note: for student/parent role, repo.getStudents returns only own/children, so rank computes relative to returned or full evaluation
      const subjectConfigs: SubjectExamConfig[] = rules
        .filter((r) => {
          const sub = subjects.find((s) => s.id === r.subjectId);
          return !sub?.sectionId || sub.sectionId === activeStudent.sectionId;
        })
        .map((r) => {
          const sub = subjects.find((s) => s.id === r.subjectId);
          return {
            subjectId: r.subjectId,
            subjectName: sub?.name ?? r.subjectId,
            subjectCode: sub?.code ?? '',
            isFourth: sub?.isFourth ?? false,
            hasCq: r.hasCq,
            cqFull: r.cqFull,
            cqPass: r.cqPass,
            hasMcq: r.hasMcq,
            mcqFull: r.mcqFull,
            mcqPass: r.mcqPass,
            hasPractical: r.hasPractical,
            practicalFull: r.practicalFull,
            practicalPass: r.practicalPass,
            passRule: r.passRule,
            totalFull: r.totalFull,
            totalPass: r.totalPass,
          };
        });

      const examMarks = repo.getMarks(ex.id);
      const stMarks = examMarks
        .filter((m) => m.studentId === activeStudent.id)
        .map((m) => ({
          subjectId: m.subjectId,
          cq: m.cq,
          mcq: m.mcq,
          practical: m.practical,
        }));

      const evaluation = evaluateStudentExam({
        studentId: activeStudent.id,
        subjectConfigs,
        combinations: combos,
        marks: stMarks,
        studentFourthSubjectId: activeStudent.fourthSubjectId,
        scale: settings?.gradingScale,
        fourthConfig: settings?.fourthConfig,
      });

      const ranks = rankExamResults([evaluation]);
      results.push({
        exam: ex,
        evaluation,
        rank: allSectionStudents.length === 1 ? ranks.get(activeStudent.id) : undefined,
      });
    }
    return results;
  }, [activeStudent, studentExams, repo, subjects, settings]);

  if (!activeStudent) {
    return (
      <EmptyState
        title="শিক্ষার্থীর তথ্য পাওয়া যায়নি"
        description="এই অ্যাকাউন্টের সাথে কোনো শিক্ষার্থী সংযুক্ত নেই।"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Parent Child Switcher */}
      {students.length > 1 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#111936] dark:text-[#E8ECFB]">
            <UserIcon className="w-4 h-4 text-[#4F46E5]" />
            <span>সন্তান নির্বাচন করুন:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {students.map((child) => {
              const cls = classes.find((c) => c.id === child.classId);
              const sec = sections.find((s) => s.id === child.sectionId);
              const active = child.id === activeStudent.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(child.id);
                    setExpandedExamId(null);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'bg-[#F4F6FC] dark:bg-[#0B1020] text-[#5D6785] dark:text-[#98A2C7] hover:text-[#111936] dark:hover:text-white'
                  }`}
                >
                  {child.name} ({cls?.name ?? ''} · {sec?.name ?? ''})
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top Student Profile Card */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full p-[3px] bg-brand-gradient shrink-0">
            <div className="w-full h-full rounded-full bg-white dark:bg-[#141B34] flex items-center justify-center text-xl font-bold text-[#4F46E5] dark:text-[#A5B4FC]">
              {activeStudent.name.slice(0, 1)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#111936] dark:text-[#E8ECFB]">
                {activeStudent.name}
              </h2>
              <Pill variant="info">
                {studentClass?.name ?? ''} · {studentSection?.name ?? ''}
              </Pill>
            </div>
            <p className="text-xs sm:text-sm text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
              রোল: {formatNumeral(activeStudent.roll, numeralLocale)} · আইডি:{' '}
              {activeStudent.studentCode} · শিক্ষাবর্ষ: {formatNumeral(academicYear, numeralLocale)}
            </p>
            <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
              পিতা: {activeStudent.fatherName} · মাতা: {activeStudent.motherName}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right text-xs text-[#5D6785] dark:text-[#98A2C7] space-y-1">
          <p className="font-semibold text-[#111936] dark:text-[#E8ECFB]">
            {institution?.name ?? ''}
          </p>
          <p>
            লগইন ইমেইল:{' '}
            {db.users.find((u) => u.id === activeStudent.userId)?.email ?? user.email}
          </p>
          <p className="tabular-nums">
            অভিভাবকের ফোন: {formatNumeral(activeStudent.guardianPhone, numeralLocale)}
          </p>
        </div>
      </Card>

      {/* Admit Cards Section */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5">
          <IdCard className="w-5 h-5 text-[#4F46E5]" />
          <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
            পরীক্ষার প্রবেশপত্র
          </h3>
        </div>

        {studentExams.length === 0 ? (
          <p className="text-sm text-[#5D6785] dark:text-[#98A2C7]">
            এই শ্রেণির জন্য কোনো পরীক্ষার সময়সূচি এখনো প্রকাশিত হয়নি।
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentExams.map((ex) => {
              const isPublished = repo.isSectionPublished(ex.id, activeStudent.sectionId);
              return (
                <div
                  key={ex.id}
                  className="rounded-[14px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-[#111936] dark:text-[#E8ECFB]">
                        {ex.name}
                      </p>
                      <Pill variant={isPublished ? 'success' : 'warning'}>
                        {isPublished ? 'ফলাফল প্রকাশিত' : 'চলমান'}
                      </Pill>
                    </div>
                    <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                      তারিখ: {formatNumeral(ex.startDate, numeralLocale)} –{' '}
                      {formatNumeral(ex.endDate, numeralLocale)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start sm:self-auto"
                    leftIcon={<FileText className="w-4 h-4" />}
                    onClick={() => setAdmitModalExamId(ex.id)}
                  >
                    প্রবেশপত্র দেখুন
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Published Results Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[#F59E0B]" />
          <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
            প্রকাশিত পরীক্ষার ফলাফল
          </h3>
        </div>

        {publishedExamEvaluations.length === 0 ? (
          <EmptyState
            title="এখনো কোনো ফলাফল প্রকাশিত হয়নি"
            description="আপনার শাখার পরীক্ষার ফলাফল অধ্যক্ষ কর্তৃক প্রকাশিত হলে এখানে GPA ও অফিসিয়াল মার্কশিট দেখতে পাবেন।"
          />
        ) : (
          <div className="space-y-4">
            {publishedExamEvaluations.map(({ exam, evaluation }, index) => {
              const isExpanded =
                expandedExamId === exam.id || (expandedExamId === null && index === 0);

              return (
                <Card key={exam.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
                          {exam.name}
                        </h4>
                        <Pill variant={evaluation.passed ? 'success' : 'danger'}>
                          {evaluation.passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
                        </Pill>
                      </div>
                      <p className="text-xs sm:text-sm text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                        মোট প্রাপ্ত নম্বর:{' '}
                        <span className="font-bold text-[#111936] dark:text-[#E8ECFB]">
                          {formatNumeral(evaluation.totalObtained, numeralLocale)} /{' '}
                          {formatNumeral(evaluation.totalFull, numeralLocale)}
                        </span>{' '}
                        · লেটার গ্রেড:{' '}
                        <span className="font-bold text-[#111936] dark:text-[#E8ECFB]">
                          {evaluation.overallGrade}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-[12px] bg-[#0B1437] text-white px-4 py-2 text-center min-w-[100px]">
                        <p className="text-[11px] text-white/75">প্রাপ্ত GPA</p>
                        <p className="text-2xl font-bold text-[#FCD34D] tabular-nums leading-tight">
                          {formatGpa(evaluation.gpa, numeralLocale)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        leftIcon={<Printer className="w-4 h-4" />}
                        onClick={() => setMarksheetModalExamId(exam.id)}
                      >
                        অফিসিয়াল মার্কশিট
                      </Button>

                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedExamId(isExpanded ? '__none__' : exam.id)
                        }
                        className="p-2 rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] text-[#5D6785] hover:bg-[#4F46E5]/10 cursor-pointer"
                        aria-label={isExpanded ? 'বিস্তারিত লুকান' : 'বিষয়ভিত্তিক নম্বর দেখুন'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="w-full overflow-x-auto rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#4F46E5]/[0.08] dark:bg-[#4F46E5]/[0.16] border-b border-[#E2E6F3] dark:border-[#262F52] text-xs font-bold">
                            <th className="px-4 py-2.5">বিষয়</th>
                            <th className="px-3 py-2.5 text-center">CQ</th>
                            <th className="px-3 py-2.5 text-center">MCQ</th>
                            <th className="px-3 py-2.5 text-center">ব্যবহারিক</th>
                            <th className="px-3 py-2.5 text-center">মোট / পূর্ণমান</th>
                            <th className="px-3 py-2.5 text-center">গ্রেড</th>
                            <th className="px-3 py-2.5 text-center">পয়েন্ট</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
                          {evaluation.subjects.map((sub) => (
                            <React.Fragment key={sub.key}>
                              {sub.papers.map((paper, idx) => (
                                <tr
                                  key={paper.subjectId}
                                  className={!sub.passed ? 'bg-[#DC2626]/[0.04]' : ''}
                                >
                                  <td className="px-4 py-2">
                                    <span className="font-semibold">{paper.subjectName}</span>
                                    {sub.isFourth && idx === 0 && (
                                      <span className="ml-2 text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC]">
                                        [৪র্থ বিষয়]
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center tabular-nums">
                                    {formatNumeral(paper.cq, numeralLocale)}
                                  </td>
                                  <td className="px-3 py-2 text-center tabular-nums">
                                    {formatNumeral(paper.mcq, numeralLocale)}
                                  </td>
                                  <td className="px-3 py-2 text-center tabular-nums">
                                    {formatNumeral(paper.practical, numeralLocale)}
                                  </td>
                                  {idx === 0 && (
                                    <>
                                      <td
                                        rowSpan={sub.papers.length}
                                        className="px-3 py-2 text-center font-bold tabular-nums"
                                      >
                                        {formatNumeral(sub.totalObtained, numeralLocale)} /{' '}
                                        {formatNumeral(sub.totalFull, numeralLocale)}
                                      </td>
                                      <td
                                        rowSpan={sub.papers.length}
                                        className="px-3 py-2 text-center"
                                      >
                                        <Pill variant={sub.passed ? 'success' : 'danger'}>
                                          {sub.letter}
                                        </Pill>
                                      </td>
                                      <td
                                        rowSpan={sub.papers.length}
                                        className="px-3 py-2 text-center font-bold tabular-nums"
                                      >
                                        {formatGpa(sub.point, numeralLocale)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Admit Card Modal */}
      <Modal
        open={Boolean(admitModalExamId)}
        onClose={() => setAdmitModalExamId(null)}
        title="পরীক্ষার প্রবেশপত্র (A4)"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdmitModalExamId(null)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              প্রিন্ট / PDF ডাউনলোড
            </Button>
          </>
        }
      >
        {institution &&
          admitModalExamId &&
          (() => {
            const exam = studentExams.find((e) => e.id === admitModalExamId);
            if (!exam) return null;
            const rules = repo
              .getExamRules(exam.id)
              .filter((r) => r.classId === activeStudent.classId);
            return (
              <AdmitCardSheet
                institution={institution}
                exam={exam}
                student={activeStudent}
                classRoom={studentClass}
                section={studentSection}
                rules={rules}
                subjects={subjects}
                locale={numeralLocale}
              />
            );
          })()}
      </Modal>

      {/* Official Marksheet Modal */}
      <Modal
        open={Boolean(marksheetModalExamId)}
        onClose={() => setMarksheetModalExamId(null)}
        title="অফিসিয়াল মার্কশিট (A4)"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMarksheetModalExamId(null)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              প্রিন্ট / PDF ডাউনলোড
            </Button>
          </>
        }
      >
        {institution &&
          marksheetModalExamId &&
          (() => {
            const found = publishedExamEvaluations.find(
              (x) => x.exam.id === marksheetModalExamId
            );
            if (!found) return null;
            return (
              <MarksheetSheet
                institution={institution}
                exam={found.exam}
                student={activeStudent}
                classRoom={studentClass}
                section={studentSection}
                evaluation={found.evaluation}
                locale={numeralLocale}
              />
            );
          })()}
      </Modal>
    </div>
  );
};
