import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import type { UserRole } from '../../types/domain';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';

const DEMO_ROLES: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  email: string;
  pass: string;
}> = [
  {
    role: 'super_admin',
    title: 'সুপার এডমিন',
    subtitle: 'প্ল্যাটফর্ম ও প্রতিষ্ঠান অনুমোদন',
    email: 'superadmin@academia.edu.bd',
    pass: 'admin123',
  },
  {
    role: 'institution_admin',
    title: 'অধ্যক্ষ',
    subtitle: 'শ্রেণি, পরীক্ষা ও ফলাফল প্রকাশ',
    email: 'principal@adarsha.edu.bd',
    pass: 'principal123',
  },
  {
    role: 'teacher',
    title: 'শিক্ষক',
    subtitle: 'নম্বর এন্ট্রি ও অ্যাসাইনমেন্ট',
    email: 'teacher1@adarsha.edu.bd',
    pass: 'teacher123',
  },
  {
    role: 'student',
    title: 'শিক্ষার্থী / অভিভাবক',
    subtitle: 'প্রবেশপত্র ও প্রকাশিত মার্কশিট',
    email: 'student1@adarsha.edu.bd',
    pass: 'student123',
  },
];

function roleHomePath(role: UserRole): string {
  if (role === 'teacher') return '/dashboard/teacher/classes';
  if (role === 'student' || role === 'parent') return '/dashboard/student/results';
  return `/dashboard/${role}/overview`;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, loginDemoRole, showToast } = useApp();
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('institution_admin');
  const [email, setEmail] = useState('principal@adarsha.edu.bd');
  const [password, setPassword] = useState('principal123');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSelectRoleCard = (item: (typeof DEMO_ROLES)[number]) => {
    setSelectedDemoRole(item.role);
    setEmail(item.email);
    setPassword(item.pass);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    window.setTimeout(() => {
      const res = loginWithCredentials(email, password, remember);
      setLoading(false);
      if (!res.ok || !res.data) {
        setError(res.error ?? 'ইমেইল বা পাসওয়ার্ড মিলছে না। আবার চেষ্টা করুন।');
        setShake(true);
        window.setTimeout(() => setShake(false), 350);
        return;
      }
      navigate(roleHomePath(res.data.role));
    }, 550);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] grid grid-cols-1 min-[860px]:grid-cols-12">
      {/* Left Hero Column */}
      <div className="hidden min-[860px]:flex min-[860px]:col-span-5 relative overflow-hidden bg-[#0B1437] text-white p-12 flex-col justify-between">
        <img
          src="/src/assets/images/library_study_card_1795266091398.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0B1437]/92 via-[#1B1A5C]/85 to-[#0B4F5C]/80"
          aria-hidden="true"
        />

        <div className="relative space-y-8 my-auto">
          <BrandLogo onDark />
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-snug">আপনার ড্যাশবোর্ডে ফিরে আসুন</h1>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                <span>অধ্যক্ষ, শিক্ষক, শিক্ষার্থী ও অভিভাবকের সমন্বিত পোর্টাল</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                <span>লাইভ নম্বর এন্ট্রি, ট্যাবুলেশন ও A4 মার্কশিট প্রিন্ট</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                <span>বহু শিক্ষাবর্ষ ও ভূমিকাভিত্তিক নিরাপদ ডেটা অ্যাক্সেস</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="relative text-xs text-white/75">
          অভিভাবক ডেমো: parent@adarsha.edu.bd / parent123
        </p>
      </div>

      {/* Right Form Column */}
      <div className="min-[860px]:col-span-7 bg-[#F4F6FC] dark:bg-[#0B1020] flex items-center justify-center p-5 sm:p-10">
        <Card
          padding="lg"
          className={`w-full max-w-[480px] rounded-[20px] ${shake ? 'animate-shake' : ''}`}
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#111936] dark:text-[#E8ECFB]">লগইন করুন</h2>
              <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] mt-1">
                ডেমো ভূমিকা বেছে নিন অথবা আপনার অ্যাকাউন্টের ইমেইল ও পাসওয়ার্ড দিন।
              </p>
            </div>

            {/* 4 Role Radio Cards */}
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="ডেমো ভূমিকা নির্বাচন">
              {DEMO_ROLES.map((item) => {
                const selected = selectedDemoRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelectRoleCard(item)}
                    className={`text-left p-3 rounded-[12px] border-[1.5px] transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#4F46E5]/[0.10] border-[#4F46E5] dark:bg-[#4F46E5]/20 dark:border-[#818CF8]'
                        : 'border-[#E2E6F3] dark:border-[#262F52] hover:border-[#4F46E5]/50'
                    }`}
                  >
                    <p className="text-xs font-bold text-[#111936] dark:text-[#E8ECFB]">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#5D6785] dark:text-[#98A2C7] mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="ইমেইল"
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu.bd"
              />

              <Input
                label="পাসওয়ার্ড"
                type={showPass ? 'text' : 'password'}
                leftIcon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    className="p-1 text-[#5D6785] hover:text-[#111936] dark:text-[#98A2C7] dark:hover:text-white cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-[#5D6785] dark:text-[#98A2C7] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-[#E2E6F3] text-[#4F46E5]"
                  />
                  <span>মনে রাখুন</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="font-semibold text-[#4F46E5] dark:text-[#A5B4FC] hover:underline cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                ড্যাশবোর্ডে প্রবেশ করুন
              </Button>
            </form>

            <div className="pt-2 border-t border-[#E2E6F3] dark:border-[#262F52] flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                type="button"
                onClick={() => {
                  const s = loginDemoRole('parent');
                  navigate(roleHomePath(s.role));
                }}
                className="font-semibold text-[#14B8A6] hover:underline cursor-pointer"
              >
                অভিভাবক ডেমো (২ সন্তান) দেখুন
              </button>
              <span className="text-[#5D6785] dark:text-[#98A2C7]">
                নতুন প্রতিষ্ঠান?{' '}
                <Link
                  to="/register"
                  className="font-bold text-[#4F46E5] dark:text-[#A5B4FC] hover:underline"
                >
                  নিবন্ধন করুন
                </Link>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="পাসওয়ার্ড পুনরুদ্ধার"
        subtitle="নিরাপত্তার স্বার্থে আপনার প্রতিষ্ঠানের অধ্যক্ষ বা সুপার এডমিন নতুন পাসওয়ার্ড রিসেট করে দিতে পারবেন।"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForgotOpen(false)}>
              বন্ধ করুন
            </Button>
            <Button
              onClick={() => {
                setForgotOpen(false);
                showToast('পাসওয়ার্ড রিসেট অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে', 'success');
              }}
            >
              অনুরোধ পাঠান
            </Button>
          </>
        }
      >
        <Input
          label="আপনার নিবন্ধিত ইমেইল"
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="name@institution.edu.bd"
        />
      </Modal>
    </div>
  );
};
