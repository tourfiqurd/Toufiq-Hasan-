import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, Upload } from 'lucide-react';
import { exportToCsv, parseSpreadsheetFile } from '../../../lib/exportUtils';
import { formatNumeral } from '../../../lib/grading/numerals';
import {
  bulkImportStudentsViaServer,
  createStudentViaServer,
} from '../../../lib/principalUsersApi';
import { formatZodError, studentSchema } from '../../../lib/validation';
import { useApp } from '../../../store/AppContext';
import type { Student } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

interface BulkRowPreview {
  rowNum: number;
  name: string;
  roll: number;
  studentCode: string;
  classId: string;
  sectionId: string;
  gender: 'male' | 'female' | 'other';
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  email: string;
  error?: string;
}

export const StudentsPage: React.FC = () => {
  const {
    db,
    repo,
    academicYear,
    activeInstitutionCode,
    numeralLocale,
    saveStudent,
    bulkImportStudents,
    deleteStudent,
    showToast,
  } = useApp();

  const classes = repo?.getClasses() ?? [];
  const sections = repo?.getSections() ?? [];
  const subjects = repo?.getSubjects() ?? [];
  const students = repo?.getStudents() ?? [];

  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admission / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [form, setForm] = useState({
    name: '',
    roll: 1,
    studentCode: '',
    classId: classes[0]?.id ?? '',
    sectionId: sections[0]?.id ?? '',
    gender: 'male' as 'male' | 'female' | 'other',
    dob: '2012-01-01',
    fatherName: '',
    motherName: '',
    guardianPhone: '',
    address: '',
    fourthSubjectId: '',
    email: '',
    password: '',
  });

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkRowPreview[]>([]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      if (sectionFilter !== 'all' && s.sectionId !== sectionFilter) return false;
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          String(s.roll).includes(q)
        );
      }
      return true;
    });
  }, [students, classFilter, sectionFilter, searchQuery]);

  const openAdmission = () => {
    const defaultCls = classes[0]?.id ?? '';
    const defaultSec = sections.find((s) => s.classId === defaultCls)?.id ?? '';
    setEditingStudent(null);
    setForm({
      name: '',
      roll: students.length + 1,
      studentCode: `26-${String(students.length + 1).padStart(3, '0')}`,
      classId: defaultCls,
      sectionId: defaultSec,
      gender: 'male',
      dob: '2012-01-01',
      fatherName: '',
      motherName: '',
      guardianPhone: '',
      address: '',
      fourthSubjectId: '',
      email: '',
      password: '',
    });
    setModalOpen(true);
  };

  const openEdit = (st: Student) => {
    const u = db.users.find((x) => x.id === st.userId);
    setEditingStudent(st);
    setForm({
      name: st.name,
      roll: st.roll,
      studentCode: st.studentCode,
      classId: st.classId,
      sectionId: st.sectionId,
      gender: st.gender,
      dob: st.dob,
      fatherName: st.fatherName,
      motherName: st.motherName,
      guardianPhone: st.guardianPhone,
      address: st.address,
      fourthSubjectId: st.fourthSubjectId ?? '',
      email: u?.email ?? '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = studentSchema.safeParse({
      name: form.name,
      roll: Number(form.roll),
      studentCode: form.studentCode,
      classId: form.classId,
      sectionId: form.sectionId,
      fatherName: form.fatherName,
      motherName: form.motherName,
      guardianPhone: form.guardianPhone,
      email: form.email,
    });
    if (!parsed.success) {
      showToast(formatZodError(parsed.error), 'danger');
      return;
    }

    let forcedUserId: string | undefined;
    let forcedStudentId: string | undefined;
    let skipRtdbWrite = false;

    if (!editingStudent) {
      setSaving(true);
      try {
        const srv = await createStudentViaServer({
          name: parsed.data.name,
          roll: parsed.data.roll,
          studentCode: parsed.data.studentCode,
          classId: parsed.data.classId,
          sectionId: parsed.data.sectionId,
          gender: form.gender,
          dob: form.dob,
          fatherName: parsed.data.fatherName,
          motherName: parsed.data.motherName,
          guardianPhone: parsed.data.guardianPhone,
          address: form.address,
          fourthSubjectId: form.fourthSubjectId || null,
          email: parsed.data.email,
          password: form.password || undefined,
          academicYear,
          institutionCode: activeInstitutionCode ?? undefined,
        });
        if (!srv.offlineSkipped && !srv.ok) {
          showToast(srv.error ?? 'শিক্ষার্থী অ্যাকাউন্ট তৈরি করা যায়নি', 'danger');
          return;
        }
        if (srv.ok && srv.uid && srv.studentId) {
          forcedUserId = srv.uid;
          forcedStudentId = srv.studentId;
          skipRtdbWrite = true;
        }
      } catch {
        showToast('সার্ভারে সংযোগ করা যায়নি। আবার চেষ্টা করুন।', 'danger');
        return;
      } finally {
        setSaving(false);
      }
    }

    const res = saveStudent({
      id: editingStudent?.id,
      forcedUserId,
      forcedStudentId,
      skipRtdbWrite,
      name: form.name,
      roll: Number(form.roll),
      studentCode: form.studentCode,
      classId: form.classId,
      sectionId: form.sectionId,
      gender: form.gender,
      dob: form.dob,
      fatherName: form.fatherName,
      motherName: form.motherName,
      guardianPhone: form.guardianPhone,
      address: form.address,
      fourthSubjectId: form.fourthSubjectId || null,
      email: form.email,
      password: form.password || undefined,
    });
    if (!res.ok) {
      showToast(res.error ?? 'সংরক্ষণ করা যায়নি', 'danger');
      return;
    }
    setModalOpen(false);
    showToast('শিক্ষার্থীর তথ্য ও লগইন অ্যাকাউন্ট সংরক্ষিত হয়েছে', 'success');
  };

  const handleDownloadSampleCsv = () => {
    const sampleClass = classes[0]?.name ?? 'নবম শ্রেণি';
    const sampleSection = sections[0]?.name ?? 'ক (বিজ্ঞান)';
    exportToCsv(
      'academia-student-sample.csv',
      ['name', 'roll', 'studentCode', 'className', 'sectionName', 'gender', 'fatherName', 'motherName', 'guardianPhone', 'email'],
      [
        ['আরিফুল ইসলাম', 51, '2609A-051', sampleClass, sampleSection, 'male', 'মোঃ জসিম উদ্দিন', 'সেলিনা বেগম', '01711009988', 'ariful51@adarsha.edu.bd'],
        ['মালিহা তাসনিম', 52, '2609A-052', sampleClass, sampleSection, 'female', 'মোঃ শফিকুল ইসলাম', 'নাজমা আক্তার', '01811223344', 'maliha52@adarsha.edu.bd'],
      ]
    );
    showToast('স্যাম্পল CSV ডাউনলোড হয়েছে', 'success');
  };

  const handleBulkFile = async (file?: File) => {
    if (!file) return;
    const rawRows = await parseSpreadsheetFile(file);
    const preview: BulkRowPreview[] = rawRows.map((r, idx) => {
      const name = r.name || r['নাম'] || '';
      const roll = Number(r.roll || r['রোল'] || 0);
      const studentCode = r.studentcode || r['student_code'] || r['আইডি'] || `ID-${idx + 1}`;
      const clsMatch =
        classes.find((c) => c.name === r.classname || c.code === r.classname) ?? classes[0];
      const secMatch =
        sections.find((s) => s.classId === clsMatch?.id && s.name === r.sectionname) ??
        sections.find((s) => s.classId === clsMatch?.id);
      const email = r.email || '';
      const fatherName = r.fathername || r['পিতা'] || '—';
      const motherName = r.mothername || r['মাতা'] || '—';
      const guardianPhone = r.guardianphone || r['ফোন'] || '';

      let error: string | undefined;
      if (!name) error = 'নাম অনুপস্থিত';
      else if (!roll || roll < 1) error = 'অবৈধ রোল';
      else if (!email.includes('@')) error = 'অবৈধ ইমেইল';
      else if (!clsMatch || !secMatch) error = 'শ্রেণি/শাখা মেলেনি';

      return {
        rowNum: idx + 1,
        name,
        roll,
        studentCode,
        classId: clsMatch?.id ?? '',
        sectionId: secMatch?.id ?? '',
        gender: (r.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
        fatherName,
        motherName,
        guardianPhone,
        email,
        error,
      };
    });
    setBulkPreview(preview);
  };

  const handleConfirmBulk = async () => {
    const validRows = bulkPreview.filter((r) => !r.error);
    if (validRows.length === 0) {
      showToast('কোনো বৈধ সারি পাওয়া যায়নি', 'danger');
      return;
    }

    setBulkImporting(true);
    try {
      const srv = await bulkImportStudentsViaServer({
        academicYear,
        institutionCode: activeInstitutionCode ?? undefined,
        rows: validRows.map((r) => ({
          name: r.name,
          roll: r.roll,
          studentCode: r.studentCode,
          classId: r.classId,
          sectionId: r.sectionId,
          gender: r.gender,
          dob: '2012-01-01',
          fatherName: r.fatherName,
          motherName: r.motherName,
          guardianPhone: r.guardianPhone || '01700000000',
          address: '',
          fourthSubjectId: null,
          email: r.email,
        })),
      });

      if (!srv.offlineSkipped && !srv.ok) {
        showToast(srv.error ?? 'বাল্ক ইমপোর্ট ব্যর্থ হয়েছে', 'danger');
        return;
      }

      if (srv.ok && srv.created) {
        const createdByEmail = new Map(srv.created.map((c) => [c.email.toLowerCase(), c]));
        const syncedRows = validRows
          .filter((r) => createdByEmail.has(r.email.toLowerCase()))
          .map((r) => {
            const match = createdByEmail.get(r.email.toLowerCase())!;
            return {
              ...r,
              forcedUserId: match.uid,
              forcedStudentId: match.id,
            };
          });
        if (syncedRows.length > 0) {
          bulkImportStudents(syncedRows, { skipRtdbWrite: true });
        }
        setBulkOpen(false);
        setBulkPreview([]);
        const skippedCount = srv.skipped?.length ?? 0;
        const msg =
          skippedCount > 0
            ? `${formatNumeral(srv.importedCount ?? syncedRows.length, numeralLocale)} জন শিক্ষার্থী ইমপোর্ট হয়েছে (${formatNumeral(skippedCount, numeralLocale)}টি ডুপ্লিকেট বাদ)`
            : `${formatNumeral(srv.importedCount ?? syncedRows.length, numeralLocale)} জন শিক্ষার্থী ইমপোর্ট হয়েছে`;
        showToast(msg, 'success');
        return;
      }
    } catch {
      showToast('বাল্ক ইমপোর্টের সময় সার্ভার ত্রুটি হয়েছে', 'danger');
      return;
    } finally {
      setBulkImporting(false);
    }

    const res = bulkImportStudents(validRows);
    if (res.ok) {
      setBulkOpen(false);
      setBulkPreview([]);
      showToast(`${formatNumeral(res.data ?? 0, numeralLocale)} জন শিক্ষার্থী ইমপোর্ট হয়েছে`, 'success');
    }
  };

  const columns: Column<Student>[] = [
    {
      key: 'roll',
      header: 'রোল',
      render: (s) => <span className="font-bold">{formatNumeral(s.roll, numeralLocale)}</span>,
    },
    {
      key: 'name',
      header: 'শিক্ষার্থীর নাম ও আইডি',
      render: (s) => (
        <div>
          <p className="font-bold">{s.name}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{s.studentCode}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'শ্রেণি ও শাখা',
      render: (s) => {
        const cls = classes.find((c) => c.id === s.classId);
        const sec = sections.find((x) => x.id === s.sectionId);
        return (
          <span className="text-xs sm:text-sm">
            {cls?.name ?? ''} ({sec?.name ?? ''})
          </span>
        );
      },
    },
    {
      key: 'guardian',
      header: 'অভিভাবক ও ফোন',
      render: (s) => (
        <div className="text-xs">
          <p className="font-semibold">{s.fatherName}</p>
          <p className="text-[#5D6785] dark:text-[#98A2C7]">
            {formatNumeral(s.guardianPhone, numeralLocale)}
          </p>
        </div>
      ),
    },
    {
      key: 'fourth',
      header: '৪র্থ বিষয়',
      render: (s) => {
        const sub = subjects.find((x) => x.id === s.fourthSubjectId);
        return sub ? <Pill variant="neutral">{sub.name}</Pill> : <span className="text-xs">—</span>;
      },
    },
    {
      key: 'actions',
      header: 'কার্যক্রম',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
            সম্পাদনা
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(s)}>
            মুছুন
          </Button>
        </div>
      ),
    },
  ];

  const modalSections = sections.filter((s) => s.classId === form.classId);
  const modalFourthSubjects = subjects.filter((s) => s.classId === form.classId && s.isFourth);

  return (
    <div className="space-y-5">
      {/* Filter & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <Select
            label="শ্রেণি"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSectionFilter('all');
            }}
          >
            <option value="all">সকল শ্রেণি</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="শাখা"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="all">সকল শাখা</option>
            {sections
              .filter((s) => classFilter === 'all' || s.classId === classFilter)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
          <Input
            label="খুঁজুন"
            leftIcon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, রোল বা আইডি..."
          />
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Button
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setBulkOpen(true)}
          >
            বাল্ক CSV/Excel ইমপোর্ট
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdmission}>
            নতুন শিক্ষার্থী ভর্তি
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredStudents}
        rowKey={(s) => s.id}
        emptyState={
          <EmptyState
            title="কোনো শিক্ষার্থী পাওয়া যায়নি"
            description="ফিল্টার পরিবর্তন করুন অথবা নতুন শিক্ষার্থী ভর্তি করুন।"
          />
        }
      />

      {/* Two-Column Admission Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'নতুন শিক্ষার্থী ভর্তি ফরম'}
        subtitle="সংরক্ষণ করলে শিক্ষার্থীর ড্যাশবোর্ড লগইন অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে তৈরি হবে।"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button type="submit" form="student-form" disabled={saving}>
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="শিক্ষার্থীর নাম"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="রোল নম্বর"
              type="number"
              value={form.roll}
              onChange={(e) => setForm((p) => ({ ...p, roll: Number(e.target.value) }))}
            />
            <Input
              label="শিক্ষার্থী আইডি"
              value={form.studentCode}
              onChange={(e) => setForm((p) => ({ ...p, studentCode: e.target.value }))}
            />
          </div>
          <Select
            label="শ্রেণি"
            value={form.classId}
            onChange={(e) => {
              const cid = e.target.value;
              const firstSec = sections.find((s) => s.classId === cid)?.id ?? '';
              setForm((p) => ({ ...p, classId: cid, sectionId: firstSec }));
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
            value={form.sectionId}
            onChange={(e) => setForm((p) => ({ ...p, sectionId: e.target.value }))}
          >
            {modalSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="লিঙ্গ"
            value={form.gender}
            onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as 'male' | 'female' | 'other' }))}
          >
            <option value="male">ছাত্র</option>
            <option value="female">ছাত্রী</option>
            <option value="other">অন্যান্য</option>
          </Select>
          <Input
            label="জন্ম তারিখ"
            type="date"
            value={form.dob}
            onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
          />
          <Input
            label="পিতার নাম"
            value={form.fatherName}
            onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
          />
          <Input
            label="মাতার নাম"
            value={form.motherName}
            onChange={(e) => setForm((p) => ({ ...p, motherName: e.target.value }))}
          />
          <Input
            label="অভিভাবকের মোবাইল"
            value={form.guardianPhone}
            onChange={(e) => setForm((p) => ({ ...p, guardianPhone: e.target.value }))}
          />
          <Select
            label="৪র্থ বিষয়"
            value={form.fourthSubjectId}
            onChange={(e) => setForm((p) => ({ ...p, fourthSubjectId: e.target.value }))}
          >
            <option value="">নির্বাচন করুন (ঐচ্ছিক)</option>
            {modalFourthSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </Select>
          <Input
            label="ঠিকানা"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <Input
            label="লগইন ইমেইল"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Input
              label={editingStudent ? 'নতুন পাসওয়ার্ড (পরিবর্তন করতে চাইলে)' : 'প্রাথমিক পাসওয়ার্ড'}
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="ডিফল্ট: student123"
            />
          </div>
        </form>
      </Modal>

      {/* Bulk CSV/Excel Import Modal */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="CSV বা Excel থেকে বাল্ক শিক্ষার্থী ইমপোর্ট"
        subtitle="স্যাম্পল ফরম্যাট মেনে ফাইল আপলোড করুন। ত্রুটিপূর্ণ সারি লাল রঙে চিহ্নিত হবে।"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkImporting}>
              বাতিল
            </Button>
            <Button onClick={handleConfirmBulk} disabled={bulkPreview.length === 0 || bulkImporting}>
              {bulkImporting ? 'ইমপোর্ট হচ্ছে...' : 'বৈধ শিক্ষার্থী ইমপোর্ট করুন'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4F46E5] dark:text-[#A5B4FC] hover:underline cursor-pointer"
            >
              <Download className="w-4 h-4" />
              স্যাম্পল CSV ডাউনলোড
            </button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-[16px] border-2 border-dashed border-[#4F46E5]/50 bg-[#4F46E5]/[0.04] hover:bg-[#4F46E5]/[0.08] cursor-pointer text-center">
            <Upload className="w-7 h-7 text-[#4F46E5]" />
            <span className="text-sm font-semibold">CSV অথবা Excel (.xlsx) ফাইল নির্বাচন করুন</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleBulkFile(e.target.files?.[0])}
            />
          </label>

          {bulkPreview.length > 0 && (
            <div className="overflow-x-auto rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#4F46E5]/10">
                    <th className="px-3 py-2 text-left">সারি</th>
                    <th className="px-3 py-2 text-left">নাম</th>
                    <th className="px-3 py-2 text-left">রোল</th>
                    <th className="px-3 py-2 text-left">ইমেইল</th>
                    <th className="px-3 py-2 text-left">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
                  {bulkPreview.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={r.error ? 'bg-[#DC2626]/10 text-[#B91C1C] dark:text-[#FCA5A5]' : ''}
                    >
                      <td className="px-3 py-2 tabular-nums">{r.rowNum}</td>
                      <td className="px-3 py-2 font-semibold">{r.name || '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{r.roll}</td>
                      <td className="px-3 py-2">{r.email || '—'}</td>
                      <td className="px-3 py-2 font-semibold">
                        {r.error ? r.error : 'সঠিক'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="শিক্ষার্থী মুছে ফেলুন"
        description={`আপনি কি নিশ্চিত "${deleteTarget?.name ?? ''}" কে তালিকা থেকে মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteStudent(deleteTarget.id);
          showToast('শিক্ষার্থী মুছে ফেলা হয়েছে', 'success');
        }}
      />
    </div>
  );
};
