import React, { useState } from 'react';
import { Copy, IdCard, Plus, Printer, Trash2, Wand2 } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { calculateThirtyThreePercent } from '../../../lib/grading/scale';
import type { CombineMode, CombinePassRule, PassRuleType } from '../../../lib/grading/types';
import { useApp } from '../../../store/AppContext';
import type { Exam } from '../../../types/domain';
import { AdmitCardSheet } from '../../../components/print/PrintableTemplates';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

interface RuleDraft {
  classId: string;
  sectionId: string | null;
  subjectId: string;
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

interface ComboDraft {
  classId: string;
  name: string;
  paperSubjectIds: string[];
  mode: CombineMode;
  passRule: CombinePassRule;
  isFourth: boolean;
}

export const ExamsPage: React.FC = () => {
  const {
    repo,
    numeralLocale,
    saveExamWithRules,
    deleteExam,
    toggleSectionPublication,
    showToast,
  } = useApp();

  if (!repo) return null;

  const institution = repo.getInstitution();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const students = repo.getStudents();
  const exams = repo.getExams();

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id ?? '');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [admitPreviewStudentId, setAdmitPreviewStudentId] = useState<string | null>(null);
  const [bulkAdmitOpen, setBulkAdmitOpen] = useState(false);

  // Exam editor form state
  const [examForm, setExamForm] = useState({
    name: '',
    defaultClassId: classes[0]?.id ?? '',
    sectionId: '' as string,
    startDate: '2026-11-01',
    endDate: '2026-11-15',
    marksDeadline: '2026-11-20',
  });
  const [rulesDraft, setRulesDraft] = useState<RuleDraft[]>([]);
  const [combosDraft, setCombosDraft] = useState<ComboDraft[]>([]);

  const activeExam = exams.find((e) => e.id === selectedExamId) ?? exams[0] ?? null;

  const openNewExam = () => {
    const defCls = classes[0]?.id ?? '';
    const clsSubs = subjects.filter((s) => s.classId === defCls);
    setEditingExam(null);
    setExamForm({
      name: '',
      defaultClassId: defCls,
      sectionId: '',
      startDate: '2026-12-01',
      endDate: '2026-12-15',
      marksDeadline: '2026-12-20',
    });
    setRulesDraft(
      clsSubs.map((s) => ({
        classId: s.classId,
        sectionId: s.sectionId,
        subjectId: s.id,
        hasCq: s.hasCq,
        cqFull: s.cqFull,
        cqPass: s.cqPass,
        hasMcq: s.hasMcq,
        mcqFull: s.mcqFull,
        mcqPass: s.mcqPass,
        hasPractical: s.hasPractical,
        practicalFull: s.practicalFull,
        practicalPass: s.practicalPass,
        passRule: s.passRule,
        totalFull: s.totalFull,
        totalPass: s.totalPass,
      }))
    );
    setCombosDraft([]);
    setEditorOpen(true);
  };

  const openEditExam = (ex: Exam) => {
    const existingRules = repo.getExamRules(ex.id);
    const existingCombos = repo.getSubjectCombinations(ex.id);
    setEditingExam(ex);
    setExamForm({
      name: ex.name,
      defaultClassId: ex.defaultClassId,
      sectionId: ex.sectionId ?? '',
      startDate: ex.startDate,
      endDate: ex.endDate,
      marksDeadline: ex.marksDeadline,
    });
    setRulesDraft(
      existingRules.map((r) => ({
        classId: r.classId,
        sectionId: r.sectionId,
        subjectId: r.subjectId,
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
      }))
    );
    setCombosDraft(
      existingCombos.map((c) => ({
        classId: c.classId,
        name: c.name,
        paperSubjectIds: c.paperSubjectIds,
        mode: c.mode,
        passRule: c.passRule,
        isFourth: c.isFourth,
      }))
    );
    setEditorOpen(true);
  };

