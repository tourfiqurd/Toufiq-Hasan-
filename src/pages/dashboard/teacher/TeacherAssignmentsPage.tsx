import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Paperclip, Plus } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../../components/ui/FormControls';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

export const TeacherAssignmentsPage: React.FC = () => {
  const { repo, numeralLocale, createAssignment, gradeSubmission, showToast } = useApp();
  if (!repo) return null;

  const assignments = repo.getAssignments();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const teacherAssignments = repo.getTeacherAssignments();
  const allStudents = repo.getStudents();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    assignments[0]?.id ?? ''
  );
  const activeAssignment =
    assignments.find((a) => a.id === selectedAssignmentId) ?? assignments[0] ?? null;

  const submissions = activeAssignment ? repo.getSubmissions(activeAssignment.id) : [];
  const [selectedSubId, setSelectedSubId] = useState<string>(submissions[0]?.id ?? '');
  const activeSubmission =
    submissions.find((s) => s.id === selectedSubId) ?? submissions[0] ?? null;

  const [marksInput, setMarksInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradeError, setGradeError] = useState<string>('');

  // Create assignment modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const defaultTa = teacherAssignments[0];
  const defaultClassId = defaultTa?.classId ?? classes[0]?.id ?? '';
  const defaultSecId =
    defaultTa?.sectionId ??
    sections.find((s) => s.classId === defaultClassId)?.id ??
    '';

  const [form, setForm] = useState({
    title: '',
    description: '',
    fullMarks: '20',
    dueDate: '2026-12-10',
    classId: defaultClassId,
    sectionId: defaultSecId,
    subjectId: defaultTa?.subjectId ?? '',
  });

  const allowedClassIds = useMemo(
    () => new Set(teacherAssignments.map((a) => a.classId)),
    [teacherAssignments]
  );
  const availableClasses = classes.filter((c) => allowedClassIds.has(c.id));

  const availableSections = useMemo(() => {
    const clsSecs = sections.filter((s) => s.classId === form.classId);
    const tas = teacherAssignments.filter((a) => a.classId === form.classId);
    if (tas.some((a) => a.sectionId === null)) return clsSecs;
    const secSet = new Set(tas.map((a) => a.sectionId));
    return clsSecs.filter((s) => secSet.has(s.id));
  }, [sections, teacherAssignments, form.classId]);

  const availableSubjects = useMemo(() => {
    const allowedSubIds = new Set(
      teacherAssignments
        .filter(
          (a) =>
            a.classId === form.classId &&
            (a.sectionId === null || a.sectionId === form.sectionId)
        )
        .map((a) => a.subjectId)
    );
    return subjects.filter((s) => s.classId === form.classId && allowedSubIds.has(s.id));
  }, [subjects, teacherAssignments, form.classId, form.sectionId]);

  const handleSelectSubmission = (subId: string) => {
    setSelectedSubId(subId);
    const found = submissions.find((s) => s.id === subId);
    setMarksInput(found?.marks !== null && found?.marks !== undefined ? String(found.marks) : '');
    setFeedbackInput(found?.feedback ?? '');
    setGradeError('');
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createAssignment({
      title: form.title,
      description: form.description,
      fullMarks: Number(form.fullMarks),
      dueDate: form.dueDate,
      classId: form.classId,
      sectionId: form.sectionId,
      subjectId: form.subjectId || null,
    });
    if (!res.ok) {
      setCreateError(res.error ?? 'অ্যাসাইনমেন্ট তৈরি ব্যর্থ হয়েছে।');
      return;
    }
    setCreateError('');
    setCreateOpen(false);
    setForm((p) => ({ ...p, title: '', description: '' }));
    showToast('নতুন অ্যাসাইনমেন্ট প্রকাশিত হয়েছে', 'success');
  };

  const handleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;
    const num = Number(marksInput);
    if (marksInput === '' || Number.isNaN(num)) {
      setGradeError('সঠিক নম্বর লিখুন।');
      return;
    }
    const res = gradeSubmission(activeSubmission.id, num, feedbackInput);
    if (!res.ok) {
      setGradeError(res.error ?? 'মূল্যায়ন সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setGradeError('');
    showToast('অ্যাসাইনমেন্ট মূল্যায়ন সম্পন্ন হয়েছে', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
            অ্যাসাইনমেন্ট ও হোমওয়ার্ক মূল্যায়ন
          </h2>
          <p className="text-sm text-[#5D6785] dark:text-[#98A2C7]">
            নতুন অ্যাসাইনমেন্ট তৈরি করুন এবং শিক্ষার্থীদের জমাকৃত উত্তরপত্র মূল্যায়ন করুন।
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setCreateError('');
            setCreateOpen(true);
          }}
        >
          নতুন অ্যাসাইনমেন্ট
        </Button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="কোনো অ্যাসাইনমেন্ট নেই"
          description="উপরের 'নতুন অ্যাসাইনমেন্ট' বাটনে ক্লিক করে প্রথম হোমওয়ার্ক তৈরি করুন।"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Assignment List */}
          <div className="lg:col-span-5 space-y-3">
            {assignments.map((asg) => {
              const cls = classes.find((c) => c.id === asg.classId);
              const sec = sections.find((s) => s.id === asg.sectionId);
              const sub = subjects.find((s) => s.id === asg.subjectId);
              const subCount = repo.getSubmissions(asg.id).length;
              const isSelected = activeAssignment?.id === asg.id;

              return (
                <button
                  key={asg.id}
                  type="button"
                  onClick={() => {
                    setSelectedAssignmentId(asg.id);
                    const nextSubs = repo.getSubmissions(asg.id);
                    const first = nextSubs[0];
                    setSelectedSubId(first?.id ?? '');
                    setMarksInput(
                      first?.marks !== null && first?.marks !== undefined ? String(first.marks) : ''
                    );
                    setFeedbackInput(first?.feedback ?? '');
                    setGradeError('');
                  }}
                  className={`w-full text-left rounded-[16px] border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-[#141B34] border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-sm'
                      : 'bg-white dark:bg-[#141B34] border-[#E2E6F3] dark:border-[#262F52] hover:border-[#4F46E5]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC]">
                        {cls?.name ?? ''} ({sec?.name ?? ''}) {sub ? `· ${sub.name}` : ''}
                      </span>
                    </div>
                    <Pill variant="warning">
                      শেষ তারিখ: {formatNumeral(asg.dueDate, numeralLocale)}
                    </Pill>
                  </div>
                  <h3 className="font-bold text-sm text-[#111936] dark:text-[#E8ECFB] mt-2">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] line-clamp-2 mt-1">
                    {asg.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                    <span>পূর্ণমান: {formatNumeral(asg.fullMarks, numeralLocale)}</span>
                    <span>জমা পড়েছে: {formatNumeral(subCount, numeralLocale)}টি</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Panel: Submissions & Grading */}
          <Card className="lg:col-span-7 space-y-5">
            {activeAssignment && (
              <>
                <div className="border-b border-[#E2E6F3] dark:border-[#262F52] pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                      {activeAssignment.title}
                    </h3>
                    <Pill variant="info">
                      পূর্ণমান: {formatNumeral(activeAssignment.fullMarks, numeralLocale)}
                    </Pill>
                  </div>
                  <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] mt-1">
                    {activeAssignment.description}
                  </p>
                </div>

                {submissions.length === 0 ? (
                  <EmptyState
                    title="এখনো কোনো উত্তরপত্র জমা হয়নি"
                    description="শিক্ষার্থীরা অ্যাসাইনমেন্ট জমা দিলে এখানে তালিকা দেখা যাবে।"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#5D6785] dark:text-[#98A2C7]">
                        জমাকৃত উত্তরপত্র ({formatNumeral(submissions.length, numeralLocale)})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {submissions.map((sub) => {
                          const st = allStudents.find((x) => x.id === sub.studentId);
                          const isCurrent = activeSubmission?.id === sub.id;
                          const isGraded = sub.marks !== null;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectSubmission(sub.id)}
                              className={`px-3 py-2 rounded-[12px] border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                                isCurrent
                                  ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#A5B4FC]'
                                  : 'border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC] dark:bg-[#0B1020]'
                              }`}
                            >
                              {isGraded ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                              )}
                              <span>
                                রোল {st ? formatNumeral(st.roll, numeralLocale) : '?'} ·{' '}
                                {st?.name ?? sub.studentId}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeSubmission && (
                      <form
                        onSubmit={handleGrade}
                        className="rounded-[14px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020] p-4 space-y-4"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#5D6785] dark:text-[#98A2C7] mb-1">
                            শিক্ষার্থীর উত্তর
                          </p>
                          <div className="rounded-[10px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] p-3 text-sm text-[#111936] dark:text-[#E8ECFB] whitespace-pre-wrap">
                            {activeSubmission.answerText}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Input
                            label={`প্রাপ্ত নম্বর (সর্বোচ্চ ${formatNumeral(
                              activeAssignment.fullMarks,
                              numeralLocale
                            )})`}
                            type="number"
                            min={0}
                            max={activeAssignment.fullMarks}
                            value={marksInput}
                            onChange={(e) => setMarksInput(e.target.value)}
                            required
                          />
                          <div className="sm:col-span-2">
                            <Textarea
                              label="শিক্ষকের মন্তব্য"
                              rows={2}
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              placeholder="চমৎকার উপস্থাপন বা উন্নতির পরামর্শ লিখুন..."
                            />
                          </div>
                        </div>

                        {gradeError && (
                          <p className="text-xs font-medium text-[#DC2626]" role="alert">
                            {gradeError}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                            জমার সময়: {formatNumeral(activeSubmission.submittedAt.slice(0, 10), numeralLocale)}
                          </span>
                          <Button type="submit">মূল্যায়ন করুন</Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* New Assignment Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="নতুন অ্যাসাইনমেন্ট তৈরি করুন"
        size="md"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="শ্রেণি"
              value={form.classId}
              onChange={(e) => {
                const nextCls = e.target.value;
                const nextSec = sections.find((s) => s.classId === nextCls)?.id ?? '';
                setForm((p) => ({ ...p, classId: nextCls, sectionId: nextSec }));
              }}
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="শাখা"
              value={form.sectionId}
              onChange={(e) => setForm((p) => ({ ...p, sectionId: e.target.value }))}
            >
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="বিষয়"
              value={form.subjectId}
              onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
            >
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="অ্যাসাইনমেন্টের শিরোনাম"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="যেমন: অধ্যায় ৩ অনুশীলন ও সারসংক্ষেপ"
            required
          />

          <Textarea
            label="নির্দেশনা ও বিবরণ"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="শিক্ষার্থীদের কী করতে হবে তা পরিষ্কারভাবে লিখুন..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="পূর্ণমান"
              type="number"
              min={1}
              max={100}
              value={form.fullMarks}
              onChange={(e) => setForm((p) => ({ ...p, fullMarks: e.target.value }))}
              required
            />
            <Input
              label="জমা দেওয়ার শেষ তারিখ"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              required
            />
          </div>

          {createError && (
            <p className="text-xs font-medium text-[#DC2626]" role="alert">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit">প্রকাশ করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
