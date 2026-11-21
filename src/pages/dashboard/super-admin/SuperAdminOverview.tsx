import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  KeyRound,
  LogIn,
  MailCheck,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  approveApplicationViaServer,
  ensureEmulatorAuthToken,
  fetchApplicationsViaServer,
  rejectApplicationViaServer,
  subscribeToApplications,
} from '../../../lib/applicationsApi';
import { firebaseAuth } from '../../../lib/firebase';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import type {
  Institution,
  InstitutionApplication,
  InstitutionStatus,
  User,
  UserRole,
} from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pill, type PillVariant } from '../../../components/ui/Pill';
import { StatCard } from '../../../components/ui/StatCard';

interface SuperAdminOverviewProps {
  onEnterInstitution: () => void;
}

const STATUS_BADGE: Record<InstitutionStatus, { label: string; variant: PillVariant }> = {
  approved: { label: 'অনুমোদিত', variant: 'success' },
  pending: { label: 'অপেক্ষমাণ', variant: 'warning' },
  suspended: { label: 'স্থগিত', variant: 'danger' },
  rejected: { label: 'বাতিল', variant: 'danger' },
};

const TYPE_LABEL = {
  school: 'স্কুল',
  college: 'কলেজ',
  madrasa: 'মাদ্রাসা',
};

const USER_TABS: Array<{ role: UserRole; label: string }> = [
  { role: 'institution_admin', label: 'অধ্যক্ষ' },
  { role: 'teacher', label: 'শিক্ষক' },
  { role: 'student', label: 'শিক্ষার্থী' },
  { role: 'parent', label: 'অভিভাবক' },
];

