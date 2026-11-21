import React, { useState } from 'react';
import { CheckCircle2, Clock, Paperclip, Send, User as UserIcon } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Textarea } from '../../../components/ui/FormControls';
import { Pill } from '../../../components/ui/Pill';

export const StudentAssignmentsPage: React.FC = () => {
  const { user, repo, numeralLocale, submitStudentAssignment, showToast } = useApp();
  if (!repo || !user) return null;

  const students = repo.getStudents();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const allAssignments = repo.getAssignments();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? '');
  const activeStudent = students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;

  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  if (!activeStudent) {
    return (
      <EmptyState
        title="শিক্ষার্থীর তথ্য পাওয়া যায়নি"
        description="এই অ্যাকাউন্টের সাথে কোনো শিক্ষার্থী সংযুক্ত নেই।"
      />
    );
  }

  const scopedAssignments = allAssignments.filter(
    (a) => a.classId === activeStudent.classId && a.sectionId === activeStudent.sectionId
  );

  const isParent = user.role === 'parent';

  const handleOpenEditor = (assignmentId: string, existingAnswer: string) => {
    setOpenEditorId((prev) => (prev === assignmentId ? null : assignmentId));
    setAnswerDrafts((p) => ({
      ...p,
      [assignmentId]: p[assignmentId] ?? existingAnswer,
    }));
    setSubmitError('');
  };

  const handleSubmit = (assignmentId: string) => {
    const text = answerDrafts[assignmentId] ?? '';
    const res = submitStudentAssignment(assignmentId, activeStudent.id, text);
    if (!res.ok) {
      setSubmitError(res.error ?? 'জমা দেওয়া যায়নি।');
      return;
    }
    setSubmitError('');
    setOpenEditorId(null);
    showToast('অ্যাসাইনমেন্ট সফলভাবে জমা হয়েছে', 'success');
  };

  return (
    <div className="space-y-5">
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
                  onClick={() => setSelectedStudentId(child.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'bg-[#F4F6FC] dark:bg-[#0B1020] text-[#5D6785] dark:text-[#98A2C7]'
                  }`}
                >
                  {child.name} ({cls?.name ?? ''} · {sec?.name ?? ''})
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
          {isParent ? 'সন্তানের অ্যাসাইনমেন্ট ও মূল্যায়ন' : 'আমার অ্যাসাইনমেন্ট ও হোমওয়ার্ক'}
        </h2>
        <p className="text-sm text-[#5D6785] dark:text-[#98A2C7]">
          নির্ধারিত তারিখের মধ্যে উত্তর লিখে জমা দিন এবং শিক্ষকের মূল্যায়ন দেখুন।
        </p>
      </div>

      {scopedAssignments.length === 0 ? (
        <EmptyState
          title="কোনো অ্যাসাইনমেন্ট নেই"
          description="আপনার শ্রেণি ও শাখার জন্য এখনো কোনো অ্যাসাইনমেন্ট দেওয়া হয়নি।"
        />
      ) : (
        <div className="space-y-4">
          {scopedAssignments.map((asg) => {
            const sub = subjects.find((s) => s.id === asg.subjectId);
            const submission = repo
              .getSubmissions(asg.id)
              .find((s) => s.studentId === activeStudent.id);
            const isGraded = submission?.marks !== null && submission?.marks !== undefined;
            const editorOpen = openEditorId === asg.id;

            return (
              <Card key={asg.id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F46E5] dark:text-[#A5B4FC]">
                        <Paperclip className="w-3.5 h-3.5" />
                        {sub?.name ?? 'সাধারণ'}
                      </span>
                      <Pill variant="warning">
                        শেষ তারিখ: {formatNumeral(asg.dueDate, numeralLocale)}
                      </Pill>
                      <Pill variant="neutral">
                        পূর্ণমান: {formatNumeral(asg.fullMarks, numeralLocale)}
                      </Pill>
                    </div>
                    <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                      {asg.title}
                    </h3>
                    <p className="text-sm text-[#5D6785] dark:text-[#98A2C7]">
                      {asg.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isGraded ? (
                      <Pill variant="success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        মূল্যায়িত:{' '}
                        {formatNumeral(submission.marks ?? 0, numeralLocale)} /{' '}
                        {formatNumeral(asg.fullMarks, numeralLocale)}
                      </Pill>
                    ) : submission ? (
                      <Pill variant="info">
                        <Clock className="w-3.5 h-3.5" />
                        জমা দেওয়া হয়েছে
                      </Pill>
                    ) : (
                      <Pill variant="warning">বাকি আছে</Pill>
                    )}

                    {!isParent && !isGraded && (
                      <Button
                        size="sm"
                        variant={submission ? 'outline' : 'primary'}
                        onClick={() =>
                          handleOpenEditor(asg.id, submission?.answerText ?? '')
                        }
                      >
                        {editorOpen ? 'বন্ধ করুন' : submission ? 'উত্তর সংশোধন' : 'জমা দিন'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Submitted / Graded Summary */}
                {submission && !editorOpen && (
                  <div className="rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020] p-4 space-y-2 text-sm">
                    <p className="text-xs font-bold text-[#5D6785] dark:text-[#98A2C7]">
                      জমাকৃত উত্তর ({formatNumeral(submission.submittedAt.slice(0, 10), numeralLocale)}):
                    </p>
                    <p className="text-[#111936] dark:text-[#E8ECFB] whitespace-pre-wrap">
                      {submission.answerText}
                    </p>
                    {isGraded && (
                      <div className="pt-2 mt-2 border-t border-[#E2E6F3] dark:border-[#262F52] flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#16A34A]">
                          প্রাপ্ত নম্বর: {formatNumeral(submission.marks ?? 0, numeralLocale)} /{' '}
                          {formatNumeral(asg.fullMarks, numeralLocale)}
                        </span>
                        {submission.feedback && (
                          <span className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
                            শিক্ষকের মন্তব্য: “{submission.feedback}”
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Answer Submission Editor */}
                {editorOpen && !isParent && (
                  <div className="rounded-[12px] border border-[#4F46E5]/30 bg-[#F4F6FC]/60 dark:bg-[#0B1020] p-4 space-y-3">
                    <Textarea
                      label="আপনার উত্তর লিখুন"
                      rows={4}
                      value={answerDrafts[asg.id] ?? ''}
                      onChange={(e) =>
                        setAnswerDrafts((p) => ({ ...p, [asg.id]: e.target.value }))
                      }
                      placeholder="অ্যাসাইনমেন্টের বিস্তারিত উত্তর এখানে লিখুন..."
                      error={submitError}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setOpenEditorId(null)}>
                        বাতিল
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<Send className="w-4 h-4" />}
                        onClick={() => handleSubmit(asg.id)}
                      >
                        উত্তর জমা দিন
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
