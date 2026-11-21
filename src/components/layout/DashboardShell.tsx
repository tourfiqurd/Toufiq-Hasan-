import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Paperclip,
  PenTool,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { formatNumeral } from '../../lib/grading/numerals';
import { useApp } from '../../store/AppContext';
import type { UserRole } from '../../types/domain';
import { BrandLogo } from '../ui/BrandLogo';
import { Button } from '../ui/Button';
import { Input } from '../ui/FormControls';
import { Modal } from '../ui/Modal';
import { Pill } from '../ui/Pill';

export interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'সুপার এডমিন',
  institution_admin: 'অধ্যক্ষ',
  teacher: 'শিক্ষক',
  student: 'শিক্ষার্থী',
  parent: 'অভিভাবক',
};

export function getRoleMenu(role: UserRole): MenuItem[] {
  if (role === 'super_admin') {
    return [
      { key: 'overview', label: 'এডমিন ড্যাশবোর্ড', icon: <Building2 className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'notices', label: 'নোটিশ বোর্ড', icon: <Megaphone className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'audit', label: 'অডিট ও নিরাপত্তা লগ', icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.75} /> },
    ];
  }

  if (role === 'institution_admin') {
    return [
      { key: 'overview', label: 'প্রতিষ্ঠান নিয়ন্ত্রণ', icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'classes', label: 'শ্রেণি, শাখা ও বিষয়', icon: <BookOpen className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'teachers', label: 'শিক্ষক ও বিষয় বণ্টন', icon: <Users className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'students', label: 'শিক্ষার্থী ব্যবস্থাপনা', icon: <GraduationCap className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'exams', label: 'পরীক্ষা ও নম্বর বণ্টন', icon: <ClipboardCheck className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'marks', label: 'নম্বর এন্ট্রি ও খসড়া', icon: <PenTool className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'approval', label: 'ফলাফল অনুমোদন ও প্রকাশ', icon: <CheckSquare className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'tabulation', label: 'ট্যাবুলেশন শিট ও মার্কশিট', icon: <FileSpreadsheet className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'notices', label: 'নোটিশ বোর্ড', icon: <Megaphone className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'settings', label: 'প্রতিষ্ঠান সেটিংস', icon: <Settings className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'audit', label: 'অডিট লগ', icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.75} /> },
    ];
  }

  if (role === 'teacher') {
    return [
      { key: 'classes', label: 'শ্রেণি ও শাখাসমূহ', icon: <BookOpen className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'assignments', label: 'অ্যাসাইনমেন্ট ও হোমওয়ার্ক', icon: <Paperclip className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'marks', label: 'নম্বর এন্ট্রি', icon: <PenTool className="w-5 h-5" strokeWidth={1.75} /> },
      { key: 'notices', label: 'নোটিশ বোর্ড', icon: <Megaphone className="w-5 h-5" strokeWidth={1.75} /> },
    ];
  }

  // student or parent
  return [
    {
      key: 'results',
      label: role === 'parent' ? 'সন্তানের ফলাফল ও মার্কশিট' : 'আমার ফলাফল ও মার্কশিট',
      icon: <Award className="w-5 h-5" strokeWidth={1.75} />,
    },
    { key: 'assignments', label: 'আমার অ্যাসাইনমেন্ট', icon: <Paperclip className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'notices', label: 'নোটিশ বোর্ড', icon: <Megaphone className="w-5 h-5" strokeWidth={1.75} /> },
  ];
}

