import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, MailCheck, ShieldCheck, Upload, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { submitInstitutionApplication } from '../../lib/applicationsApi';
import { useApp } from '../../store/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControls';
import { Pill } from '../../components/ui/Pill';

const DISTRICTS = ['ঢাকা', 'চট্টগ্রাম', 'কুমিল্লা', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ'];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerInstitution, showToast } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [institutionName, setInstitutionName] = useState('');
  const [type, setType] = useState<'school' | 'college' | 'madrasa'>('school');
  const [eiin, setEiin] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);

  const [principalName, setPrincipalName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  const handleLogoChange = (file?: File) => {
    if (!file) return;
    if (file.size > 350 * 1024) {
      setError('লোগো ফাইল ৩৫০ KB এর কম হতে হবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (institutionName.trim().length < 3) return 'প্রতিষ্ঠানের নাম কমপক্ষে ৩ অক্ষরের দিন।';
    if (eiin.trim().length < 4) return 'বৈধ EIIN নম্বর দিন।';
    if (address.trim().length < 4) return 'প্রতিষ্ঠানের ঠিকানা দিন।';
    return '';
  };

  const validateStep2 = () => {
    if (principalName.trim().length < 3) return 'অধ্যক্ষের নাম লিখুন।';
    if (phone.trim().length < 10) return 'বৈধ মোবাইল নম্বর দিন।';
    if (!email.includes('@')) return 'সঠিক ইমেইল ঠিকানা দিন।';
    return '';
  };

  const handleNext = () => {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => (s === 1 ? 2 : 3));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    const payload = {
      institutionName,
      type,
      eiin,
      address,
      district,
      principalName,
      phone,
      email,
      logoDataUrl,
      acceptedTerms,
    };

    const rtdbRes = await submitInstitutionApplication(payload);
    setSubmitting(false);

    if (!rtdbRes.ok || !rtdbRes.data) {
      setError(rtdbRes.error ?? 'আবেদন জমা দেওয়া যায়নি।');
      return;
    }

    registerInstitution({
      id: rtdbRes.data.id,
      ...payload,
    });
    setSubmitted(true);
    showToast('প্রতিষ্ঠান নিবন্ধন আবেদন জমা হয়েছে (অপেক্ষমাণ)', 'success');
  };

  const typeLabel = type === 'school' ? 'স্কুল' : type === 'college' ? 'কলেজ' : 'মাদ্রাসা';

  return (
    <div className="bg-[#F4F6FC] dark:bg-[#0B1020] min-h-[calc(100vh-72px)] pb-16">
      {/* Header Band */}
      <section className="relative overflow-hidden bg-[#0B1437] text-white pt-28 pb-24">
        <img
          src="/src/assets/images/hero_campus_gate_1795266091523.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0B1437]/92 via-[#1B1A5C]/85 to-[#0B4F5C]/75"
          aria-hidden="true"
        />
        <div className="relative max-w-[1250px] mx-auto px-5 sm:px-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">প্রতিষ্ঠান নিবন্ধন</h1>
          <p className="text-white/85">আবেদন জমা দিন। সুপার এডমিন যাচাই করে অনুমোদন দেবেন।</p>
        </div>
      </section>

      {/* Overlapping Form & Side Checklist */}
      <div className="max-w-[1250px] mx-auto px-5 sm:px-8 -mt-[60px] relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <Card padding="lg" className="rounded-[20px]">
            {submitted ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#14B8A6]/15 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                    <motion.path
                      d="M8 18.5L15 25.5L28 11.5"
                      stroke="#14B8A6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <Pill variant="warning">অপেক্ষমাণ</Pill>
                  </div>
                  <h2 className="text-2xl font-bold text-[#111936] dark:text-[#E8ECFB]">
                    আবেদন জমা হয়েছে
                  </h2>
                  <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] max-w-md mx-auto">
                    সুপার এডমিন যাচাই করে অনুমোদন দেওয়ার পর অধ্যক্ষের ইমেইলে (<span className="font-semibold">{email}</span>) ইউনিক প্রতিষ্ঠান কোড ও <span className="font-semibold">পাসওয়ার্ড সেট করার লিংক</span> পাঠানো হবে।
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button onClick={() => navigate('/login')}>লগইন পেজে যান</Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    হোমপেজে ফিরুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3-Step Professional Segmented Progress Bar */}
                <div className="rounded-[16px] bg-[#F4F6FC] dark:bg-[#0B1020] border border-[#E2E6F3] dark:border-[#262F52] p-3 space-y-3">
                  <div className="h-1.5 w-full rounded-full bg-[#E2E6F3] dark:bg-[#262F52] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-gradient transition-all duration-500 ease-out"
                      style={{ width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 1 as const, label: 'প্রতিষ্ঠান', sub: 'প্রাথমিক তথ্য', icon: Building2 },
                      { id: 2 as const, label: 'অধ্যক্ষ', sub: 'অ্যাকাউন্ট সেটআপ', icon: UserCheck },
                      { id: 3 as const, label: 'নিশ্চিত করুন', sub: 'পর্যালোচনা ও জমা', icon: ShieldCheck },
                    ].map((item) => {
                      const isActive = step === item.id;
                      const isDone = step > item.id;
                      const StepIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!isDone}
                          onClick={() => {
                            if (isDone) {
                              setError('');
                              setStep(item.id);
                            }
                          }}
                          className={`flex items-center gap-2.5 p-2.5 sm:px-3 sm:py-2.5 rounded-[12px] text-left border transition-all ${
                            isActive
                              ? 'bg-white dark:bg-[#141B34] border-[#4F46E5]/50 shadow-sm'
                              : isDone
                              ? 'bg-white/70 dark:bg-[#141B34]/70 border-[#14B8A6]/40 hover:border-[#14B8A6] cursor-pointer'
                              : 'bg-transparent border-transparent opacity-65 cursor-default'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isDone
                                ? 'bg-[#14B8A6] text-white'
                                : isActive
                                ? 'bg-brand-gradient text-white shadow-sm'
                                : 'bg-[#E2E6F3] dark:bg-[#262F52] text-[#5D6785] dark:text-[#98A2C7]'
                            }`}
                          >
                            {isDone ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <StepIcon className="w-4 h-4" />}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-xs sm:text-sm font-bold truncate ${
                                isActive || isDone
                                  ? 'text-[#111936] dark:text-[#E8ECFB]'
                                  : 'text-[#5D6785] dark:text-[#98A2C7]'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="hidden sm:block text-[11px] text-[#5D6785] dark:text-[#98A2C7] truncate">
                              {item.sub}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  {step === 1 && (
                    <div className="space-y-4">
                      <Input
                        label="প্রতিষ্ঠানের নাম"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="যেমন: উদয়ন আদর্শ উচ্চ বিদ্যালয়"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Select
                          label="ধরন"
                          value={type}
                          onChange={(e) => setType(e.target.value as typeof type)}
                        >
                          <option value="school">স্কুল</option>
                          <option value="college">কলেজ</option>
                          <option value="madrasa">মাদ্রাসা</option>
                        </Select>
                        <Input
                          label="EIIN নম্বর"
                          value={eiin}
                          onChange={(e) => setEiin(e.target.value)}
                          placeholder="যেমন: 108452"
                        />
                        <Select
                          label="জেলা"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                        >
                          {DISTRICTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Input
                        label="ঠিকানা"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="বাড়ি/রাস্তা, থানা ও পোস্ট কোড"
                      />
                      <div>
                        <label className="block text-sm font-semibold text-[#111936] dark:text-[#E8ECFB] mb-1.5">
                          প্রতিষ্ঠানের লোগো (ঐচ্ছিক)
                        </label>
                        <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-[12px] border-2 border-dashed border-[#4F46E5]/45 bg-[#4F46E5]/[0.04] hover:bg-[#4F46E5]/[0.08] cursor-pointer text-center">
                          {logoDataUrl ? (
                            <img
                              src={logoDataUrl}
                              alt="লোগো প্রিভিউ"
                              className="w-16 h-16 rounded-[12px] object-cover"
                            />
                          ) : (
                            <Upload className="w-6 h-6 text-[#4F46E5]" />
                          )}
                          <span className="text-xs font-medium text-[#5D6785] dark:text-[#98A2C7]">
                            PNG বা JPG লোগো আপলোড করতে ক্লিক করুন
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoChange(e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <Input
                        label="অধ্যক্ষ / প্রধান শিক্ষকের নাম"
                        value={principalName}
                        onChange={(e) => setPrincipalName(e.target.value)}
                        placeholder="যেমন: অধ্যক্ষ মোঃ আবুল কালাম"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="মোবাইল নম্বর"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                        />
                        <Input
                          label="অফিসিয়াল ইমেইল"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="principal@school.edu.bd"
                        />
                      </div>
                      <div className="rounded-[12px] bg-[#4F46E5]/[0.07] dark:bg-[#4F46E5]/15 border border-[#4F46E5]/25 p-3.5 flex items-start gap-3">
                        <MailCheck className="w-5 h-5 text-[#4F46E5] dark:text-[#A5B4FC] shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-[#111936] dark:text-[#E8ECFB] leading-relaxed">
                          নিবন্ধনের সময় কোনো পাসওয়ার্ড নেওয়া হয় না। সুপার এডমিন আবেদন অনুমোদন করলে উপরোক্ত ইমেইলে পাসওয়ার্ড সেট করার নিরাপদ লিংক পাঠানো হবে।
                        </p>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="rounded-[14px] bg-[#F4F6FC] dark:bg-[#0B1020] border border-[#E2E6F3] dark:border-[#262F52] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-[#5D6785]">প্রতিষ্ঠান</p>
                          <p className="font-bold">{institutionName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5D6785]">ধরন ও EIIN</p>
                          <p className="font-bold tabular-nums">
                            {typeLabel} · {eiin}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5D6785]">জেলা ও ঠিকানা</p>
                          <p className="font-semibold">
                            {district}, {address}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5D6785]">অধ্যক্ষ ও ইমেইল</p>
                          <p className="font-semibold">
                            {principalName} ({email})
                          </p>
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 text-sm text-[#111936] dark:text-[#E8ECFB] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-1 rounded border-[#E2E6F3] text-[#4F46E5]"
                        />
                        <span>আমি প্রদত্ত সকল তথ্য সঠিক বলে নিশ্চিত করছি এবং প্ল্যাটফর্ম নীতিমালায় সম্মত।</span>
                      </label>
                    </div>
                  )}

                  {error && (
                    <p className="text-xs font-semibold text-[#DC2626] dark:text-[#FCA5A5]">
                      {error}
                    </p>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-3">
                    {step > 1 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError('');
                          setStep((s) => (s === 3 ? 2 : 1));
                        }}
                      >
                        পূর্ববর্তী ধাপ
                      </Button>
                    ) : (
                      <span />
                    )}

                    {step < 3 ? (
                      <Button onClick={handleNext}>পরবর্তী ধাপ</Button>
                    ) : (
                      <Button type="submit" isLoading={submitting}>
                        আবেদন জমা দিন
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>

        {/* Side Checklist */}
        <div className="lg:col-span-4 space-y-5">
          <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] bg-[#0B1437] shadow-md border border-[#E2E6F3] dark:border-[#262F52]">
            <img
              src="/src/assets/images/hero_graduation_celebration_1795266091950.jpg"
              alt="ফলাফল প্রকাশের দিনে কলেজ ও মাদ্রাসা শিক্ষার্থীদের আনন্দ"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1437]/90 via-[#0B1437]/25 to-transparent flex items-end p-4">
              <p className="text-xs font-semibold text-white leading-snug">
                ১২৪+ স্কুল, কলেজ ও মাদ্রাসার বিশ্বস্ত ডিজিটাল পোর্টাল
              </p>
            </div>
          </div>

          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">
              নিবন্ধনের পর যা পাবেন
            </h2>
            <ul className="space-y-3 text-sm text-[#5D6785] dark:text-[#98A2C7]">
              {[
                'অধ্যক্ষের জন্য পূর্ণাঙ্গ নিয়ন্ত্রণ ড্যাশবোর্ড',
                'শিক্ষক অ্যাকাউন্ট ও বিষয়ভিত্তিক বণ্টন',
                'CSV/Excel এর মাধ্যমে বাল্ক শিক্ষার্থী ইমপোর্ট',
                'প্রথম পরীক্ষা তৈরি, প্রবেশপত্র ও মার্কশিট PDF',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#14B8A6]/15 text-[#14B8A6] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-[#111936] dark:text-[#E8ECFB] font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