  const applyPreset = (
    idx: number,
    preset: 'gen100' | 'prac100' | '50' | 'prac50' | 'cq100' | 'mcq100' | 'auto33'
  ) => {
    setRulesDraft((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (preset === 'auto33') {
          const totalFull =
            (r.hasCq ? r.cqFull : 0) +
            (r.hasMcq ? r.mcqFull : 0) +
            (r.hasPractical ? r.practicalFull : 0);
          return {
            ...r,
            cqPass: r.hasCq ? calculateThirtyThreePercent(r.cqFull) : 0,
            mcqPass: r.hasMcq ? calculateThirtyThreePercent(r.mcqFull) : 0,
            practicalPass: r.hasPractical ? calculateThirtyThreePercent(r.practicalFull) : 0,
            totalFull,
            totalPass: calculateThirtyThreePercent(totalFull),
          };
        }
        if (preset === 'gen100') {
          return {
            ...r,
            hasCq: true,
            cqFull: 70,
            cqPass: 23,
            hasMcq: true,
            mcqFull: 30,
            mcqPass: 10,
            hasPractical: false,
            practicalFull: 0,
            practicalPass: 0,
            totalFull: 100,
            totalPass: 33,
          };
        }
        if (preset === 'prac100') {
          return {
            ...r,
            hasCq: true,
            cqFull: 50,
            cqPass: 17,
            hasMcq: true,
            mcqFull: 25,
            mcqPass: 8,
            hasPractical: true,
            practicalFull: 25,
            practicalPass: 8,
            totalFull: 100,
            totalPass: 33,
          };
        }
        if (preset === '50') {
          return {
            ...r,
            hasCq: true,
            cqFull: 35,
            cqPass: 12,
            hasMcq: true,
            mcqFull: 15,
            mcqPass: 5,
            hasPractical: false,
            practicalFull: 0,
            practicalPass: 0,
            totalFull: 50,
            totalPass: 17,
          };
        }
        if (preset === 'prac50') {
          return {
            ...r,
            hasCq: true,
            cqFull: 25,
            cqPass: 8,
            hasMcq: true,
            mcqFull: 15,
            mcqPass: 5,
            hasPractical: true,
            practicalFull: 10,
            practicalPass: 3,
            totalFull: 50,
            totalPass: 17,
          };
        }
        if (preset === 'cq100') {
          return {
            ...r,
            hasCq: true,
            cqFull: 100,
            cqPass: 33,
            hasMcq: false,
            mcqFull: 0,
            mcqPass: 0,
            hasPractical: false,
            practicalFull: 0,
            practicalPass: 0,
            totalFull: 100,
            totalPass: 33,
          };
        }
        // mcq100
        return {
          ...r,
          hasCq: false,
          cqFull: 0,
          cqPass: 0,
          hasMcq: true,
          mcqFull: 100,
          mcqPass: 33,
          hasPractical: false,
          practicalFull: 0,
          practicalPass: 0,
          totalFull: 100,
          totalPass: 33,
        };
      })
    );
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveExamWithRules({
      id: editingExam?.id,
      name: examForm.name,
      defaultClassId: examForm.defaultClassId,
      sectionId: examForm.sectionId || null,
      startDate: examForm.startDate,
      endDate: examForm.endDate,
      marksDeadline: examForm.marksDeadline,
      rules: rulesDraft.map((r) => ({
        ...r,
        totalFull:
          (r.hasCq ? r.cqFull : 0) +
          (r.hasMcq ? r.mcqFull : 0) +
          (r.hasPractical ? r.practicalFull : 0),
      })),
      combinations: combosDraft,
    });
    if (!res.ok || !res.data) {
      showToast(res.error ?? 'পরীক্ষা সংরক্ষণ করা যায়নি', 'danger');
      return;
    }
    setSelectedExamId(res.data.id);
    setEditorOpen(false);
    showToast('পরীক্ষা, নম্বর বণ্টন ও প্রবেশপত্র সংরক্ষিত হয়েছে', 'success');
  };

  const activeRules = activeExam ? repo.getExamRules(activeExam.id) : [];
  const activeClassSections = activeExam
    ? sections.filter(
        (s) =>
          s.classId === activeExam.defaultClassId &&
          (!activeExam.sectionId || s.id === activeExam.sectionId)
      )
    : [];
  const activeStudents = activeExam
    ? students.filter(
        (st) =>
          st.classId === activeExam.defaultClassId &&
          (!activeExam.sectionId || st.sectionId === activeExam.sectionId)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Top Exam Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {exams.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelectedExamId(ex.id)}
              className={`px-4 py-2 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${
                activeExam?.id === ex.id
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] text-[#111936] dark:text-[#E8ECFB]'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>

        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openNewExam}>
          নতুন পরীক্ষা তৈরি করুন
        </Button>
      </div>

      {!activeExam ? (
        <EmptyState
          title="কোনো পরীক্ষা তৈরি নেই"
          description="নতুন পরীক্ষা তৈরি করতে উপরের বাটনে ক্লিক করুন।"
        />
      ) : (
        <div className="space-y-6">
          {/* Exam Summary & Section Publish Toggles */}
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#111936] dark:text-[#E8ECFB]">
                  {activeExam.name}
                </h2>
                <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] mt-1 tabular-nums">
                  সময়কাল: {formatNumeral(activeExam.startDate, numeralLocale)} থেকে{' '}
                  {formatNumeral(activeExam.endDate, numeralLocale)} · নম্বর জমার শেষ তারিখ:{' '}
                  {formatNumeral(activeExam.marksDeadline, numeralLocale)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditExam(activeExam)}>
                  নম্বর বণ্টন ও সমন্বয় সম্পাদনা
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteTarget(activeExam)}
                >
                  পরীক্ষা মুছুন
                </Button>
              </div>
            </div>

            <div className="border-t border-[#E2E6F3] dark:border-[#262F52] pt-4 space-y-3">
              <p className="text-sm font-bold text-[#111936] dark:text-[#E8ECFB]">
                শাখাভিত্তিক ফলাফল প্রকাশ নিয়ন্ত্রণ
              </p>
              <div className="flex flex-wrap gap-3">
                {activeClassSections.map((sec) => {
                  const published = repo.isSectionPublished(activeExam.id, sec.id);
                  return (
                    <div
                      key={sec.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020]/50"
                    >
                      <span className="text-sm font-semibold">{sec.name}</span>
                      <Pill variant={published ? 'success' : 'warning'}>
                        {published ? 'প্রকাশিত' : 'অপ্রকাশিত'}
                      </Pill>
                      <Button
                        size="sm"
                        variant={published ? 'outline' : 'primary'}
                        onClick={() => {
                          toggleSectionPublication(activeExam.id, sec.classId, sec.id, !published);
                          showToast(
                            !published ? 'ফলাফল প্রকাশিত হয়েছে' : 'ফলাফল অপ্রকাশিত করা হয়েছে',
                            'success'
                          );
                        }}
                      >
                        {published ? 'অপ্রকাশিত করুন' : 'প্রকাশ করুন'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Auto Admit Cards Section */}
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <IdCard className="w-5 h-5 text-[#4F46E5]" />
                <div>
                  <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                    স্বয়ংক্রিয় প্রবেশপত্র ({formatNumeral(activeStudents.length, numeralLocale)} জন)
                  </h3>
                  <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
                    পরীক্ষা সংরক্ষণের সাথে সাথেই A4 প্রবেশপত্র প্রস্তুত হয়েছে।
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => setBulkAdmitOpen(true)}
                  disabled={activeStudents.length === 0}
                >
                  সকল প্রবেশপত্র PDF / প্রিন্ট
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeStudents.slice(0, 12).map((st) => {
                const sec = sections.find((s) => s.id === st.sectionId);
                return (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{st.name}</p>
                      <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                        রোল {formatNumeral(st.roll, numeralLocale)} · {sec?.name ?? ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdmitPreviewStudentId(st.id)}
                    >
                      প্রবেশপত্র
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Exam & Mark Distribution Editor Modal */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingExam ? 'পরীক্ষা ও নম্বর বণ্টন সম্পাদনা' : 'নতুন পরীক্ষা ও নম্বর বণ্টন ইঞ্জিন'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit" form="exam-editor-form">
              পরীক্ষা সংরক্ষণ করুন
            </Button>
          </>
        }
      >
        <form id="exam-editor-form" onSubmit={handleSaveExam} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="পরীক্ষার নাম"
              value={examForm.name}
              onChange={(e) => setExamForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="যেমন: প্রাক-নির্বাচনী পরীক্ষা ২০২৬"
            />
            <Select
              label="শ্রেণি"
              value={examForm.defaultClassId}
              onChange={(e) => {
                const cid = e.target.value;
                const clsSubs = subjects.filter((s) => s.classId === cid);
                setExamForm((p) => ({ ...p, defaultClassId: cid, sectionId: '' }));
                setRulesDraft(
                  clsSubs.map((s) => ({
                    classId: s.classId,
                    sectionId: s.sectionId,
                    subjectId: s.id,
                    hasCq: s.hasCq,
                    cqFull: s.cqFull,
                    cqPass: s.cqPass,
                    hasMcq: s.hasMcq,
                    mcqFull: s.mcqFull,
                    mcqPass: s.mcqPass,
                    hasPractical: s.hasPractical,
                    practicalFull: s.practicalFull,
                    practicalPass: s.practicalPass,
                    passRule: s.passRule,
                    totalFull: s.totalFull,
                    totalPass: s.totalPass,
                  }))
                );
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="শাখা"
              value={examForm.sectionId}
              onChange={(e) => setExamForm((p) => ({ ...p, sectionId: e.target.value }))}
            >
              <option value="">সকল শাখা</option>
              {sections
                .filter((s) => s.classId === examForm.defaultClassId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
            <Input
              label="শুরুর তারিখ"
              type="date"
              value={examForm.startDate}
              onChange={(e) => setExamForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="শেষের তারিখ"
              type="date"
              value={examForm.endDate}
              onChange={(e) => setExamForm((p) => ({ ...p, endDate: e.target.value }))}
            />
            <Input
              label="নম্বর জমার শেষ তারিখ"
              type="date"
              value={examForm.marksDeadline}
              onChange={(e) => setExamForm((p) => ({ ...p, marksDeadline: e.target.value }))}
            />
          </div>

          {/* Mark Distribution Rule Stack */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">বিষয়ভিত্তিক নম্বর বণ্টন</h3>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  const firstSub = subjects.find((s) => s.classId === examForm.defaultClassId);
                  if (!firstSub) return;
                  setRulesDraft((p) => [
                    ...p,
                    {
                      classId: examForm.defaultClassId,
                      sectionId: null,
                      subjectId: firstSub.id,
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
                    },
                  ]);
                }}
              >
                নিয়ম যোগ করুন
              </Button>
            </div>

            {rulesDraft.map((rule, idx) => {
              const clsSubjects = subjects.filter((s) => s.classId === rule.classId);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-[14px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/50 dark:bg-[#0B1020]/50 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <Select
                        value={rule.subjectId}
                        onChange={(e) =>
                          setRulesDraft((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, subjectId: e.target.value } : r
                            )
                          )
                        }
                      >
                        {clsSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRulesDraft((prev) => [...prev, { ...rule }])}
                        title="ক্লোন করুন"
                        aria-label="নিয়ম ক্লোন করুন"
                        className="p-2 rounded-lg text-[#4F46E5] hover:bg-[#4F46E5]/10 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRulesDraft((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="মুছুন"
                        aria-label="নিয়ম মুছুন"
                        className="p-2 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7 Preset Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'gen100', label: 'সাধারণ ১০০ (৭০+৩০)' },
                      { id: 'prac100', label: 'ব্যবহারিক ১০০ (৫০+২৫+২৫)' },
                      { id: '50', label: '৫০ (৩৫+১৫)' },
                      { id: 'prac50', label: '৫০ ব্যবহারিক' },
                      { id: 'cq100', label: 'শুধু লিখিত ১০০' },
                      { id: 'mcq100', label: 'শুধু MCQ ১০০' },
                      { id: 'auto33', label: '৩৩% অটো' },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => applyPreset(idx, chip.id as Parameters<typeof applyPreset>[1])}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#4F46E5]/30 bg-white dark:bg-[#141B34] text-[11px] font-semibold text-[#4F46E5] dark:text-[#A5B4FC] hover:bg-[#4F46E5]/10 cursor-pointer"
                      >
                        {chip.id === 'auto33' && <Wand2 className="w-3 h-3" />}
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.hasCq}
                          onChange={(e) =>
                            setRulesDraft((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, hasCq: e.target.checked } : r))
                            )
                          }
                        />
                        <span>CQ</span>
                      </label>
                      {rule.hasCq && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            label="পূর্ণ"
                            type="number"
                            value={rule.cqFull}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, cqFull: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                          <Input
                            label="পাস"
                            type="number"
                            value={rule.cqPass}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, cqPass: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.hasMcq}
                          onChange={(e) =>
                            setRulesDraft((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, hasMcq: e.target.checked } : r
                              )
                            )
                          }
                        />
                        <span>MCQ</span>
                      </label>
                      {rule.hasMcq && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            label="পূর্ণ"
                            type="number"
                            value={rule.mcqFull}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, mcqFull: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                          <Input
                            label="পাস"
                            type="number"
                            value={rule.mcqPass}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, mcqPass: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.hasPractical}
                          onChange={(e) =>
                            setRulesDraft((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, hasPractical: e.target.checked } : r
                              )
                            )
                          }
                        />
                        <span>ব্যবহারিক</span>
                      </label>
                      {rule.hasPractical && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            label="পূর্ণ"
                            type="number"
                            value={rule.practicalFull}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, practicalFull: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                          <Input
                            label="পাস"
                            type="number"
                            value={rule.practicalPass}
                            onChange={(e) =>
                              setRulesDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, practicalPass: Number(e.target.value) } : r
                                )
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] space-y-1.5">
                      <Select
                        label="পাস পদ্ধতি"
                        value={rule.passRule}
                        onChange={(e) =>
                          setRulesDraft((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, passRule: e.target.value as PassRuleType } : r
                            )
                          )
                        }
                      >
                        <option value="separate">আলাদা পাস</option>
                        <option value="total_only">একত্রে মোট পাস</option>
                      </Select>
                      <Input
                        label="মোট পাস"
                        type="number"
                        value={rule.totalPass}
                        onChange={(e) =>
                          setRulesDraft((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, totalPass: Number(e.target.value) } : r
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subject Combinations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">সমন্বিত বিষয় (যেমন: বাংলা ১ম+২য় পত্র)</h3>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  const clsSubs = subjects.filter((s) => s.classId === examForm.defaultClassId);
                  setCombosDraft((p) => [
                    ...p,
                    {
                      classId: examForm.defaultClassId,
                      name: 'বাংলা (১ম + ২য় পত্র)',
                      paperSubjectIds: clsSubs.slice(0, 2).map((s) => s.id),
                      mode: 'sum',
                      passRule: 'combined_total',
                      isFourth: false,
                    },
                  ]);
                }}
              >
                সমন্বয় যোগ করুন
              </Button>
            </div>

            {combosDraft.map((combo, cIdx) => {
              const clsSubs = subjects.filter((s) => s.classId === combo.classId);
              return (
                <div
                  key={cIdx}
                  className="p-4 rounded-[14px] border border-[#E2E6F3] dark:border-[#262F52] space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <Input
                      label="সমন্বিত বিষয়ের নাম"
                      value={combo.name}
                      onChange={(e) =>
                        setCombosDraft((prev) =>
                          prev.map((c, i) => (i === cIdx ? { ...c, name: e.target.value } : c))
                        )
                      }
                    />
                    <Select
                      label="হিসাব পদ্ধতি"
                      value={combo.mode}
                      onChange={(e) =>
                        setCombosDraft((prev) =>
                          prev.map((c, i) =>
                            i === cIdx ? { ...c, mode: e.target.value as CombineMode } : c
                          )
                        )
                      }
                    >
                      <option value="sum">মোট যোগফল</option>
                      <option value="average">গড়</option>
                    </Select>
                    <Select
                      label="পাস নিয়ম"
                      value={combo.passRule}
                      onChange={(e) =>
                        setCombosDraft((prev) =>
                          prev.map((c, i) =>
                            i === cIdx ? { ...c, passRule: e.target.value as CombinePassRule } : c
                          )
                        )
                      }
                    >
                      <option value="combined_total">সমন্বিত মোট নম্বরে পাস</option>
                      <option value="combined_components">সমন্বিত অংশে (CQ/MCQ) পাস</option>
                      <option value="each_paper">প্রতিটি পত্রে আলাদা পাস</option>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {clsSubs.map((sub) => {
                        const checked = combo.paperSubjectIds.includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer ${
                              checked
                                ? 'bg-[#4F46E5]/15 border-[#4F46E5] text-[#4F46E5] dark:text-[#A5B4FC]'
                                : 'border-[#E2E6F3] dark:border-[#262F52]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setCombosDraft((prev) =>
                                  prev.map((c, i) => {
                                    if (i !== cIdx) return c;
                                    const nextIds = e.target.checked
                                      ? [...c.paperSubjectIds, sub.id]
                                      : c.paperSubjectIds.filter((id) => id !== sub.id);
                                    return { ...c, paperSubjectIds: nextIds };
                                  })
                                );
                              }}
                            />
                            <span>{sub.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={combo.isFourth}
                          onChange={(e) =>
                            setCombosDraft((prev) =>
                              prev.map((c, i) =>
                                i === cIdx ? { ...c, isFourth: e.target.checked } : c
                              )
                            )
                          }
                        />
                        <span>৪র্থ বিষয়</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCombosDraft((prev) => prev.filter((_, i) => i !== cIdx))
                        }
                        className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                      >
                        সমন্বয় মুছুন
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </Modal>

      {/* Single Admit Card Modal */}
      <Modal
        open={Boolean(admitPreviewStudentId)}
        onClose={() => setAdmitPreviewStudentId(null)}
        title="প্রবেশপত্র প্রিভিউ (A4)"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdmitPreviewStudentId(null)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              প্রিন্ট / PDF ডাউনলোড
            </Button>
          </>
        }
      >
        {activeExam && institution && admitPreviewStudentId && (() => {
          const st = activeStudents.find((s) => s.id === admitPreviewStudentId);
          if (!st) return null;
          return (
            <AdmitCardSheet
              institution={institution}
              exam={activeExam}
              student={st}
              classRoom={classes.find((c) => c.id === st.classId)}
              section={sections.find((s) => s.id === st.sectionId)}
              rules={activeRules.filter((r) => !r.sectionId || r.sectionId === st.sectionId)}
              subjects={subjects}
              locale={numeralLocale}
            />
          );
        })()}
      </Modal>

      {/* Bulk Admit Cards Modal */}
      <Modal
        open={bulkAdmitOpen}
        onClose={() => setBulkAdmitOpen(false)}
        title={`বাল্ক প্রবেশপত্র (${formatNumeral(activeStudents.length, numeralLocale)}টি)`}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkAdmitOpen(false)}>
              বন্ধ করুন
            </Button>
            <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              সকল প্রবেশপত্র PDF / প্রিন্ট
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {activeExam &&
            institution &&
            activeStudents.map((st, idx) => (
              <AdmitCardSheet
                key={st.id}
                institution={institution}
                exam={activeExam}
                student={st}
                classRoom={classes.find((c) => c.id === st.classId)}
                section={sections.find((s) => s.id === st.sectionId)}
                rules={activeRules.filter((r) => !r.sectionId || r.sectionId === st.sectionId)}
                subjects={subjects}
                locale={numeralLocale}
                pageBreak={idx < activeStudents.length - 1}
              />
            ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="পরীক্ষা মুছে ফেলুন"
        description={`"${deleteTarget?.name ?? ''}" মুছে ফেললে এর নম্বর বণ্টন ও প্রবেশপত্র মুছে যাবে।`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteExam(deleteTarget.id);
          showToast('পরীক্ষা মুছে ফেলা হয়েছে', 'success');
        }}
      />
    </div>
  );
};
