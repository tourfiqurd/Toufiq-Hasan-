import React, { useState } from 'react';
import { CheckSquare, FileSpreadsheet } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Select } from '../../../components/ui/FormControls';
import { Pill } from '../../../components/ui/Pill';

interface ResultApprovalPageProps {
  onOpenTabulation: () => void;
}

export const ResultApprovalPage: React.FC<ResultApprovalPageProps> = ({ onOpenTabulation }) => {
  const { repo, numeralLocale, approveSubjectMarks, toggleSectionPublication, showToast } =
    useApp();
  if (!repo) return null;

  const exams = repo.getExams();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();

  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const activeExam = exams.find((e) => e.id === examId) ?? exams[0];

  if (!activeExam) {
    return (
      <EmptyState
        title="কোনো পরীক্ষা নেই"
        description="ফলাফল অনুমোদনের জন্য প্রথমে একটি পরীক্ষা তৈরি করুন।"
      />
    );
  }

  const rules = repo.getExamRules(activeExam.id);
  const marks = repo.getMarks(activeExam.id);
  const examSections = sections.filter(
    (s) =>
      s.classId === activeExam.defaultClassId &&
      (!activeExam.sectionId || s.id === activeExam.sectionId)
  );
  const activeClass = classes.find((c) => c.id === activeExam.defaultClassId);

  return (
    <div className="space-y-6">
      <Card className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="w-full md:w-80">
          <Select
            label="পরীক্ষা নির্বাচন করুন"
            value={activeExam.id}
            onChange={(e) => setExamId(e.target.value)}
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </Select>
        </div>

        <Button
          leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          onClick={onOpenTabulation}
        >
          ট্যাবুলেশন শিট খুলুন
        </Button>
      </Card>

      {/* Section Publication Controls */}
      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
          শাখাভিত্তিক ফলাফল প্রকাশ ({activeClass?.name ?? ''})
        </h2>
        <div className="flex flex-wrap gap-3">
          {examSections.map((sec) => {
            const published = repo.isSectionPublished(activeExam.id, sec.id);
            return (
              <div
                key={sec.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52]"
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
                      !published
                        ? `${sec.name} শাখার ফলাফল প্রকাশিত হয়েছে`
                        : `${sec.name} শাখার ফলাফল অপ্রকাশিত করা হয়েছে`,
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
      </Card>

      {/* Subject Approval Matrix */}
      <div className="w-full overflow-x-auto rounded-[16px] border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#4F46E5]/[0.08] dark:bg-[#4F46E5]/[0.16] border-b border-[#E2E6F3] dark:border-[#262F52] text-xs font-bold">
              <th className="px-4 py-3">বিষয়</th>
              <th className="px-4 py-3 text-center">মোট নম্বর এন্ট্রি</th>
              <th className="px-4 py-3 text-center">ড্রাফট</th>
              <th className="px-4 py-3 text-center">জমা হয়েছে</th>
              <th className="px-4 py-3 text-center">অনুমোদিত</th>
              <th className="px-4 py-3 text-right">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52] text-sm">
            {rules.map((r) => {
              const sub = subjects.find((s) => s.id === r.subjectId);
              if (!sub) return null;
              const subMarks = marks.filter((m) => m.subjectId === sub.id);
              const draftCount = subMarks.filter((m) => m.status === 'draft').length;
              const submittedCount = subMarks.filter((m) => m.status === 'submitted').length;
              const approvedCount = subMarks.filter((m) => m.status === 'approved').length;

              return (
                <tr key={r.id} className="hover:bg-[#4F46E5]/[0.03]">
                  <td className="px-4 py-3 font-bold">
                    {sub.name}{' '}
                    <span className="text-xs font-normal text-[#5D6785]">
                      ({formatNumeral(sub.code, numeralLocale)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {formatNumeral(subMarks.length, numeralLocale)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    <Pill variant="warning">{formatNumeral(draftCount, numeralLocale)}</Pill>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    <Pill variant="info">{formatNumeral(submittedCount, numeralLocale)}</Pill>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    <Pill variant="success">{formatNumeral(approvedCount, numeralLocale)}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                      disabled={subMarks.length === 0 || approvedCount === subMarks.length}
                      onClick={() => {
                        approveSubjectMarks(activeExam.id, sub.id);
                        showToast(`${sub.name} বিষয়ের নম্বর অনুমোদিত হয়েছে`, 'success');
                      }}
                    >
                      অনুমোদন করুন
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