export const DashboardShell: React.FC = () => {
  const {
    db,
    user,
    actingInstitutionId,
    setActingInstitutionId,
    academicYear,
    setAcademicYear,
    addAcademicYear,
    deleteAcademicYear,
    theme,
    toggleTheme,
    numeralLocale,
    setNumeralLocale,
    logout,
    repo,
    showToast,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('academia_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('2027');
  const [copyStructure, setCopyStructure] = useState(true);
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    try {
      sessionStorage.setItem('academia_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  if (!user) return null;

  const effectiveRole: UserRole =
    user.role === 'super_admin' && actingInstitutionId ? 'institution_admin' : user.role;
  const menuItems = getRoleMenu(effectiveRole);
  const baseDashboardPath = `/dashboard/${effectiveRole}`;
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentTabSlug = pathSegments[2] ?? menuItems[0]?.key;
  const activeMenu = menuItems.find((m) => m.key === currentTabSlug) ?? menuItems[0];

  const actingInstitution = actingInstitutionId
    ? db.institutions.find((i) => i.id === actingInstitutionId)
    : null;

  const showYearSwitcher =
    effectiveRole === 'institution_admin' || effectiveRole === 'teacher';
  const availableYears = repo?.getAcademicYears() ?? [];

  const canDeleteSelectedYear = (() => {
    if (!repo) return false;
    const instId = repo.getEffectiveInstitutionId();
    if (!instId || availableYears.length <= 1) return false;
    const hasStudents = db.students.some(
      (s) => s.institutionId === instId && s.academicYear === academicYear
    );
    const hasExams = db.exams.some(
      (e) => e.institutionId === instId && e.academicYear === academicYear
    );
    return !hasStudents && !hasExams;
  })();

  const handleCreateYear = () => {
    const parsed = Number(newYearInput);
    const res = addAcademicYear(parsed, copyStructure);
    if (!res.ok) {
      setYearError(res.error ?? 'ত্রুটি হয়েছে।');
      return;
    }
    setYearError('');
    setYearModalOpen(false);
    showToast(`শিক্ষাবর্ষ ${formatNumeral(parsed, numeralLocale)} যুক্ত হয়েছে`, 'success');
  };

  const handleLogout = () => {
    logout();
    showToast('সফলভাবে লগআউট সম্পন্ন হয়েছে', 'default');
    navigate('/login', { replace: true });
  };

  const renderSidebarNav = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full text-white select-none">
      <div className="h-[72px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <Link
          to={`${baseDashboardPath}/${menuItems[0]?.key ?? ''}`}
          onClick={() => {
            if (isMobileDrawer) setMobileOpen(false);
          }}
          aria-label="ড্যাশবোর্ড মূল পাতা"
        >
          <BrandLogo onDark collapsed={!isMobileDrawer && collapsed} />
        </Link>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="সাইডবার বন্ধ করুন"
            className="p-2 rounded-[10px] text-white/80 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto scrollbar-hidden px-3 py-4 space-y-1.5"
        aria-label="ড্যাশবোর্ড মেনু"
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.key}
            to={`${baseDashboardPath}/${item.key}`}
            title={!isMobileDrawer && collapsed ? item.label : undefined}
            onClick={() => {
              if (isMobileDrawer) setMobileOpen(false);
            }}
            className={({ isActive }) =>
              `group w-full h-[44px] px-3.5 rounded-[11px] flex items-center gap-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-brand-gradient text-white shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-[3px]'
              } ${!isMobileDrawer && collapsed ? 'justify-center px-0' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`shrink-0 ${
                    isActive ? 'text-white opacity-100' : 'opacity-80 group-hover:opacity-100'
                  }`}
                >
                  {item.icon}
                </span>
                {(isMobileDrawer || !collapsed) && (
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          type="button"
          title={!isMobileDrawer && collapsed ? 'লগআউট' : undefined}
          onClick={handleLogout}
          className={`w-full h-[44px] px-3.5 rounded-[11px] flex items-center gap-3 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
            !isMobileDrawer && collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          {(isMobileDrawer || !collapsed) && <span className="whitespace-nowrap">লগআউট</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FC] dark:bg-[#0B1020] text-[#111936] dark:text-[#E8ECFB]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden min-[860px]:block shrink-0 bg-sidebar-gradient transition-all duration-350 no-print sticky top-0 h-screen ${
          collapsed ? 'w-[76px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarNav(false)}
      </aside>

      {/* Mobile Slide-in Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex min-[860px]:hidden no-print">
          <div
            className="fixed inset-0 bg-[#0B1437]/65 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[272px] h-full bg-sidebar-gradient shadow-2xl">
            {renderSidebarNav(true)}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {actingInstitution && (
          <div className="bg-[#0B1437] text-white px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 no-print">
            <p className="text-sm font-semibold">
              আপনি আছেন: <span className="text-[#FCD34D]">{actingInstitution.name}</span>
            </p>
            <Button
              size="sm"
              variant="outline-white"
              onClick={() => {
                setActingInstitutionId(null);
                navigate('/dashboard/super_admin/overview');
              }}
            >
              সুপার এডমিনে ফিরে যান
            </Button>
          </div>
        )}

        {/* Sticky Topbar */}
        <header className="sticky top-0 z-30 h-[72px] bg-white dark:bg-[#141B34] border-b border-[#E2E6F3] dark:border-[#262F52] px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 860) {
                  setMobileOpen(true);
                } else {
                  setCollapsed((c) => !c);
                }
              }}
              aria-label="সাইডবার টগল করুন"
              className="p-2 rounded-[10px] text-[#5D6785] hover:text-[#111936] dark:text-[#98A2C7] dark:hover:text-white hover:bg-[#4F46E5]/10 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#111936] dark:text-[#E8ECFB] truncate">
              {activeMenu?.label ?? 'ড্যাশবোর্ড'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {showYearSwitcher && (
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <Calendar
                    className="w-4 h-4 text-[#4F46E5] dark:text-[#A5B4FC] absolute left-2.5 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    aria-label="শিক্ষাবর্ষ নির্বাচন করুন"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value))}
                    className="appearance-none rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC] dark:bg-[#0B1020] pl-8 pr-7 py-1.5 text-xs sm:text-sm font-semibold tabular-nums text-[#111936] dark:text-[#E8ECFB] cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y.id} value={y.year}>
                        শিক্ষাবর্ষ {formatNumeral(y.year, numeralLocale)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-[#5D6785] absolute right-2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                {effectiveRole === 'institution_admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setYearModalOpen(true)}
                      aria-label="নতুন শিক্ষাবর্ষ যোগ করুন"
                      title="নতুন শিক্ষাবর্ষ যোগ করুন"
                      className="p-2 rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] text-[#4F46E5] dark:text-[#A5B4FC] hover:bg-[#4F46E5]/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {canDeleteSelectedYear && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = deleteAcademicYear(academicYear);
                          if (res.ok) showToast('ফাঁকা শিক্ষাবর্ষ মুছে ফেলা হয়েছে', 'success');
                          else showToast(res.error ?? 'মুছে ফেলা যায়নি', 'danger');
                        }}
                        aria-label="বর্তমান শিক্ষাবর্ষ মুছুন"
                        title="শিক্ষার্থী/পরীক্ষাবিহীন শিক্ষাবর্ষ মুছুন"
                        className="p-2 rounded-[10px] border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setNumeralLocale(numeralLocale === 'bn' ? 'en' : 'bn')}
              aria-label="সংখ্যা পদ্ধতি পরিবর্তন (বাংলা/ইংরেজি)"
              title="সংখ্যা পদ্ধতি পরিবর্তন (১২৩ / 123)"
              className="inline-flex items-center px-2.5 py-1.5 rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] text-xs font-bold text-[#111936] dark:text-[#E8ECFB] hover:bg-[#4F46E5]/10 cursor-pointer tabular-nums"
            >
              {numeralLocale === 'bn' ? '১২৩' : '123'}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="থিম পরিবর্তন করুন"
              title="লাইট / ডার্ক থিম"
              className="p-2 rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] text-[#111936] dark:text-[#E8ECFB] hover:bg-[#4F46E5]/10 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden md:flex items-center gap-2 pl-1">
              <Pill variant="neutral">{ROLE_LABELS[user.role]}</Pill>
            </div>
          </div>
        </header>

        {/* Nested Route Content Area */}
        <main
          key={`${location.pathname}-${academicYear}-${actingInstitutionId ?? 'none'}`}
          className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto transition-opacity duration-300"
        >
          <Outlet />
        </main>
      </div>

      {/* Add Academic Year Modal */}
      <Modal
        open={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title="নতুন শিক্ষাবর্ষ যোগ করুন"
        subtitle="নতুন শিক্ষাবর্ষ তৈরি করলে চাইলে বর্তমান কাঠামো কপি করতে পারবেন।"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setYearModalOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={handleCreateYear}>শিক্ষাবর্ষ যোগ করুন</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="শিক্ষাবর্ষ (খ্রিস্টাব্দ)"
            type="number"
            value={newYearInput}
            onChange={(e) => setNewYearInput(e.target.value)}
            error={yearError}
            placeholder="যেমন: 2027"
          />
          <label className="flex items-start gap-2.5 text-sm text-[#111936] dark:text-[#E8ECFB] cursor-pointer">
            <input
              type="checkbox"
              checked={copyStructure}
              onChange={(e) => setCopyStructure(e.target.checked)}
              className="mt-1 rounded border-[#E2E6F3] text-[#4F46E5]"
            />
            <span>বর্তমান শিক্ষাবর্ষের শ্রেণি, শাখা, বিষয় ও শিক্ষক বণ্টন কপি করুন</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};