export const SuperAdminOverview: React.FC<SuperAdminOverviewProps> = ({ onEnterInstitution }) => {
  const {
    db,
    user,
    numeralLocale,
    setActingInstitutionId,
    updateInstitutionStatus,
    addInstitutionByAdmin,
    deleteInstitution,
    resetUserPassword,
    deleteUserAccount,
    showToast,
  } = useApp();

  const [selectedSwitchId, setSelectedSwitchId] = useState(
    db.institutions.find((i) => i.status === 'approved')?.id ?? ''
  );

  // Live Realtime Database Applications state
  const [rtdbApps, setRtdbApps] = useState<InstitutionApplication[] | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalApp, setRejectModalApp] = useState<InstitutionApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [approveConfirmApp, setApproveConfirmApp] = useState<InstitutionApplication | null>(null);

  // Subscribe live to /institutionApplications when Firebase Auth super_admin session is active
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const initLiveApplications = async () => {
      const token =
        (await firebaseAuth.currentUser?.getIdToken().catch(() => null)) ||
        (user?.role === 'super_admin'
          ? await ensureEmulatorAuthToken(user.email, 'admin123')
          : null);

      if (cancelled || !token) return;

      // Initial authenticated server fetch for immediate consistency
      const serverRes = await fetchApplicationsViaServer(token).catch(() => null);
      if (!cancelled && serverRes?.ok && Array.isArray(serverRes.data)) {
        setRtdbApps(serverRes.data);
      }

      // Live RTDB listener
      unsubscribe = subscribeToApplications(
        (apps) => {
          if (!cancelled) setRtdbApps(apps);
        },
        () => {
          // If RTDB emulator isn't running locally, fallback gracefully
        }
      );
    };

    void initLiveApplications();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.role, user?.email]);

  // Merge live RTDB applications with local pending seed items if RTDB emulator isn't active yet
  const applicationsList: InstitutionApplication[] = useMemo(() => {
    if (rtdbApps !== null) return rtdbApps;
    return db.institutions
      .filter((i) => i.status === 'pending' || i.status === 'rejected')
      .map((i) => ({
        id: i.id,
        institutionName: i.name,
        type: i.type,
        eiin: i.eiin,
        address: i.address,
        district: i.district,
        phone: i.phone,
        email: i.email,
        principalName: `অধ্যক্ষ (${i.name})`,
        logoDataUrl: i.logoDataUrl,
        status: i.status === 'rejected' ? 'rejected' : 'pending',
        rejectedReason: i.rejectedReason ?? null,
        approvedCode: i.code ?? null,
        createdAt: i.createdAt,
      }));
  }, [rtdbApps, db.institutions]);

  const pendingApplications = useMemo(
    () => applicationsList.filter((a) => a.status === 'pending'),
    [applicationsList]
  );

  // Status confirmation modal
  const [statusConfirm, setStatusConfirm] = useState<{
    inst: Institution;
    nextStatus: InstitutionStatus;
  } | null>(null);

  // Delete institution modal (requires typing institution name)
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);

  // Add institution modal
  const [addOpen, setAddOpen] = useState(false);
  const [newInst, setNewInst] = useState({
    name: '',
    type: 'school' as 'school' | 'college' | 'madrasa',
    eiin: '',
    district: 'ঢাকা',
    address: '',
    phone: '',
    email: '',
    principalName: '',
    password: '',
  });
  const [addError, setAddError] = useState('');

  // User Management state
  const [userTab, setUserTab] = useState<UserRole>('institution_admin');
  const [userSearch, setUserSearch] = useState('');
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPw, setNewPw] = useState('');
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);

  const activeCount = db.institutions.filter((i) => i.status === 'approved').length;
  const pendingCount = pendingApplications.length;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return db.users
      .filter((u) => u.role === userTab)
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
  }, [db.users, userTab, userSearch]);

  const handleEnterInstitution = () => {
    if (!selectedSwitchId) return;
    setActingInstitutionId(selectedSwitchId);
    onEnterInstitution();
  };

  const handleApproveApplication = async (app: InstitutionApplication) => {
    setActionLoadingId(app.id);
    try {
      const token = await ensureEmulatorAuthToken(user?.email, 'admin123');
      if (!token) {
        // Fallback when emulator isn't running locally in preview
        const existsInLocal = db.institutions.some((i) => i.id === app.id);
        if (existsInLocal) {
          updateInstitutionStatus(app.id, 'approved');
          showToast('অফলাইন ডেমো মোডে প্রতিষ্ঠানটি অনুমোদিত হয়েছে', 'success');
        } else {
          showToast('Firebase Emulator সংযোগ পাওয়া যায়নি। সার্ভার চালু করে চেষ্টা করুন।', 'danger');
        }
        return;
      }

      const res = await approveApplicationViaServer(token, app.id);
      if (!res.ok) {
        showToast(res.error ?? 'অনুমোদন প্রক্রিয়া ব্যর্থ হয়েছে', 'danger');
        return;
      }

      if (db.institutions.some((i) => i.id === app.id)) {
        updateInstitutionStatus(app.id, 'approved');
      }
      setRtdbApps((prev) =>
        prev
          ? prev.map((x) =>
              x.id === app.id
                ? { ...x, status: 'approved', approvedCode: res.institutionCode ?? null }
                : x
            )
          : prev
      );
      showToast(
        `অনুমোদিত (${res.institutionCode}): অধ্যক্ষের ইমেইলে পাসওয়ার্ড সেটআপ লিংক পাঠানো হয়েছে`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'অনুমোদন করা যায়নি', 'danger');
    } finally {
      setActionLoadingId(null);
      setApproveConfirmApp(null);
    }
  };

  const handleRejectApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalApp) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      setRejectError('বাতিলের কারণ কমপক্ষে ৩ অক্ষরের লিখুন।');
      return;
    }
    setRejectError('');
    setActionLoadingId(rejectModalApp.id);

    try {
      const token = await ensureEmulatorAuthToken(user?.email, 'admin123');
      if (!token) {
        if (db.institutions.some((i) => i.id === rejectModalApp.id)) {
          updateInstitutionStatus(rejectModalApp.id, 'rejected', trimmed);
          showToast('অফলাইন ডেমো মোডে আবেদনটি বাতিল করা হয়েছে', 'success');
          setRejectModalApp(null);
          setRejectReason('');
        } else {
          setRejectError('Firebase Emulator সংযোগ পাওয়া যায়নি।');
        }
        return;
      }

      const res = await rejectApplicationViaServer(token, rejectModalApp.id, trimmed);
      if (!res.ok) {
        setRejectError(res.error ?? 'আবেদন বাতিল করা যায়নি।');
        return;
      }

      if (db.institutions.some((i) => i.id === rejectModalApp.id)) {
        updateInstitutionStatus(rejectModalApp.id, 'rejected', trimmed);
      }
      setRtdbApps((prev) =>
        prev
          ? prev.map((x) =>
              x.id === rejectModalApp.id
                ? { ...x, status: 'rejected', rejectedReason: trimmed }
                : x
            )
          : prev
      );
      showToast('আবেদনটি কারণসহ বাতিল করা হয়েছে', 'success');
      setRejectModalApp(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'আবেদন বাতিল করা যায়নি।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addInstitutionByAdmin(newInst);
    if (!res.ok) {
      setAddError(res.error ?? 'প্রতিষ্ঠান যুক্ত করা যায়নি।');
      return;
    }
    setAddError('');
    setAddOpen(false);
    setNewInst({
      name: '',
      type: 'school',
      eiin: '',
      district: 'ঢাকা',
      address: '',
      phone: '',
      email: '',
      principalName: '',
      password: '',
    });
    showToast('নতুন প্রতিষ্ঠান যুক্ত ও অনুমোদিত হয়েছে', 'success');
  };

  const appColumns: Column<InstitutionApplication>[] = [
    {
      key: 'name',
      header: 'প্রতিষ্ঠান ও অধ্যক্ষ',
      render: (r) => (
        <div>
          <p className="font-bold text-[#111936] dark:text-[#E8ECFB]">{r.institutionName}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
            {r.principalName} · {r.email}
          </p>
        </div>
      ),
    },
    {
      key: 'eiin',
      header: 'ধরন ও EIIN',
      render: (r) => (
        <div className="text-xs sm:text-sm">
          <p className="font-semibold">{TYPE_LABEL[r.type]}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
            EIIN: {formatNumeral(r.eiin, numeralLocale)}
          </p>
        </div>
      ),
    },
    {
      key: 'district',
      header: 'জেলা ও ফোন',
      render: (r) => (
        <div className="text-xs sm:text-sm">
          <p>{r.district}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">{r.phone}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'অবস্থা',
      render: (r) => {
        const badge = STATUS_BADGE[r.status];
        return (
          <div className="space-y-1">
            <Pill variant={badge.variant}>{badge.label}</Pill>
            {r.approvedCode && (
              <p className="text-[11px] font-bold text-[#14B8A6] tabular-nums">
                কোড: {r.approvedCode}
              </p>
            )}
            {r.status === 'rejected' && r.rejectedReason && (
              <p className="text-[11px] text-[#DC2626] dark:text-[#FCA5A5] max-w-[200px]">
                কারণ: {r.rejectedReason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'সিদ্ধান্ত',
      align: 'right',
      render: (r) =>
        r.status === 'pending' ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              isLoading={actionLoadingId === r.id}
              onClick={() => setApproveConfirmApp(r)}
            >
              অনুমোদন করুন
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={actionLoadingId === r.id}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
              onClick={() => {
                setRejectModalApp(r);
                setRejectReason('');
                setRejectError('');
              }}
            >
              বাতিল
            </Button>
          </div>
        ) : (
          <span className="text-xs text-[#5D6785] dark:text-[#98A2C7] inline-flex items-center gap-1">
            {r.status === 'approved' && <MailCheck className="w-3.5 h-3.5 text-[#14B8A6]" />}
            পর্যালোচিত
          </span>
        ),
    },
  ];

  const instColumns: Column<Institution>[] = [
    {
      key: 'name',
      header: 'প্রতিষ্ঠান',
      render: (r) => (
        <div>
          <p className="font-bold text-[#111936] dark:text-[#E8ECFB]">{r.name}</p>
          <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
            EIIN: {formatNumeral(r.eiin, numeralLocale)}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ধরন',
      render: (r) => <span>{TYPE_LABEL[r.type]}</span>,
    },
    {
      key: 'district',
      header: 'জেলা',
      render: (r) => <span>{r.district}</span>,
    },
    {
      key: 'date',
      header: 'আবেদনের তারিখ',
      render: (r) => <span>{formatNumeral(r.createdAt, numeralLocale)}</span>,
    },
    {
      key: 'status',
      header: 'স্ট্যাটাস',
      render: (r) => {
        const badge = STATUS_BADGE[r.status];
        return <Pill variant={badge.variant}>{badge.label}</Pill>;
      },
    },
    {
      key: 'actions',
      header: 'কার্যক্রম',
      align: 'right',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          {r.status !== 'approved' && (
            <Button
              size="sm"
              onClick={() => setStatusConfirm({ inst: r, nextStatus: 'approved' })}
            >
              অনুমোদন
            </Button>
          )}
          {r.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusConfirm({ inst: r, nextStatus: 'suspended' })}
            >
              স্থগিত
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setDeleteTarget(r)}
          >
            মুছুন
          </Button>
        </div>
      ),
    },
  ];

  const userColumns: Column<User>[] = [
    {
      key: 'name',
      header: 'নাম',
      render: (u) => <span className="font-semibold">{u.name}</span>,
    },
    {
      key: 'email',
      header: 'ইমেইল',
      render: (u) => <span className="text-xs sm:text-sm">{u.email}</span>,
    },
    {
      key: 'inst',
      header: 'প্রতিষ্ঠান',
      render: (u) => {
        const inst = db.institutions.find((i) => i.id === u.institutionId);
        return <span className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{inst?.name ?? '—'}</span>;
      },
    },
    {
      key: 'role',
      header: 'ভূমিকা',
      render: (u) => (
        <Pill variant={u.isActive ? 'success' : 'warning'}>
          {USER_TABS.find((t) => t.role === u.role)?.label ?? u.role}
        </Pill>
      ),
    },
    {
      key: 'actions',
      header: 'কার্যক্রম',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            onClick={() => {
              setResetTarget(u);
              setNewPw('');
            }}
          >
            পাসওয়ার্ড রিসেট
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteUserTarget(u)}
          >
            মুছুন
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="মোট নিবন্ধিত প্রতিষ্ঠান"
          value={db.institutions.length}
          icon={<Building2 className="w-5 h-5" />}
          tone="brand"
        />
        <StatCard
          label="সক্রিয় প্রতিষ্ঠান"
          value={activeCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="teal"
        />
        <StatCard
          label="অপেক্ষমাণ আবেদন"
          value={pendingCount}
          icon={<Clock className="w-5 h-5" />}
          tone="amber"
          highlightPending
          helper={pendingCount > 0 ? 'যাচাই প্রয়োজন' : 'সব আবেদন পর্যালোচিত'}
        />
        <StatCard
          label="মোট শিক্ষার্থী ও ব্যবহারকারী"
          value={db.students.length + db.users.length}
          icon={<GraduationCap className="w-5 h-5" />}
          tone="violet"
          helper={`শিক্ষার্থী ${formatNumeral(db.students.length, numeralLocale)} · অ্যাকাউন্ট ${formatNumeral(db.users.length, numeralLocale)}`}
        />
      </div>

      {/* Live Pending Institution Applications (RTDB /institutionApplications) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
              নতুন প্রতিষ্ঠান নিবন্ধন আবেদন (লাইভ)
            </h2>
            <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">
              অনুমোদনে স্বয়ংক্রিয় কোড (ACD-00001) তৈরি, অধ্যক্ষ Auth অ্যাকাউন্ট তৈরি ও পাসওয়ার্ড সেটআপ ইমেইল পাঠানো হয়।
            </p>
          </div>
          {pendingCount > 0 && (
            <Pill variant="warning">{formatNumeral(pendingCount, numeralLocale)}টি অপেক্ষমাণ</Pill>
          )}
        </div>
        <DataTable
          columns={appColumns}
          data={applicationsList}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="কোনো নতুন আবেদন নেই"
              description="নতুন প্রতিষ্ঠান নিবন্ধন করলে এখানে সরাসরি তালিকাভুক্ত হবে।"
            />
          }
        />
      </section>

      {/* Institution Switcher */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <Select
              label="প্রতিষ্ঠান সুইচার (যেকোনো প্রতিষ্ঠানের ড্যাশবোর্ড পরিচালনা করুন)"
              value={selectedSwitchId}
              onChange={(e) => setSelectedSwitchId(e.target.value)}
            >
              {db.institutions
                .filter((i) => i.status === 'approved')
                .map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.district})
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={handleEnterInstitution}
              disabled={!selectedSwitchId}
            >
              প্রতিষ্ঠানে প্রবেশ করুন
            </Button>
            <Button
              variant="outline"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setAddOpen(true)}
            >
              নতুন প্রতিষ্ঠান যোগ করুন
            </Button>
          </div>
        </div>
      </Card>

      {/* Registered Institutions List */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
          প্রতিষ্ঠান তালিকা ও স্ট্যাটাস নিয়ন্ত্রণ
        </h2>
        <DataTable
          columns={instColumns}
          data={db.institutions}
          rowKey={(r) => r.id}
        />
      </section>

      {/* User & Role Management */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
              ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা
            </h2>
          </div>
          <div className="w-full md:w-72">
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {USER_TABS.map((tab) => (
            <button
              key={tab.role}
              type="button"
              onClick={() => setUserTab(tab.role)}
              className={`px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                userTab === tab.role
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] text-[#5D6785] dark:text-[#98A2C7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={userColumns}
          data={filteredUsers.slice(0, 25)}
          rowKey={(u) => u.id}
          emptyState={
            <EmptyState
              title="কোনো ব্যবহারকারী পাওয়া যায়নি"
              description="অন্য ভূমিকা নির্বাচন করুন অথবা অনুসন্ধান পরিবর্তন করুন।"
            />
          }
        />
      </section>

      {/* Approve Application Confirm */}
      <ConfirmDialog
        open={Boolean(approveConfirmApp)}
        onClose={() => setApproveConfirmApp(null)}
        title="প্রতিষ্ঠান আবেদন অনুমোদন করুন"
        description={
          approveConfirmApp
            ? `"${approveConfirmApp.institutionName}" অনুমোদন করলে নতুন ইউনিক কোড (যেমন ACD-00001) তৈরি হবে, অধ্যক্ষের (${approveConfirmApp.email}) Firebase অ্যাকাউন্ট তৈরি হবে এবং পাসওয়ার্ড সেট করার ইমেইল পাঠানো হবে।`
            : ''
        }
        confirmVariant="primary"
        confirmLabel="অনুমোদন ও ইমেইল পাঠান"
        onConfirm={() => {
          if (approveConfirmApp) void handleApproveApplication(approveConfirmApp);
        }}
      />

      {/* Reject Application Modal with Required Reason */}
      <Modal
        open={Boolean(rejectModalApp)}
        onClose={() => setRejectModalApp(null)}
        title="আবেদন বাতিল করুন"
        subtitle={rejectModalApp ? `${rejectModalApp.institutionName} (${rejectModalApp.email})` : ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalApp(null)}>
              ফিরে যান
            </Button>
            <Button
              type="submit"
              form="reject-app-form"
              variant="danger"
              isLoading={Boolean(rejectModalApp && actionLoadingId === rejectModalApp.id)}
            >
              বাতিল নিশ্চিত করুন
            </Button>
          </>
        }
      >
        <form id="reject-app-form" onSubmit={handleRejectApplication} className="space-y-3">
          <Textarea
            label="বাতিলের কারণ (আবশ্যক)"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="যেমন: প্রদত্ত EIIN নম্বর ও নথিপত্র যাচাইয়ে অমিল পাওয়া গেছে।"
            error={rejectError}
          />
        </form>
      </Modal>

      {/* Status Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(statusConfirm)}
        onClose={() => setStatusConfirm(null)}
        title="প্রতিষ্ঠানের স্ট্যাটাস পরিবর্তন"
        description={
          statusConfirm
            ? `আপনি কি নিশ্চিত "${statusConfirm.inst.name}" এর স্ট্যাটাস "${STATUS_BADGE[statusConfirm.nextStatus].label}" করতে চান?`
            : ''
        }
        confirmVariant={statusConfirm?.nextStatus === 'approved' ? 'primary' : 'danger'}
        confirmLabel="নিশ্চিত করুন"
        onConfirm={() => {
          if (!statusConfirm) return;
          updateInstitutionStatus(statusConfirm.inst.id, statusConfirm.nextStatus);
          showToast('প্রতিষ্ঠানের স্ট্যাটাস হালনাগাদ হয়েছে', 'success');
        }}
      />

      {/* Delete Institution with Typed Name Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="প্রতিষ্ঠান স্থায়ীভাবে মুছে ফেলুন"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" মুছে ফেললে এর সকল শ্রেণি, শিক্ষার্থী ও পরীক্ষা মুছে যাবে।`
            : ''
        }
        confirmLabel="প্রতিষ্ঠান মুছুন"
        requireTypedText={deleteTarget?.name}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteInstitution(deleteTarget.id);
          showToast('প্রতিষ্ঠান মুছে ফেলা হয়েছে', 'success');
        }}
      />

      {/* Add Institution Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="নতুন প্রতিষ্ঠান যুক্ত করুন"
        subtitle="সুপার এডমিন কর্তৃক যুক্ত প্রতিষ্ঠান সরাসরি অনুমোদিত হিসেবে সক্রিয় হবে।"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit" form="add-inst-form">
              প্রতিষ্ঠান সংরক্ষণ করুন
            </Button>
          </>
        }
      >
        <form id="add-inst-form" onSubmit={handleAddInstitution} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="প্রতিষ্ঠানের নাম"
              value={newInst.name}
              onChange={(e) => setNewInst((p) => ({ ...p, name: e.target.value }))}
            />
            <Select
              label="ধরন"
              value={newInst.type}
              onChange={(e) => setNewInst((p) => ({ ...p, type: e.target.value as 'school' | 'college' | 'madrasa' }))}
            >
              <option value="school">স্কুল</option>
              <option value="college">কলেজ</option>
              <option value="madrasa">মাদ্রাসা</option>
            </Select>
            <Input
              label="EIIN"
              value={newInst.eiin}
              onChange={(e) => setNewInst((p) => ({ ...p, eiin: e.target.value }))}
            />
            <Input
              label="জেলা"
              value={newInst.district}
              onChange={(e) => setNewInst((p) => ({ ...p, district: e.target.value }))}
            />
            <Input
              label="ঠিকানা"
              value={newInst.address}
              onChange={(e) => setNewInst((p) => ({ ...p, address: e.target.value }))}
            />
            <Input
              label="ফোন"
              value={newInst.phone}
              onChange={(e) => setNewInst((p) => ({ ...p, phone: e.target.value }))}
            />
            <Input
              label="অধ্যক্ষের নাম"
              value={newInst.principalName}
              onChange={(e) => setNewInst((p) => ({ ...p, principalName: e.target.value }))}
            />
            <Input
              label="অধ্যক্ষের ইমেইল"
              type="email"
              value={newInst.email}
              onChange={(e) => setNewInst((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <Input
            label="প্রাথমিক পাসওয়ার্ড"
            type="password"
            value={newInst.password}
            onChange={(e) => setNewInst((p) => ({ ...p, password: e.target.value }))}
            error={addError}
          />
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="পাসওয়ার্ড রিসেট করুন"
        subtitle={resetTarget ? `${resetTarget.name} (${resetTarget.email})` : ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetTarget(null)}>
              বাতিল
            </Button>
            <Button
              onClick={() => {
                if (!resetTarget) return;
                const res = resetUserPassword(resetTarget.id, newPw);
                if (!res.ok) {
                  showToast(res.error ?? 'রিসেট করা যায়নি', 'danger');
                  return;
                }
                setResetTarget(null);
                showToast('পাসওয়ার্ড সফলভাবে রিসেট হয়েছে', 'success');
              }}
            >
              পাসওয়ার্ড আপডেট
            </Button>
          </>
        }
      >
        <Input
          label="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          helperText="নিরাপত্তার কারণে পূর্ববর্তী পাসওয়ার্ড প্রদর্শন করা হয় না।"
        />
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmDialog
        open={Boolean(deleteUserTarget)}
        onClose={() => setDeleteUserTarget(null)}
        title="ব্যবহারকারী মুছে ফেলুন"
        description={
          deleteUserTarget
            ? `আপনি কি নিশ্চিত "${deleteUserTarget.name}" অ্যাকাউন্টটি মুছে ফেলতে চান?`
            : ''
        }
        onConfirm={() => {
          if (!deleteUserTarget) return;
          deleteUserAccount(deleteUserTarget.id);
          showToast('ব্যবহারকারী মুছে ফেলা হয়েছে', 'success');
        }}
      />
    </div>
  );
};
