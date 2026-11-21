import React, { useState } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { createTeacherViaServer } from '../../../lib/principalUsersApi';
import { formatZodError, teacherSchema } from '../../../lib/validation';
import { useApp } from '../../../store/AppContext';
import type { User } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Drawer } from '../../../components/ui/Drawer';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';

export const TeachersPage: React.FC = () => {
  const {
    repo,
    academicYear,
    activeInstitutionCode,
    numeralLocale,
    saveTeacherWithAssignments,
    removeTeacherAssignment,
    deleteTeacher,
    saveSubject,
    showToast,
  } = useApp();

  const teachers = repo?.getTeachers() ?? [];
  const assignments = repo?.getTeacherAssignments() ?? [];
  const classes = repo?.getClasses() ?? [];
  const sections = repo?.getSections() ?? [];
  const subjects = repo?.getSubjects() ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerTeacher, setDrawerTeacher] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const [form, setForm] = useState({
    id: '' as string,
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [rows, setRows] = useState<Array<{ classId: string; sectionId: string; subjectId: string }>>([
    {
      classId: classes[0]?.id ?? '',
      sectionId: '',
      subjectId: subjects[0]?.id ?? '',
    },
  ]);

  // Inline quick subject creation inside modal
  const [inlineSubOpen, setInlineSubOpen] = useState(false);
  const [inlineSubName, setInlineSubName] = useState('');
  const [inlineSubCode, setInlineSubCode] = useState('');
  const [inlineSubClass, setInlineSubClass] = useState(classes[0]?.id ?? '');

  const openCreateModal = () => {
    setForm({ id: '', name: '', email: '', phone: '', password: '' });
    setRows([
      {
        classId: classes[0]?.id ?? '',
        sectionId: '',
        subjectId: subjects.find((s) => s.classId === classes[0]?.id)?.id ?? '',
      },
    ]);
    setModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = teacherSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
    if (!parsed.success) {
      showToast(formatZodError(parsed.error), 'danger');
      return;
    }

    const validRows = rows
      .filter((r) => r.classId && r.subjectId)
      .map((r) => ({
        classId: r.classId,
        sectionId: r.sectionId || null,
        subjectId: r.subjectId,
      }));

    let forcedUserId: string | undefined;
    let skipRtdbUserWrite = false;

    if (!form.id) {
      setSaving(true);
      try {
        const srv = await createTeacherViaServer({
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          password: form.password || undefined,
          academicYear,
          institutionCode: activeInstitutionCode ?? undefined,
          assignments: validRows,
        });
        if (!srv.offlineSkipped && !srv.ok) {
          showToast(srv.error ?? 'শিক্ষক অ্যাকাউন্ট তৈরি করা যায়নি', 'danger');
          return;
        }
        if (srv.ok && srv.uid) {
          forcedUserId = srv.uid;
          skipRtdbUserWrite = true;
        }
      } catch {
        showToast('সার্ভারে সংযোগ করা যায়নি। আবার চেষ্টা করুন।', 'danger');
        return;
      } finally {
        setSaving(false);
      }
    }

    const res = saveTeacherWithAssignments({
      id: form.id || undefined,
      forcedUserId,
      skipRtdbUserWrite,
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password || undefined,
      assignments: validRows,
    });
    if (!res.ok) {
      showToast(res.error ?? 'শিক্ষক সংরক্ষণ করা যায়নি', 'danger');
      return;
    }
    setModalOpen(false);
    showToast('শিক্ষক ও বিষয় বণ্টন সংরক্ষিত হয়েছে', 'success');
  };

  const handleInlineCreateSubject = () => {
    const res = saveSubject({
      classId: inlineSubClass,
      sectionId: null,
      name: inlineSubName,
      code: inlineSubCode,
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
    if (!res.ok || !res.data) {
      showToast(res.error ?? 'বিষয় তৈরি করা যায়নি', 'danger');
      return;
    }
    setInlineSubName('');
    setInlineSubCode('');
    setInlineSubOpen(false);
    setRows((p) => [
      ...p,
      { classId: inlineSubClass, sectionId: '', subjectId: res.data!.id },
    ]);
    showToast('নতুন বিষয় তৈরি ও যুক্ত হয়েছে', 'success');
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'শিক্ষকের নাম',
      render: (t) => (
        <button
          type="button"
          onClick={() => setDrawerTeacher(t)}
          className="font-bold text-[#4F46E5] dark:text-[#A5B4FC] hover:underline text-left cursor-pointer"
        >
          {t.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'ইমেইল',
      render: (t) => <span className="text-xs sm:text-sm">{t.email}</span>,
    },
    {
      key: 'phone',
      header: 'মোবাইল',
      render: (t) => <span className="tabular-nums">{formatNumeral(t.phone, numeralLocale)}</span>,
    },
    {
      key: 'load',
      header: 'বরাদ্দকৃত বিষয়',
      render: (t) => {
        const count = assignments.filter((a) => a.teacherId === t.id).length;
        return <Pill variant="info">{formatNumeral(count, numeralLocale)}টি বণ্টন</Pill>;
      },
    },
    {
      key: 'actions',
      header: 'কার্যক্রম',
      align: 'right',
      render: (t) => (
        <Button size="sm" variant="outline" onClick={() => setDrawerTeacher(t)}>
          বণ্টন দেখুন
        </Button>
      ),
    },
  ];

  const drawerAssignments = drawerTeacher
    ? assignments.filter((a) => a.teacherId === drawerTeacher.id)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
            শিক্ষক তালিকা ও বিষয় বণ্টন
          </h2>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
            কোনো শিক্ষকের নামে ক্লিক করে তাঁর বরাদ্দকৃত শ্রেণি ও বিষয় পরিচালনা করুন।
          </p>
        </div>
        <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={openCreateModal}>
          নতুন শিক্ষক
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        rowKey={(t) => t.id}
        emptyState={
          <EmptyState
            title="কোনো শিক্ষক যুক্ত নেই"
            description="প্রথম শিক্ষক যুক্ত করতে 'নতুন শিক্ষক' বাটনে ক্লিক করুন।"
          />
        }
      />

      {/* Wide Add Teacher + Assignments Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="নতুন শিক্ষক ও বিষয় বণ্টন"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button type="submit" form="teacher-form" disabled={saving}>
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'শিক্ষক সংরক্ষণ করুন'}
            </Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={handleSaveTeacher} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="শিক্ষকের নাম"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="মোঃ রফিকুল ইসলাম"
            />
            <Input
              label="ইমেইল"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="teacher@school.edu.bd"
            />
            <Input
              label="মোবাইল"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="017XXXXXXXX"
            />
            <Input
              label="পাসওয়ার্ড"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="কমপক্ষে ৬ অক্ষর"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#111936] dark:text-[#E8ECFB]">
                শ্রেণি ও বিষয় বণ্টন
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setInlineSubOpen((p) => !p)}
                >
                  + নতুন বিষয় তৈরি করুন
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() =>
                    setRows((p) => [
                      ...p,
                      {
                        classId: classes[0]?.id ?? '',
                        sectionId: '',
                        subjectId: subjects.find((s) => s.classId === classes[0]?.id)?.id ?? '',
                      },
                    ])
                  }
                >
                  আরও যোগ করুন
                </Button>
              </div>
            </div>

            {inlineSubOpen && (
              <div className="p-3 rounded-[12px] border border-[#4F46E5]/30 bg-[#4F46E5]/[0.05] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <Select
                  label="শ্রেণি"
                  value={inlineSubClass}
                  onChange={(e) => setInlineSubClass(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="বিষয়ের নাম"
                  value={inlineSubName}
                  onChange={(e) => setInlineSubName(e.target.value)}
                  placeholder="যেমন: জীববিজ্ঞান"
                />
                <Input
                  label="বিষয় কোড"
                  value={inlineSubCode}
                  onChange={(e) => setInlineSubCode(e.target.value)}
                  placeholder="138"
                />
                <Button size="sm" onClick={handleInlineCreateSubject}>
                  তৈরি করুন
                </Button>
              </div>
            )}

            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const rowSecs = sections.filter((s) => s.classId === row.classId);
                const rowSubs = subjects.filter((s) => s.classId === row.classId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-[12px] border border-[#E2E6F3] dark:border-[#262F52]"
                  >
                    <div className="sm:col-span-4">
                      <Select
                        label="শ্রেণি"
                        value={row.classId}
                        onChange={(e) => {
                          const cid = e.target.value;
                          const firstSub = subjects.find((s) => s.classId === cid)?.id ?? '';
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { classId: cid, sectionId: '', subjectId: firstSub } : r
                            )
                          );
                        }}
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="sm:col-span-3">
                      <Select
                        label="শাখা"
                        value={row.sectionId}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, sectionId: e.target.value } : r))
                          )
                        }
                      >
                        <option value="">সকল শাখা</option>
                        {rowSecs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="sm:col-span-4">
                      <Select
                        label="বিষয়"
                        value={row.subjectId}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, subjectId: e.target.value } : r))
                          )
                        }
                      >
                        {rowSubs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="সারি মুছুন"
                        className="p-2.5 rounded-[10px] text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Side Drawer for Teacher Assignments */}
      <Drawer
        open={Boolean(drawerTeacher)}
        onClose={() => setDrawerTeacher(null)}
        title={drawerTeacher?.name ?? ''}
        subtitle={drawerTeacher ? `${drawerTeacher.email} · ${drawerTeacher.phone}` : ''}
        footer={
          drawerTeacher && (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setDeleteConfirm(drawerTeacher)}
            >
              শিক্ষক অ্যাকাউন্ট মুছুন
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#111936] dark:text-[#E8ECFB]">
            বর্তমান বরাদ্দকৃত শ্রেণি ও বিষয়
          </h3>
          {drawerAssignments.length === 0 ? (
            <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
              কোনো বিষয় বরাদ্দ করা নেই।
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {drawerAssignments.map((a) => {
                const cls = classes.find((c) => c.id === a.classId);
                const sec = sections.find((s) => s.id === a.sectionId);
                const sub = subjects.find((s) => s.id === a.subjectId);
                return (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[#4F46E5]/10 text-[#4338CA] dark:text-[#A5B4FC] border border-[#4F46E5]/20 px-3 py-1.5 text-xs font-semibold"
                  >
                    <span>
                      {cls?.name ?? ''} ({sec ? sec.name : 'সকল শাখা'}) — {sub?.name ?? ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeTeacherAssignment(a.id);
                        showToast('বণ্টন সরানো হয়েছে', 'success');
                      }}
                      aria-label="বণ্টন সরান"
                      className="hover:text-[#DC2626] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="শিক্ষক অ্যাকাউন্ট মুছে ফেলুন"
        description={`"${deleteConfirm?.name ?? ''}" অ্যাকাউন্টটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (!deleteConfirm) return;
          deleteTeacher(deleteConfirm.id);
          setDrawerTeacher(null);
          showToast('শিক্ষক অ্যাকাউন্ট মুছে ফেলা হয়েছে', 'success');
        }}
      />
    </div>
  );
};
