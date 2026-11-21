import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Save, Send } from 'lucide-react';
import { evaluateSinglePaper } from '../../../lib/grading/calculator';
import { formatGpa, formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import type { MarkStatus } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Select } from '../../../components/ui/FormControls';
import { Pill } from '../../../components/ui/Pill';

interface MarksEntryPageProps {
  teacherScoped?: boolean;
}

export const MarksEntryPage: React.FC<MarksEntryPageProps> = ({ teacherScoped = false }) => {
  const { repo, numeralLocale, saveMarksBatch, showToast } = useApp();
  if (!repo) return null;

  const settings = repo.getSettings();
  const exams = repo.getExams();
  const allClasses = repo.getClasses();
  const allSections = repo.getSections();
  const allSubjects = repo.getSubjects();
  const teacherAssignments = teacherScoped ? repo.getTeacherAssignments() : [];

  const availableClasses = useMemo(() => {
    if (!teacherScoped) return allClasses;
    const allowedIds = new Set(teacherAssignments.map((a) => a.classId));
    return allClasses.filter((c) => allowedIds.has(c.id));
  }, [teacherScoped, allClasses, teacherAssignments]);

  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const [classId, setClassId] = useState(availableClasses[0]?.id ?? '');

  const availableSections = useMemo(() => {
    const clsSecs = allSections.filter((s) => s.classId === classId);
    if (!teacherScoped) return clsSecs;
    const clsAssignments = teacherAssignments.filter((a) => a.classId === classId);
    if (clsAssignments.some((a) => a.sectionId === null)) return clsSecs;
    const allowedSecIds = new Set(clsAssignments.map((a) => a.sectionId));
    return clsSecs.filter((s) => allowedSecIds.has(s.id));
  }, [teacherScoped, allSections, classId, teacherAssignments]);

  const [sectionId, setSectionId] = useState(availableSections[0]?.id ?? '');

  useEffect(() => {
    if (!availableSections.some((s) => s.id === sectionId)) {
      setSectionId(availableSections[0]?.id ?? '');
    }
  }, [availableSections, sectionId]);

  const availableSubjects = useMemo(() => {
    const clsSubs = allSubjects.filter(
      (s) => s.classId === classId && (!s.sectionId || s.sectionId === sectionId)
    );
    if (!teacherScoped) return clsSubs;
    const allowedSubIds = new Set(
      teacherAssignments
        .filter(
          (a) => a.classId === classId && (a.sectionId === null || a.sectionId === sectionId)
        )
        .map((a) => a.subjectId)
    );
    return clsSubs.filter((s) => allowedSubIds.has(s.id));
  }, [teacherScoped, allSubjects, classId, sectionId, teacherAssignments]);

  const [subjectId, setSubjectId] = useState(availableSubjects[0]?.id ?? '');

  useEffect(() => {
    if (!availableSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(availableSubjects[0]?.id ?? '');
    }
  }, [availableSubjects, subjectId]);

  const students = repo.getStudents(classId, sectionId);
  const examRules = examId ? repo.getExamRules(examId) : [];
  const activeRule = examRules.find((r) => r.subjectId === subjectId);
  const activeSubject = availableSubjects.find((s) => s.id === subjectId);

  const ruleConfig = useMemo(() => {
    if (activeRule && activeSubject) {
      return {
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        subjectCode: activeSubject.code,
        isFourth: activeSubject.isFourth,
        hasCq: activeRule.hasCq,
        cqFull: activeRule.cqFull,
        cqPass: activeRule.cqPass,
        hasMcq: activeRule.hasMcq,
        mcqFull: activeRule.mcqFull,
        mcqPass: activeRule.mcqPass,
        hasPractical: activeRule.hasPractical,
        practicalFull: activeRule.practicalFull,
        practicalPass: activeRule.practicalPass,
        passRule: activeRule.passRule,
        totalFull: activeRule.totalFull,
        totalPass: activeRule.totalPass,
      };
    }
    if (activeSubject) {
      return {
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        subjectCode: activeSubject.code,
        isFourth: activeSubject.isFourth,
        hasCq: activeSubject.hasCq,
        cqFull: activeSubject.cqFull,
        cqPass: activeSubject.cqPass,
        hasMcq: activeSubject.hasMcq,
        mcqFull: activeSubject.mcqFull,
        mcqPass: activeSubject.mcqPass,
        hasPractical: activeSubject.hasPractical,
        practicalFull: activeSubject.practicalFull,
        practicalPass: activeSubject.practicalPass,
        passRule: activeSubject.passRule,
        totalFull: activeSubject.totalFull,
        totalPass: activeSubject.totalPass,
      };
    }
    return null;
  }, [activeRule, activeSubject]);

  const existingMarks = examId && subjectId ? repo.getMarks(examId, subjectId, sectionId) : [];

  const [draftValues, setDraftValues] = useState<
    Record<string, { cq: string; mcq: string; practical: string; status: MarkStatus }>
  >({});

  useEffect(() => {
    const initial: Record<
      string,
      { cq: string; mcq: string; practical: string; status: MarkStatus }
    > = {};
    for (const st of students) {
      const m = existingMarks.find((x) => x.studentId === st.id);
      initial[st.id] = {
        cq: m?.cq !== null && m?.cq !== undefined ? String(m.cq) : '',
        mcq: m?.mcq !== null && m?.mcq !== undefined ? String(m.mcq) : '',
        practical: m?.practical !== null && m?.practical !== undefined ? String(m.practical) : '',
        status: m?.status ?? 'draft',
      };
    }
    setDraftValues(initial);
  }, [examId, classId, sectionId, subjectId, students.length]);

  const handleMarkChange = (
    studentId: string,
    field: 'cq' | 'mcq' | 'practical',
    raw: string,
    maxAllowed: number
  ) => {
    if (raw === '') {
      setDraftValues((p) => ({
        ...p,
        [studentId]: { ...(p[studentId] ?? { cq: '', mcq: '', practical: '', status: 'draft' }), [field]: '' },
      }));
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num) || num < 0) return;
    if (num > maxAllowed) {
      showToast(
        `সর্বোচ্চ নম্বর ${formatNumeral(maxAllowed, numeralLocale)} এর বেশি দেওয়া যাবে না`,
        'danger'
      );
      setDraftValues((p) => ({
        ...p,
        [studentId]: { ...(p[studentId] ?? { cq: '', mcq: '', practical: '', status: 'draft' }), [field]: '' },
      }));
      return;
    }
    setDraftValues((p) => ({
      ...p,
      [studentId]: { ...(p[studentId] ?? { cq: '', mcq: '', practical: '', status: 'draft' }), [field]: String(num) },
    }));
  };

  const handleSave = (status: MarkStatus) => {
    if (!examId || !classId || !sectionId || !subjectId) return;
    const entries = students.map((st) => {
      const row = draftValues[st.id];
      return {
        studentId: st.id,
        cq: ruleConfig?.hasCq && row?.cq !== '' ? Number(row?.cq) : null,
        mcq: ruleConfig?.hasMcq && row?.mcq !== '' ? Number(row?.mcq) : null,
        practical: ruleConfig?.hasPractical && row?.practical !== '' ? Number(row?.practical) : null,
      };
    });
    const res = saveMarksBatch({
      examId,
      classId,
      sectionId,
      subjectId,
      status,
      entries,
    });
    if (!res.ok) {
      showToast(res.error ?? 'সংরক্ষণ ব্যর্থ হয়েছে', 'danger');
      return;
    }
    setDraftValues((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], status };
      }
      return next;
    });
    showToast(
      status === 'draft'
        ? 'নম্বর খসড়া হিসেবে সংরক্ষিত হয়েছে'
        : 'নম্বর অনুমোদনের জন্য জমা দেওয়া হয়েছে',
      'success'
    );
  };

  return (
    <div className="space-y-5">
      {/* Sticky Filter Row */}
      <Card className="sticky top-[76px] z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select label="পরীক্ষা" value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
          <Select label="শ্রেণি" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="শাখা" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {availableSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="বিষয়" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!ruleConfig || students.length === 0 ? (
        <EmptyState
          title="নম্বর এন্ট্রির জন্য শিক্ষার্থী বা বিষয় পাওয়া যায়নি"
          description="অনুগ্রহ করে পরীক্ষা, শ্রেণি, শাখা ও বিষয় সঠিকভাবে নির্বাচন করুন।"
        />
      ) : (
        <>
          <div className="w-full overflow-x-auto rounded-[16px] border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#4F46E5]/[0.08] dark:bg-[#4F46E5]/[0.16] border-b border-[#E2E6F3] dark:border-[#262F52] text-xs font-bold">
                  <th className="px-4 py-3">রোল</th>
                  <th className="px-4 py-3">শিক্ষার্থীর নাম</th>
                  <th className="px-4 py-3 text-center">
                    CQ ({formatNumeral(ruleConfig.hasCq ? ruleConfig.cqFull : 0, numeralLocale)})
                  </th>
                  <th className="px-4 py-3 text-center">
                    MCQ ({formatNumeral(ruleConfig.hasMcq ? ruleConfig.mcqFull : 0, numeralLocale)})
                  </th>
                  <th className="px-4 py-3 text-center">
                    ব্যবহারিক (
                    {formatNumeral(ruleConfig.hasPractical ? ruleConfig.practicalFull : 0, numeralLocale)}
                    )
                  </th>
                  <th className="px-4 py-3 text-center">মোট</th>
                  <th className="px-4 py-3 text-center">গ্রেড (পয়েন্ট)</th>
                  <th className="px-4 py-3 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
                {students.map((st) => {
                  const row = draftValues[st.id] ?? {
                    cq: '',
                    mcq: '',
                    practical: '',
                    status: 'draft' as MarkStatus,
                  };
                  const evaluated = evaluateSinglePaper(
                    ruleConfig,
                    {
                      subjectId: ruleConfig.subjectId,
                      cq: row.cq === '' ? null : Number(row.cq),
                      mcq: row.mcq === '' ? null : Number(row.mcq),
                      practical: row.practical === '' ? null : Number(row.practical),
                    },
                    settings?.gradingScale
                  );
                  const hasAnyInput = row.cq !== '' || row.mcq !== '' || row.practical !== '';

                  return (
                    <tr key={st.id} className="hover:bg-[#4F46E5]/[0.03]">
                      <td className="px-4 py-2.5 font-bold tabular-nums">
                        {formatNumeral(st.roll, numeralLocale)}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-sm">{st.name}</p>
                        <p className="text-[11px] text-[#5D6785] dark:text-[#98A2C7]">
                          {st.studentCode}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={ruleConfig.cqFull}
                          disabled={!ruleConfig.hasCq}
                          aria-label={`${st.name} CQ নম্বর`}
                          value={ruleConfig.hasCq ? row.cq : ''}
                          onChange={(e) =>
                            handleMarkChange(st.id, 'cq', e.target.value, ruleConfig.cqFull)
                          }
                          placeholder={ruleConfig.hasCq ? '০' : '—'}
                          className={`w-20 rounded-[10px] border px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums ${
                            ruleConfig.hasCq
                              ? 'border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020]'
                              : 'hatched-locked border-[#E2E6F3] dark:border-[#262F52] cursor-not-allowed opacity-70'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={ruleConfig.mcqFull}
                          disabled={!ruleConfig.hasMcq}
                          aria-label={`${st.name} MCQ নম্বর`}
                          value={ruleConfig.hasMcq ? row.mcq : ''}
                          onChange={(e) =>
                            handleMarkChange(st.id, 'mcq', e.target.value, ruleConfig.mcqFull)
                          }
                          placeholder={ruleConfig.hasMcq ? '০' : '—'}
                          className={`w-20 rounded-[10px] border px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums ${
                            ruleConfig.hasMcq
                              ? 'border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020]'
                              : 'hatched-locked border-[#E2E6F3] dark:border-[#262F52] cursor-not-allowed opacity-70'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={ruleConfig.practicalFull}
                          disabled={!ruleConfig.hasPractical}
                          aria-label={`${st.name} ব্যবহারিক নম্বর`}
                          value={ruleConfig.hasPractical ? row.practical : ''}
                          onChange={(e) =>
                            handleMarkChange(
                              st.id,
                              'practical',
                              e.target.value,
                              ruleConfig.practicalFull
                            )
                          }
                          placeholder={ruleConfig.hasPractical ? '০' : '—'}
                          className={`w-20 rounded-[10px] border px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums ${
                            ruleConfig.hasPractical
                              ? 'border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020]'
                              : 'hatched-locked border-[#E2E6F3] dark:border-[#262F52] cursor-not-allowed opacity-70'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold tabular-nums">
                        {hasAnyInput ? formatNumeral(evaluated.totalObtained, numeralLocale) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {hasAnyInput ? (
                          <Pill variant={evaluated.passed ? 'success' : 'danger'}>
                            {evaluated.letter} ({formatGpa(evaluated.point, numeralLocale)})
                          </Pill>
                        ) : (
                          <span className="text-xs text-[#5D6785]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Pill
                          variant={
                            row.status === 'approved'
                              ? 'success'
                              : row.status === 'submitted'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {row.status === 'approved'
                            ? 'অনুমোদিত'
                            : row.status === 'submitted'
                            ? 'জমা হয়েছে'
                            : 'ড্রাফট'}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => handleSave('draft')}
            >
              খসড়া সংরক্ষণ
            </Button>
            <Button
              leftIcon={
                teacherScoped ? <Send className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
              }
              onClick={() => handleSave('submitted')}
            >
              অনুমোদনের জন্য জমা দিন
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
