import React, { useMemo, useState } from 'react';
import { BookOpen, PenTool, Plus, Search, Users } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';
import type { Student } from '../../../types/domain';

interface TeacherClassesPageProps {
  onNavigateToMarks?: () => void;
}

interface AssignmentCardItem {
  key: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  studentCount: number;
  submittedCount: number;
  percent: number;
}

export const TeacherClassesPage: React.FC<TeacherClassesPageProps> = ({
  onNavigateToMarks,
}) => {
  const { db, repo, numeralLocale, saveStudent, showToast } = useApp();
  if (!repo) return null;

  const assignments = repo.getTeacherAssignments();
  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const exams = repo.getExams();
  const activeExam = exams[exams.length - 1] ?? exams[0];

  const cards: AssignmentCardItem[] = useMemo(() => {
    const items: AssignmentCardItem[] = [];
    for (const ta of assignments) {
      const cls = classes.find((c) => c.id === ta.classId);
      const sub = subjects.find((s) => s.id === ta.subjectId);
      if (!cls || !sub) continue;

      const targetSections = ta.sectionId
        ? sections.filter((s) => s.id === ta.sectionId)
        : sections.filter((s) => s.classId === ta.classId);

      for (const sec of targetSections) {
        const key = `${cls.id}:${sec.id}:${sub.id}`;
        if (items.some((x) => x.key === key)) continue;
        const secStudents = repo.getStudents(cls.id, sec.id);
        const marks = activeExam ? repo.getMarks(activeExam.id, sub.id, sec.id) : [];
        const submittedCount = marks.filter(
          (m) => m.status === 'submitted' || m.status === 'approved'
        ).length;
        const percent =
          secStudents.length > 0
            ? Math.min(100, Math.round((submittedCount / secStudents.length) * 100))
            : 0;

        items.push({
          key,
          classId: cls.id,
          className: cls.name,
          sectionId: sec.id,
          sectionName: sec.name,
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          studentCount: secStudents.length,
          submittedCount,
          percent,
        });
      }
    }
    return items;
  }, [assignments, classes, sections, subjects, repo, activeExam]);

  const [selectedKey, setSelectedKey] = useState<string>(cards[0]?.key ?? '');
  const selectedCard = cards.find((c) => c.key === selectedKey) ?? cards[0] ?? null;
  const [search, setSearch] = useState('');

  // Scoped Add Student modal
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [studentForm, setStudentForm] = useState({
    name: '',
    roll: '',
    studentCode: '',
    gender: 'male' as 'male' | 'female' | 'other',
    dob: '2011-05-10',
    fatherName: '',
    motherName: '',
    guardianPhone: '',
    address: 'ঢাকা',
    fourthSubjectId: '',
    email: '',
    password: 'student123',
  });

  const scopedStudents = useMemo(() => {
    if (!selectedCard) return [];
    const list = repo.getStudents(selectedCard.classId, selectedCard.sectionId);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        String(s.roll).includes(q)
    );
  }, [repo, selectedCard, search]);

  const fourthSubjects = selectedCard
    ? subjects.filter(
        (s) =>
          s.classId === selectedCard.classId &&
          s.isFourth &&
          (!s.sectionId || s.sectionId === selectedCard.sectionId)
      )
    : [];

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    const res = saveStudent({
      name: studentForm.name,
      roll: Number(studentForm.roll),
      studentCode: studentForm.studentCode,
      classId: selectedCard.classId,
      sectionId: selectedCard.sectionId,
      gender: studentForm.gender,
      dob: studentForm.dob,
      fatherName: studentForm.fatherName,
      motherName: studentForm.motherName,
      guardianPhone: studentForm.guardianPhone,
      address: studentForm.address,
      fourthSubjectId: studentForm.fourthSubjectId || null,
      email: studentForm.email,
      password: studentForm.password,
    });
    if (!res.ok) {
      setFormError(res.error ?? 'সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setFormError('');
    setAddOpen(false);
    setStudentForm({
      name: '',
      roll: '',
      studentCode: '',
      gender: 'male',
      dob: '2011-05-10',
      fatherName: '',
      motherName: '',
      guardianPhone: '',
      address: 'ঢাকা',
      fourthSubjectId: '',
      email: '',
      password: 'student123',
    });
    showToast('নতুন শিক্ষার্থী যুক্ত করা হয়েছে', 'success');
  };

  const columns: Column<Student>[] = [
    {
      key: 'roll',
      header: 'রোল',
      render: (s) => (
        <span className="font-bold tabular-nums">{formatNumeral(s.roll, numeralLocale)}</span>
      ),
    },
    {
      key: 'name',
      header: 'শিক্ষার্থীর নাম',
      render: (s) => {
        const studentEmail = db.users.find((u) => u.id === s.userId)?.email ?? '—';
        return (
          <div>
            <p className="font-semibold text-[#111936] dark:text-[#E8ECFB]">{s.name}</p>
            <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{studentEmail}</p>
          </div>
        );
      },
    },
    {
      key: 'code',
      header: 'শিক্ষার্থী আইডি',
      render: (s) => <span className="tabular-nums font-medium">{s.studentCode}</span>,
    },
    {
      key: 'fourth',
      header: '৪র্থ বিষয়',
      render: (s) => {
        const fSub = subjects.find((x) => x.id === s.fourthSubjectId);
        return fSub ? (
          <Pill variant="info">{fSub.name}</Pill>
        ) : (
          <span className="text-xs text-[#5D6785] dark:text-[#98A2C7]">প্রযোজ্য নয়</span>
        );
      },
    },
    {
      key: 'phone',
      header: 'অভিভাবকের ফোন',
      render: (s) => (
        <span className="tabular-nums">{formatNumeral(s.guardianPhone, numeralLocale)}</span>
      ),
    },
  ];

  if (cards.length === 0) {
    return (
      <EmptyState
        title="কোনো শ্রেণি বা বিষয় বরাদ্দ নেই"
        description="অধ্যক্ষ এখনো আপনার জন্য কোনো শ্রেণি, শাখা ও বিষয় বরাদ্দ করেননি।"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Assigned Class + Section + Subject Cards with Teal SVG Progress Ring */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
              আপনার বরাদ্দকৃত শ্রেণি ও বিষয়সমূহ
            </h2>
            <p className="text-sm text-[#5D6785] dark:text-[#98A2C7]">
              {activeExam
                ? `সক্রিয় পরীক্ষা (${activeExam.name})-এ নম্বর জমার অগ্রগতি`
                : 'কার্ডে ক্লিক করে সংশ্লিষ্ট শাখার শিক্ষার্থী তালিকা দেখুন'}
            </p>
          </div>
          {onNavigateToMarks && (
            <Button
              size="sm"
              leftIcon={<PenTool className="w-4 h-4" />}
              onClick={onNavigateToMarks}
            >
              নম্বর এন্ট্রি পেজে যান
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const active = selectedCard?.key === card.key;
            const radius = 22;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (card.percent / 100) * circumference;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setSelectedKey(card.key)}
                className={`text-left rounded-[16px] border p-5 transition-all cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#141B34] border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-md'
                    : 'bg-white dark:bg-[#141B34] border-[#E2E6F3] dark:border-[#262F52] hover:-translate-y-0.5 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] bg-brand-gradient text-white shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <Pill variant={active ? 'info' : 'neutral'}>
                        {card.className} · {card.sectionName}
                      </Pill>
                    </div>
                    <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB] pt-1 truncate">
                      {card.subjectName}
                    </h3>
                    <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                      কোড: {formatNumeral(card.subjectCode, numeralLocale)} · শিক্ষার্থী:{' '}
                      {formatNumeral(card.studentCount, numeralLocale)} জন
                    </p>
                  </div>

                  {/* Teal SVG Progress Ring */}
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        className="text-[#E2E6F3] dark:text-[#262F52]"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        fill="none"
                        stroke="#14B8A6"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <span className="absolute text-[11px] font-bold tabular-nums text-[#111936] dark:text-[#E8ECFB]">
                      {formatNumeral(card.percent, numeralLocale)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E2E6F3] dark:border-[#262F52] flex items-center justify-between text-xs text-[#5D6785] dark:text-[#98A2C7]">
                  <span className="tabular-nums">
                    নম্বর জমা: {formatNumeral(card.submittedCount, numeralLocale)} /{' '}
                    {formatNumeral(card.studentCount, numeralLocale)}
                  </span>
                  <span className="font-semibold text-[#4F46E5] dark:text-[#A5B4FC]">
                    তালিকা দেখুন
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Class Student List */}
      {selectedCard && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#4F46E5]" />
              <div>
                <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                  {selectedCard.className} ({selectedCard.sectionName}) — শিক্ষার্থী তালিকা
                </h3>
                <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
                  মোট {formatNumeral(scopedStudents.length, numeralLocale)} জন শিক্ষার্থী
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-60">
                <Search
                  className="w-4 h-4 text-[#5D6785] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="নাম, রোল বা আইডি খুঁজুন..."
                  aria-label="শিক্ষার্থী খুঁজুন"
                  className="w-full rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC] dark:bg-[#0B1020] pl-9 pr-3 py-2 text-sm text-[#111936] dark:text-[#E8ECFB]"
                />
              </div>

              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setFormError('');
                  setAddOpen(true);
                }}
              >
                + শিক্ষার্থী যোগ করুন
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={scopedStudents}
            rowKey={(s) => s.id}
            emptyState={
              <EmptyState
                title="কোনো শিক্ষার্থী পাওয়া যায়নি"
                description="এই শাখায় কোনো শিক্ষার্থী পাওয়া যায়নি।"
              />
            }
          />
        </Card>
      )}

      {/* Teacher-Scoped Add Student Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="নতুন শিক্ষার্থী যোগ করুন"
        subtitle={
          selectedCard
            ? `শ্রেণি: ${selectedCard.className} · শাখা: ${selectedCard.sectionName}`
            : ''
        }
        size="lg"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="শিক্ষার্থীর নাম"
              value={studentForm.name}
              onChange={(e) => setStudentForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="যেমন: তানভীর হাসান"
              required
            />
            <Input
              label="রোল নম্বর"
              type="number"
              value={studentForm.roll}
              onChange={(e) => setStudentForm((p) => ({ ...p, roll: e.target.value }))}
              placeholder="যেমন: ১১"
              required
            />
            <Input
              label="শিক্ষার্থী আইডি"
              value={studentForm.studentCode}
              onChange={(e) => setStudentForm((p) => ({ ...p, studentCode: e.target.value }))}
              placeholder="যেমন: ST-2026-99"
              required
            />
            <Select
              label="লিঙ্গ"
              value={studentForm.gender}
              onChange={(e) =>
                setStudentForm((p) => ({
                  ...p,
                  gender: e.target.value as 'male' | 'female' | 'other',
                }))
              }
            >
              <option value="male">ছাত্র</option>
              <option value="female">ছাত্রী</option>
              <option value="other">অন্যান্য</option>
            </Select>
            <Input
              label="পিতার নাম"
              value={studentForm.fatherName}
              onChange={(e) => setStudentForm((p) => ({ ...p, fatherName: e.target.value }))}
              required
            />
            <Input
              label="মাতার নাম"
              value={studentForm.motherName}
              onChange={(e) => setStudentForm((p) => ({ ...p, motherName: e.target.value }))}
              required
            />
            <Input
              label="অভিভাবকের মোবাইল"
              value={studentForm.guardianPhone}
              onChange={(e) => setStudentForm((p) => ({ ...p, guardianPhone: e.target.value }))}
              placeholder="017XXXXXXXX"
              required
            />
            <Input
              label="লগইন ইমেইল"
              type="email"
              value={studentForm.email}
              onChange={(e) => setStudentForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="student@adarsha.edu.bd"
              required
            />
            {fourthSubjects.length > 0 && (
              <Select
                label="৪র্থ বিষয় (ঐচ্ছিক)"
                value={studentForm.fourthSubjectId}
                onChange={(e) =>
                  setStudentForm((p) => ({ ...p, fourthSubjectId: e.target.value }))
                }
              >
                <option value="">নির্বাচন করুন</option>
                {fourthSubjects.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {formError && (
            <p className="text-sm font-medium text-[#DC2626]" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit">শিক্ষার্থী সংরক্ষণ করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
