import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Trash2, Wand2 } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { calculateThirtyThreePercent } from '../../../lib/grading/scale';
import type { PassRuleType } from '../../../lib/grading/types';
import { useApp } from '../../../store/AppContext';
import type { ClassRoom, Subject } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

export const ClassesSubjectsPage: React.FC = () => {
  const {
    repo,
    numeralLocale,
    saveClass,
    deleteClass,
    addSection,
    deleteSection,
    saveSubject,
    deleteSubject,
    showToast,
  } = useApp();

  const classes = repo?.getClasses() ?? [];
  const allSections = repo?.getSections() ?? [];
  const teachers = repo?.getTeachers() ?? [];
  const allSubjects = repo?.getSubjects() ?? [];

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Class modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classTeacherId, setClassTeacherId] = useState<string>('');
  const [newSectionInput, setNewSectionInput] = useState<Record<string, string>>({});

  // Subject modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subForm, setSubForm] = useState({
    name: '',
    code: '',
    classId: classes[0]?.id ?? '',
    sectionId: '' as string,
    isFourth: false,
    passRule: 'separate' as PassRuleType,
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
  });
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassRoom | null>(null);

  const activeClassId = classes.some((c) => c.id === selectedClassId)
    ? selectedClassId
    : classes[0]?.id ?? '';

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      if (activeClassId && s.classId !== activeClassId) return false;
      if (sectionFilter !== 'all' && s.sectionId !== null && s.sectionId !== sectionFilter) {
        return false;
      }
      return true;
    });
  }, [allSubjects, activeClassId, sectionFilter]);

  const classSections = allSections.filter((s) => s.classId === activeClassId);

  const openNewClass = () => {
    setEditingClass(null);
    setClassName('');
    setClassCode('');
    setClassTeacherId('');
    setClassModalOpen(true);
  };

  const openEditClass = (cls: ClassRoom) => {
    setEditingClass(cls);
    setClassName(cls.name);
    setClassCode(cls.code);
    setClassTeacherId(cls.classTeacherId ?? '');
    setClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveClass({
      id: editingClass?.id,
      name: className,
      code: classCode,
      classTeacherId: classTeacherId || null,
    });
    if (!res.ok) {
      showToast(res.error ?? 'সংরক্ষণ করা যায়নি', 'danger');
      return;
    }
    if (res.data) setSelectedClassId(res.data.id);
    setClassModalOpen(false);
    showToast('শ্রেণি সংরক্ষিত হয়েছে', 'success');
  };

  const openNewSubject = () => {
    setEditingSubject(null);
    setSubForm({
      name: '',
      code: '',
      classId: activeClassId,
      sectionId: '',
      isFourth: false,
      passRule: 'separate',
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
    });
    setSubjectModalOpen(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubForm({
      name: s.name,
      code: s.code,
      classId: s.classId,
      sectionId: s.sectionId ?? '',
      isFourth: s.isFourth,
      passRule: s.passRule,
      hasCq: s.hasCq,
      cqFull: s.cqFull,
      cqPass: s.cqPass,
      hasMcq: s.hasMcq,
      mcqFull: s.mcqFull,
      mcqPass: s.mcqPass,
      hasPractical: s.hasPractical,
      practicalFull: s.practicalFull,
      practicalPass: s.practicalPass,
      totalFull: s.totalFull,
      totalPass: s.totalPass,
    });
    setSubjectModalOpen(true);
  };

  const handleAuto33 = () => {
    const totalFull =
      (subForm.hasCq ? subForm.cqFull : 0) +
      (subForm.hasMcq ? subForm.mcqFull : 0) +
      (subForm.hasPractical ? subForm.practicalFull : 0);
    setSubForm((p) => ({
      ...p,
      cqPass: p.hasCq ? calculateThirtyThreePercent(p.cqFull) : 0,
      mcqPass: p.hasMcq ? calculateThirtyThreePercent(p.mcqFull) : 0,
      practicalPass: p.hasPractical ? calculateThirtyThreePercent(p.practicalFull) : 0,
      totalFull,
      totalPass: calculateThirtyThreePercent(totalFull),
    }));
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const totalFull =
      (subForm.hasCq ? subForm.cqFull : 0) +
      (subForm.hasMcq ? subForm.mcqFull : 0) +
      (subForm.hasPractical ? subForm.practicalFull : 0);

    const res = saveSubject({
      id: editingSubject?.id,
      classId: subForm.classId,
      sectionId: subForm.sectionId || null,
      name: subForm.name,
      code: subForm.code,
      isFourth: subForm.isFourth,
      passRule: subForm.passRule,
      hasCq: subForm.hasCq,
      cqFull: subForm.hasCq ? subForm.cqFull : 0,
      cqPass: subForm.passRule === 'separate' && subForm.hasCq ? subForm.cqPass : 0,
      hasMcq: subForm.hasMcq,
      mcqFull: subForm.hasMcq ? subForm.mcqFull : 0,
      mcqPass: subForm.passRule === 'separate' && subForm.hasMcq ? subForm.mcqPass : 0,
      hasPractical: subForm.hasPractical,
      practicalFull: subForm.hasPractical ? subForm.practicalFull : 0,
      practicalPass:
        subForm.passRule === 'separate' && subForm.hasPractical ? subForm.practicalPass : 0,
      totalFull: totalFull || subForm.totalFull,
      totalPass: subForm.totalPass,
    });
    if (!res.ok) {
      showToast(res.error ?? 'বিষয় সংরক্ষণ করা যায়নি', 'danger');
      return;
    }
    setSubjectModalOpen(false);
    showToast('বিষয় ও পাস নিয়ম সংরক্ষিত হয়েছে', 'success');
  };

  const subjectColumns: Column<Subject>[] = [
    {
      key: 'name',
      header: 'বিষয় ও কোড',
      render: (s) => (
        <div>
          <p className="font-bold">{s.name}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
            কোড: {formatNumeral(s.code, numeralLocale)}
          </p>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'শাখা',
      render: (s) => {
        const sec = allSections.find((x) => x.id === s.sectionId);
        return <span className="text-xs">{sec ? sec.name : 'সকল শাখা'}</span>;
      },
    },
    {
      key: 'type',
      header: 'ধরন',
      render: (s) => (
        <Pill variant={s.isFourth ? 'warning' : 'neutral'}>
          {s.isFourth ? '৪র্থ বিষয়' : 'আবশ্যিক'}
        </Pill>
      ),
    },
    {
      key: 'dist',
      header: 'পূর্ণমান ও পাস',
      render: (s) => (
        <div className="text-xs space-y-0.5 tabular-nums">
          <p className="font-semibold">
            মোট {formatNumeral(s.totalFull, numeralLocale)} (পাস {formatNumeral(s.totalPass, numeralLocale)})
          </p>
          <p className="text-[#5D6785] dark:text-[#98A2C7]">
            {s.passRule === 'separate' ? 'আলাদা পাস' : 'একত্রে মোট পাস'}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'কার্যক্রম',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEditSubject(s)}>
            সম্পাদনা
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              deleteSubject(s.id);
              showToast('বিষয় মুছে ফেলা হয়েছে', 'success');
            }}
          >
            মুছুন
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Panel: Classes & Sections */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">শ্রেণি ও শাখা</h2>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNewClass}>
            নতুন শ্রেণি
          </Button>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            title="কোনো শ্রেণি নেই"
            description="এই শিক্ষাবর্ষে প্রথমে একটি শ্রেণি যোগ করুন।"
          />
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => {
              const clsSecs = allSections.filter((s) => s.classId === cls.id);
              const ct = teachers.find((t) => t.id === cls.classTeacherId);
              const isSelected = cls.id === activeClassId;

              return (
                <Card
                  key={cls.id}
                  padding="sm"
                  className={`space-y-3 cursor-pointer ${
                    isSelected ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/15' : ''
                  }`}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSectionFilter('all');
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                        কোড: {formatNumeral(cls.code, numeralLocale)} · শ্রেণি শিক্ষক: {ct?.name ?? 'নির্ধারিত নয়'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditClass(cls)}
                        aria-label={`${cls.name} সম্পাদনা`}
                        className="p-1.5 rounded-lg text-[#5D6785] hover:text-[#4F46E5] hover:bg-[#4F46E5]/10 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteClassTarget(cls)}
                        aria-label={`${cls.name} মুছুন`}
                        className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section Chips */}
                  <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {clsSecs.map((sec) => (
                      <span
                        key={sec.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 text-[#4338CA] dark:text-[#A5B4FC] px-2.5 py-0.5 text-xs font-semibold"
                      >
                        <span>{sec.name}</span>
                        <button
                          type="button"
                          aria-label={`${sec.name} শাখা মুছুন`}
                          onClick={() => deleteSection(sec.id)}
                          className="hover:text-[#DC2626] cursor-pointer ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newSectionInput[cls.id] ?? ''}
                        onChange={(e) =>
                          setNewSectionInput((p) => ({ ...p, [cls.id]: e.target.value }))
                        }
                        placeholder="+ শাখা"
                        aria-label={`${cls.name} নতুন শাখা`}
                        className="w-24 rounded-full border border-dashed border-[#4F46E5]/45 bg-transparent px-2.5 py-0.5 text-xs focus:outline-none focus:border-[#4F46E5]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newSectionInput[cls.id] ?? '';
                            const res = addSection(cls.id, val);
                            if (res.ok) {
                              setNewSectionInput((p) => ({ ...p, [cls.id]: '' }));
                              showToast('শাখা যুক্ত হয়েছে', 'success');
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel: Subjects Table */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">বিষয়সমূহ</h2>
            <select
              aria-label="শাখা ফিল্টার"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34] px-3 py-1.5 text-xs font-semibold"
            >
              <option value="all">সকল শাখা</option>
              {classSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openNewSubject}
            disabled={!activeClassId}
          >
            নতুন বিষয় যোগ করুন
          </Button>
        </div>

        <DataTable
          columns={subjectColumns}
          data={filteredSubjects}
          rowKey={(s) => s.id}
          emptyState={
            <EmptyState
              title="এই শ্রেণিতে কোনো বিষয় নেই"
              description="উপরে 'নতুন বিষয় যোগ করুন' বাটনে ক্লিক করে বিষয় যুক্ত করুন।"
            />
          }
        />
      </div>

      {/* Class Modal */}
      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title={editingClass ? 'শ্রেণি সম্পাদনা' : 'নতুন শ্রেণি যোগ করুন'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClassModalOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit" form="class-form">
              সংরক্ষণ করুন
            </Button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSaveClass} className="space-y-4">
          <Input
            label="শ্রেণির নাম"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="যেমন: অষ্টম শ্রেণি"
          />
          <Input
            label="শ্রেণি কোড"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="যেমন: 08"
          />
          <Select
            label="শ্রেণি শিক্ষক"
            value={classTeacherId}
            onChange={(e) => setClassTeacherId(e.target.value)}
          >
            <option value="">নির্বাচন করুন (ঐচ্ছিক)</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Subject & Pass Rule Modal */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'বিষয় সম্পাদনা' : 'নতুন বিষয় ও পাস নিয়ম'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubjectModalOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit" form="subject-form">
              বিষয় সংরক্ষণ করুন
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSaveSubject} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="বিষয়ের নাম"
              value={subForm.name}
              onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="যেমন: রসায়ন"
            />
            <Input
              label="বিষয় কোড"
              value={subForm.code}
              onChange={(e) => setSubForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="যেমন: 137"
            />
            <Select
              label="শ্রেণি"
              value={subForm.classId}
              onChange={(e) => setSubForm((p) => ({ ...p, classId: e.target.value }))}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="শাখার আওতা"
              value={subForm.sectionId}
              onChange={(e) => setSubForm((p) => ({ ...p, sectionId: e.target.value }))}
            >
              <option value="">সকল শাখা</option>
              {allSections
                .filter((s) => s.classId === subForm.classId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="radio"
                name="sub-type"
                checked={!subForm.isFourth}
                onChange={() => setSubForm((p) => ({ ...p, isFourth: false }))}
              />
              <span>আবশ্যিক বিষয়</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="radio"
                name="sub-type"
                checked={subForm.isFourth}
                onChange={() => setSubForm((p) => ({ ...p, isFourth: true }))}
              />
              <span>৪র্থ বিষয়</span>
            </label>
          </div>

          {/* Pass Rule Block */}
          <div className="space-y-3 rounded-[14px] border border-[#E2E6F3] dark:border-[#262F52] p-4 bg-[#F4F6FC]/60 dark:bg-[#0B1020]/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">পাস নিয়ম নির্ধারণ</span>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Wand2 className="w-3.5 h-3.5" />}
                onClick={handleAuto33}
              >
                ৩৩% অটো
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubForm((p) => ({ ...p, passRule: 'separate' }))}
                className={`text-left p-3 rounded-[12px] border-[1.5px] cursor-pointer ${
                  subForm.passRule === 'separate'
                    ? 'border-[#4F46E5] bg-[#4F46E5]/10'
                    : 'border-[#E2E6F3] dark:border-[#262F52]'
                }`}
              >
                <p className="text-sm font-bold">আলাদা পাস</p>
                <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
                  CQ, MCQ ও ব্যবহারিকে আলাদাভাবে পাস করতে হবে
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSubForm((p) => ({
                    ...p,
                    passRule: 'total_only',
                    cqPass: 0,
                    mcqPass: 0,
                    practicalPass: 0,
                  }))
                }
                className={`text-left p-3 rounded-[12px] border-[1.5px] cursor-pointer ${
                  subForm.passRule === 'total_only'
                    ? 'border-[#4F46E5] bg-[#4F46E5]/10'
                    : 'border-[#E2E6F3] dark:border-[#262F52]'
                }`}
              >
                <p className="text-sm font-bold">একত্রে মোট পাস</p>
                <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
                  সব অংশ মিলিয়ে মোট নম্বরে পাস (অংশিক পাস ০)
                </p>
              </button>
            </div>

            {subForm.passRule === 'separate' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-2 p-3 rounded-[10px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52]">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subForm.hasCq}
                      onChange={(e) => setSubForm((p) => ({ ...p, hasCq: e.target.checked }))}
                    />
                    <span>CQ (সৃজনশীল)</span>
                  </label>
                  {subForm.hasCq && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="পূর্ণমান"
                        type="number"
                        value={subForm.cqFull}
                        onChange={(e) => setSubForm((p) => ({ ...p, cqFull: Number(e.target.value) }))}
                      />
                      <Input
                        label="পাস"
                        type="number"
                        value={subForm.cqPass}
                        onChange={(e) => setSubForm((p) => ({ ...p, cqPass: Number(e.target.value) }))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-3 rounded-[10px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52]">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subForm.hasMcq}
                      onChange={(e) => setSubForm((p) => ({ ...p, hasMcq: e.target.checked }))}
                    />
                    <span>MCQ (বহুনির্বাচনি)</span>
                  </label>
                  {subForm.hasMcq && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="পূর্ণমান"
                        type="number"
                        value={subForm.mcqFull}
                        onChange={(e) => setSubForm((p) => ({ ...p, mcqFull: Number(e.target.value) }))}
                      />
                      <Input
                        label="পাস"
                        type="number"
                        value={subForm.mcqPass}
                        onChange={(e) => setSubForm((p) => ({ ...p, mcqPass: Number(e.target.value) }))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-3 rounded-[10px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52]">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subForm.hasPractical}
                      onChange={(e) => setSubForm((p) => ({ ...p, hasPractical: e.target.checked }))}
                    />
                    <span>ব্যবহারিক</span>
                  </label>
                  {subForm.hasPractical && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="পূর্ণমান"
                        type="number"
                        value={subForm.practicalFull}
                        onChange={(e) =>
                          setSubForm((p) => ({ ...p, practicalFull: Number(e.target.value) }))
                        }
                      />
                      <Input
                        label="পাস"
                        type="number"
                        value={subForm.practicalPass}
                        onChange={(e) =>
                          setSubForm((p) => ({ ...p, practicalPass: Number(e.target.value) }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Input
                label="মোট পূর্ণমান"
                type="number"
                value={
                  (subForm.hasCq ? subForm.cqFull : 0) +
                  (subForm.hasMcq ? subForm.mcqFull : 0) +
                  (subForm.hasPractical ? subForm.practicalFull : 0)
                }
                readOnly
              />
              <Input
                label="মোট পাস নম্বর"
                type="number"
                value={subForm.totalPass}
                onChange={(e) => setSubForm((p) => ({ ...p, totalPass: Number(e.target.value) }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteClassTarget)}
        onClose={() => setDeleteClassTarget(null)}
        title="শ্রেণি মুছে ফেলুন"
        description={`"${deleteClassTarget?.name ?? ''}" মুছে ফেললে এর শাখা ও বিষয়সমূহ মুছে যাবে।`}
        onConfirm={() => {
          if (!deleteClassTarget) return;
          deleteClass(deleteClassTarget.id);
          showToast('শ্রেণি মুছে ফেলা হয়েছে', 'success');
        }}
      />
    </div>
  );
};
