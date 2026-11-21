import React from 'react';
import {
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  PenTool,
  Users,
} from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import { Card } from '../../../components/ui/Card';
import { Pill } from '../../../components/ui/Pill';
import { StatCard } from '../../../components/ui/StatCard';

interface PrincipalOverviewProps {
  onSelectPage: (page: string) => void;
}

export const PrincipalOverview: React.FC<PrincipalOverviewProps> = ({ onSelectPage }) => {
  const { repo, numeralLocale } = useApp();
  if (!repo) return null;

  const classes = repo.getClasses();
  const sections = repo.getSections();
  const subjects = repo.getSubjects();
  const teachers = repo.getTeachers();
  const students = repo.getStudents();
  const exams = repo.getExams();
  const publications = repo.getPublications();

  const publishedExamIds = new Set(
    publications.filter((p) => p.published).map((p) => p.examId)
  );

  const quickActions = [
    {
      key: 'classes',
      title: 'শ্রেণি ও বিষয়',
      desc: 'শ্রেণি, শাখা এবং পাস নিয়ম সেট করুন',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      key: 'teachers',
      title: 'শিক্ষক বণ্টন',
      desc: 'শিক্ষক যুক্ত ও শ্রেণি-বিষয় বরাদ্দ করুন',
      icon: <Users className="w-5 h-5" />,
    },
    {
      key: 'students',
      title: 'শিক্ষার্থী ভর্তি',
      desc: 'একক ভর্তি অথবা CSV/Excel ইমপোর্ট',
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      key: 'exams',
      title: 'পরীক্ষা তৈরি',
      desc: 'নম্বর বণ্টন, সমন্বয় ও প্রবেশপত্র PDF',
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
    {
      key: 'marks',
      title: 'নম্বর এন্ট্রি',
      desc: 'বিষয়ভিত্তিক নম্বর ও খসড়া সংরক্ষণ',
      icon: <PenTool className="w-5 h-5" />,
    },
    {
      key: 'approval',
      title: 'ফলাফল অনুমোদন',
      desc: 'জমাকৃত নম্বর যাচাই ও শাখা প্রকাশ',
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      key: 'tabulation',
      title: 'ট্যাবুলেশন শিট',
      desc: 'GPA, Excel এক্সপোর্ট ও মার্কশিট PDF',
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Live Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="শ্রেণি ও শাখা"
          value={classes.length}
          icon={<BookOpen className="w-5 h-5" />}
          tone="brand"
          helper={`মোট শাখা ${formatNumeral(sections.length, numeralLocale)}টি`}
        />
        <StatCard
          label="বিষয়সমূহ"
          value={subjects.length}
          icon={<ClipboardCheck className="w-5 h-5" />}
          tone="violet"
        />
        <StatCard
          label="শিক্ষার্থী"
          value={students.length}
          icon={<GraduationCap className="w-5 h-5" />}
          tone="teal"
        />
        <StatCard
          label="শিক্ষক"
          value={teachers.length}
          icon={<Users className="w-5 h-5" />}
          tone="brand"
        />
        <StatCard
          label="পরীক্ষা"
          value={exams.length}
          icon={<FileSpreadsheet className="w-5 h-5" />}
          tone="amber"
          helper={`প্রকাশিত ${formatNumeral(publishedExamIds.size, numeralLocale)}টি`}
        />
      </div>

      {/* Seven Quick Action Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">দ্রুত কার্যক্রম</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((qa) => (
            <button
              key={qa.key}
              type="button"
              onClick={() => onSelectPage(qa.key)}
              className="group text-left rounded-[16px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] p-5 card-shadow transition-all duration-300 hover:-translate-y-[5px] hover:border-[#4F46E5] cursor-pointer"
            >
              <div className="w-[46px] h-[46px] rounded-[13px] bg-brand-gradient text-white flex items-center justify-center mb-4 transition-transform duration-300 group-hover:rotate-6">
                {qa.icon}
              </div>
              <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">{qa.title}</h3>
              <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] mt-1">{qa.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Exam Progress Tracker */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">পরীক্ষার অগ্রগতি</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((ex) => {
            const rules = repo.getExamRules(ex.id);
            const marks = repo.getMarks(ex.id);
            const submittedSubjects = new Set(
              marks.filter((m) => m.status !== 'draft').map((m) => m.subjectId)
            ).size;
            const totalSubjects = rules.length || 1;
            const pct = Math.min(100, Math.round((submittedSubjects / totalSubjects) * 100));
            const isPublished = publishedExamIds.has(ex.id);

            return (
              <Card key={ex.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                      জমা সম্পন্ন: {formatNumeral(submittedSubjects, numeralLocale)} /{' '}
                      {formatNumeral(totalSubjects, numeralLocale)} বিষয় (
                      {formatNumeral(pct, numeralLocale)}%)
                    </p>
                  </div>
                  <Pill variant={isPublished ? 'success' : 'warning'}>
                    {isPublished ? 'প্রকাশিত' : 'চলমান'}
                  </Pill>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#E2E6F3] dark:bg-[#262F52] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};
