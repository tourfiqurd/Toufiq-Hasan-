import React, { useMemo, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Printer } from 'lucide-react';
import { exportToCsv, exportToExcel } from '../../../lib/exportUtils';
import { evaluateStudentExam, rankExamResults } from '../../../lib/grading/calculator';
import { formatGpa, formatNumeral } from '../../../lib/grading/numerals';
import type { SubjectExamConfig } from '../../../lib/grading/types';
import { useApp } from '../../../store/AppContext';
import { MarksheetSheet } from '../../../components/print/PrintableTemplates';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Select } from '../../../components/ui/FormControls';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

export const TabulationPage: React.FC = () => {
  const { repo, numeralLocale, showToast } = useApp();
  if (!repo) return null;

  const institution = repo.getInstitution();
  const settings = repo.getSettings();
  const exams = repo.getExams();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();

  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const activeExam = exams.find((e) => e.id === examId) ?? exams[0];
  const [classId, setClassId] = useState(activeExam?.defaultClassId ?? classes[0]?.id ?? '');
  const [sectionTab, setSectionTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [singleMarksheetStudentId, setSingleMarksheetStudentId] = useState<string | null>(null);
  const [bulkMarksheetOpen, setBulkMarksheetOpen] = useState(false);

  const classSections = sections.filter((s) => s.classId === classId);
  const students = repo.getStudents(
    classId,
    sectionTab === 'all' ? undefined : sectionTab
  );
  const rules = activeExam ? repo.getExamRules(activeExam.id) : [];
  const combos = activeExam ? repo.getSubjectCombinations(activeExam.id) : [];
  const examMarks = activeExam ? repo.getMarks(activeExam.id) : [];

  const subjectConfigs: SubjectExamConfig[] = useMemo(() => {
    return rules
      .filter((r) => r.classId === classId)
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
  }, [rules, subjects, classId]);

  const evaluatedRows = useMemo(() => {
    const evals = students.map((st) => {
      const applicableConfigs = subjectConfigs.filter((cfg) => {
        const sub = subjects.find((s) => s.id === cfg.subjectId);
        return !sub?.sectionId || sub.sectionId === st.sectionId;
      });
      const stMarks = examMarks
        .filter((m) => m.studentId === st.id)
        .map((m) => ({
          subjectId: m.subjectId,
          cq: m.cq,
          mcq: m.mcq,
          practical: m.practical,
        }));
      return evaluateStudentExam({
        studentId: st.id,
        subjectConfigs: applicableConfigs,
        combinations: combos.filter((c) => c.classId === classId),
        marks: stMarks,
        studentFourthSubjectId: st.fourthSubjectId,
        scale: settings?.gradingScale,
        fourthConfig: settings?.fourthConfig,
      });
    });

    const ranks = rankExamResults(evals);
    return students.map((st, idx) => ({
      student: st,
      evaluation: evals[idx],
      rank: ranks.get(st.id) ?? idx + 1,
    }));
  }, [students, subjectConfigs, subjects, examMarks, combos, classId, settings]);

  const subjectHeaders = evaluatedRows[0]?.evaluation.subjects ?? [];

  const buildExportData = () => {
    const headers = [
      'রোল',
      'শিক্ষার্থীর নাম',
      'আইডি',
      ...subjectHeaders.map((s) => `${s.name} (মোট/গ্রেড)`),
      'মোট নম্বর',
      '৪র্থ বোনাস',
      'GPA',
      'গ্রেড',
      'ফলাফল',
      'মেধাক্রম',
    ];
    const rows = evaluatedRows.map(({ student, evaluation, rank }) => [
      student.roll,
      student.name,
      student.studentCode,
      ...subjectHeaders.map((hdr) => {
        const matched = evaluation.subjects.find((x) => x.key === hdr.key);
        return matched ? `${matched.totalObtained} (${matched.letter})` : '—';
      }),
      evaluation.totalObtained,
      evaluation.fourthBonus,
      evaluation.gpa.toFixed(2),
      evaluation.overallGrade,
      evaluation.passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ',
      rank,
    ]);
    return { headers, rows };
  };

  if (!activeExam) {
    return (
      <EmptyState
        title="কোনো পরীক্ষা নেই"
        description="ট্যাবুলেশন শিট দেখতে প্রথমে একটি পরীক্ষা তৈরি করুন।"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls Card */}
      <Card className="space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Select
            label="পরীক্ষা"
            value={activeExam.id}
            onChange={(e) => setExamId(e.target.value)}
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
          <Select
            label="শ্রেণি"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionTab('all');
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1 p-1 rounded-[12px] bg-[#F4F6FC] dark:bg-[#0B1020] border border-[#E2E6F3] dark:border-[#262F52]">
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`flex-1 px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-white dark:bg-[#141B34] text-[#4F46E5] dark:text-[#A5B4FC] shadow-xs'
                  : 'text-[#5D6785] dark:text-[#98A2C7]'
              }`}
            >
              বিস্তারিত
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`flex-1 px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-[#141B34] text-[#4F46E5] dark:text-[#A5B4FC] shadow-xs'
                  : 'text-[#5D6785] dark:text-[#98A2C7]'
              }`}
            >
              সংক্ষিপ্ত
            </button>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => {
                const { headers, rows } = buildExportData();
                exportToExcel('tabulation-sheet.xlsx', 'Tabulation', headers, rows);
                showToast('Excel ট্যাবুলেশন ডাউনলোড হয়েছে', 'success');
              }}
            >
              Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => {
                const { headers, rows } = buildExportData();
                exportToCsv('tabulation-sheet.csv', headers, rows);
                showToast('CSV ট্যাবুলেশন ডাউনলোড হয়েছে', 'success');
              }}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Section Tabs + Bulk Marksheet */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E6F3] dark:border-[#262F52]">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSectionTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                sectionTab === 'all'
                  ? 'bg-brand-gradient text-white'
                  : 'bg-[#F4F6FC] dark:bg-[#0B1020] text-[#5D6785] dark:text-[#98A2C7]'
              }`}
            >
              সকল শাখা
            </button>
            {classSections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSectionTab(sec.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  sectionTab === sec.id
                    ? 'bg-brand-gradient text-white'
                    : 'bg-[#F4F6FC] dark:bg-[#0B1020] text-[#5D6785] dark:text-[#98A2C7]'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              শিট প্রিন্ট
            </Button>
            <Button
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setBulkMarksheetOpen(true)}
              disabled={evaluatedRows.length === 0}
            >
              বাল্ক অফিসিয়াল মার্কশিট
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabulation Table */}
      {evaluatedRows.length === 0 ? (
        <EmptyState
          title="কোনো শিক্ষার্থী নেই"
          description="এই শ্রেণি বা শাখায় এখনো কোনো শিক্ষার্থী যুক্ত হয়নি।"
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-[16px] border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#4F46E5]/[0.08] dark:bg-[#4F46E5]/[0.16] border-b border-[#E2E6F3] dark:border-[#262F52] font-bold">
                <th className="px-3 py-3 whitespace-nowrap">রোল</th>
                <th className="px-3 py-3 whitespace-nowrap">শিক্ষার্থী</th>
                {subjectHeaders.map((sub) => (
                  <th key={sub.key} className="px-3 py-3 text-center whitespace-nowrap">
                    {sub.name}
                    {sub.isFourth ? ' (৪র্থ)' : ''}
                  </th>
                ))}
                <th className="px-3 py-3 text-center whitespace-nowrap">মোট</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">৪র্থ বোনাস</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">GPA</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">গ্রেড</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">ফলাফল</th>
                <th className="px-3 py-3 text-right whitespace-nowrap no-print">মার্কশিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
              {evaluatedRows.map(({ student, evaluation }) => (
                <tr
                  key={student.id}
                  className={
                    !evaluation.passed
                      ? 'bg-[#DC2626]/[0.05] dark:bg-[#DC2626]/[0.12]'
                      : 'hover:bg-[#4F46E5]/[0.03]'
                  }
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {formatNumeral(student.roll, numeralLocale)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <p className="font-bold text-sm">{student.name}</p>
                    <p className="text-[11px] text-[#5D6785] dark:text-[#98A2C7]">
                      {student.studentCode}
                    </p>
                  </td>
                  {subjectHeaders.map((hdr) => {
                    const sub = evaluation.subjects.find((x) => x.key === hdr.key);
                    if (!sub) {
                      return (
                        <td key={hdr.key} className="px-3 py-2.5 text-center text-[#5D6785]">
                          —
                        </td>
                      );
                    }

                    if (viewMode === 'detailed') {
                      return (
                        <td key={hdr.key} className="px-3 py-2.5 text-center tabular-nums whitespace-nowrap">
                          {sub.papers.map((p) => (
                            <div key={p.subjectId} className="text-[11px] text-[#5D6785] dark:text-[#98A2C7]">
                              C:{formatNumeral(p.cq, numeralLocale)} M:{formatNumeral(p.mcq, numeralLocale)}
                              {p.practical > 0 ? ` P:${formatNumeral(p.practical, numeralLocale)}` : ''}
                            </div>
                          ))}
                          <div className={`font-bold ${sub.passed ? '' : 'text-[#DC2626]'}`}>
                            {formatNumeral(sub.totalObtained, numeralLocale)} ({sub.letter})
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={hdr.key} className="px-3 py-2.5 text-center tabular-nums whitespace-nowrap">
                        <div className={`font-bold ${sub.passed ? '' : 'text-[#DC2626]'}`}>
                          {formatNumeral(sub.totalObtained, numeralLocale)} · {sub.letter}
                        </div>
                        {sub.isCombined && (
                          <div className="text-[11px] text-[#5D6785] dark:text-[#98A2C7]">
                            {sub.papers
                              .map(
                                (p) =>
                                  `${formatNumeral(p.subjectCode, numeralLocale)}: ${formatNumeral(
                                    p.totalObtained,
                                    numeralLocale
                                  )}`
                              )
                              .join(' + ')}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                    {formatNumeral(evaluation.totalObtained, numeralLocale)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-[#4F46E5] dark:text-[#A5B4FC] tabular-nums">
                    +{formatGpa(evaluation.fourthBonus, numeralLocale)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                    {formatGpa(evaluation.gpa, numeralLocale)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold">{evaluation.overallGrade}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Pill variant={evaluation.passed ? 'success' : 'danger'}>
                      {evaluation.passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
                    </Pill>
                  </td>
                  <td className="px-3 py-2.5 text-right no-print">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setSingleMarksheetStudentId(student.id)}
                    >
                      দেখুন
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single Official Marksheet Modal */}
      <Modal
        open={Boolean(singleMarksheetStudentId)}
        onClose={() => setSingleMarksheetStudentId(null)}
        title="অফিসিয়াল মার্কশিট (A4)"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSingleMarksheetStudentId(null)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              প্রিন্ট / PDF ডাউনলোড
            </Button>
          </>
        }
      >
        {institution &&
          singleMarksheetStudentId &&
          (() => {
            const found = evaluatedRows.find((r) => r.student.id === singleMarksheetStudentId);
            if (!found) return null;
            return (
              <MarksheetSheet
                institution={institution}
                exam={activeExam}
                student={found.student}
                classRoom={classes.find((c) => c.id === found.student.classId)}
                section={sections.find((s) => s.id === found.student.sectionId)}
                evaluation={found.evaluation}
                meritRank={found.rank}
                locale={numeralLocale}
              />
            );
          })()}
      </Modal>

      {/* Bulk Official Marksheets Modal */}
      <Modal
        open={bulkMarksheetOpen}
        onClose={() => setBulkMarksheetOpen(false)}
        title={`বাল্ক অফিসিয়াল মার্কশিট (${formatNumeral(evaluatedRows.length, numeralLocale)}টি)`}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkMarksheetOpen(false)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              সকল মার্কশিট PDF / প্রিন্ট
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {institution &&
            evaluatedRows.map((row, idx) => (
              <MarksheetSheet
                key={row.student.id}
                institution={institution}
                exam={activeExam}
                student={row.student}
                classRoom={classes.find((c) => c.id === row.student.classId)}
                section={sections.find((s) => s.id === row.student.sectionId)}
                evaluation={row.evaluation}
                meritRank={row.rank}
                locale={numeralLocale}
                pageBreak={idx < evaluatedRows.length - 1}
              />
            ))}
        </div>
      </Modal>
    </div>
  );
};
