import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Eye, Lock, Target } from 'lucide-react';
import { contactFormSchema, formatZodError } from '../../lib/validation';
import { useApp } from '../../store/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/FormControls';

const TEAM_MEMBERS = [
  {
    name: 'ড. মিজানুর রহমান',
    role: 'প্রতিষ্ঠাতা ও শিক্ষা উপদেষ্টা',
    image: '/src/assets/images/team_portrait_one_1795264390031.jpg',
  },
  {
    name: 'সাদিয়া আফরিন',
    role: 'প্রোডাক্ট ও কারিকুলাম প্রধান',
    image: '/src/assets/images/team_portrait_two_1795264390090.jpg',
  },
  {
    name: 'তানজিল আহমেদ',
    role: 'সিস্টেম আর্কিটেক্ট',
    image: '/src/assets/images/team_portrait_three_1795264390024.jpg',
  },
  {
    name: 'নুসরাত জাহান',
    role: 'প্রতিষ্ঠান সহায়তা প্রধান',
    image: '/src/assets/images/team_portrait_four_1795264389926.jpg',
  },
];

const SUPPORT_LIST = [
  'বাংলাদেশ শিক্ষাবোর্ডের A+ থেকে F পর্যন্ত পূর্ণাঙ্গ ও কাস্টম গ্রেডিং স্কেল',
  'CQ, MCQ ও ব্যবহারিক অংশের আলাদা পাস এবং একত্রে মোট পাস নিয়ম',
  'বাংলা ও ইংরেজি ১ম+২য় পত্র সমন্বিত যোগফল ও গড় ফলাফল হিসাব',
  '৪র্থ বিষয়ের অতিরিক্ত পয়েন্ট বোনাস ও ফেল করার নীতিমালা কাস্টমাইজেশন',
  'এক ক্লিকে একক ও বাল্ক A4 প্রবেশপত্র এবং অফিসিয়াল মার্কশিট PDF',
  'বহু শিক্ষাবর্ষ পরিচালনা ও পূর্ববর্তী বছরের কাঠামো কপি করার সুবিধা',
];

export const AboutPage: React.FC = () => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactFormSchema.safeParse({ name, email, message });
    if (!parsed.success) {
      setFormError(formatZodError(parsed.error));
      return;
    }
    setFormError('');
    setName('');
    setEmail('');
    setMessage('');
    showToast('আপনার বার্তা সফলভাবে পাঠানো হয়েছে', 'success');
  };

  return (
    <div>
      {/* Header Band */}
      <section className="relative overflow-hidden bg-[#0B1437] text-white pt-[72px] h-[270px] sm:h-[280px] flex items-center">
        <img
          src="/src/assets/images/hero_campus_gate_1795266091523.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0B1437]/92 via-[#1B1A5C]/85 to-[#0B4F5C]/75"
          aria-hidden="true"
        />
        <div className="relative max-w-[1250px] w-full mx-auto px-5 sm:px-8 space-y-2">
          <nav className="text-xs text-white/80 flex items-center gap-2" aria-label="ব্রেডক্রাম্ব">
            <Link to="/" className="hover:text-white">
              হোম
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">আমাদের সম্পর্কে</span>
          </nav>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold"
          >
            আমাদের সম্পর্কে
          </motion.h1>
          <p className="text-white/85 max-w-[36em]">
            শিক্ষা প্রতিষ্ঠানের ফলাফল প্রক্রিয়াকে সহজ ও নির্ভুল করাই আমাদের কাজ।
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-[#F4F6FC] dark:bg-[#0B1020]">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB] leading-tight">
              কাগজের ট্যাবুলেশন থেকে ডিজিটাল নির্ভরযোগ্যতায়
            </h2>
            <p className="text-[#5D6785] dark:text-[#98A2C7] leading-relaxed max-w-[34em]">
              প্রতিটি পরীক্ষার পর হাজারো খাতা দেখে হাতে-কলমে ট্যাবুলেশন শিট তৈরি, ১ম ও ২য় পত্রের গড় মেলানো এবং ৪র্থ বিষয়ের বোনাস পয়েন্ট হিসাব করতে গিয়ে শিক্ষকদের সপ্তাহের পর সপ্তাহ সময় ব্যয় হয়। সামান্য যোগ-বিয়োগের ভুলে শিক্ষার্থীদের ফলাফল প্রকাশেও বিলম্ব ঘটে।
            </p>
            <p className="text-[#5D6785] dark:text-[#98A2C7] leading-relaxed max-w-[34em]">
              বাংলাদেশের স্কুল, কলেজ ও মাদ্রাসার বাস্তব পরীক্ষা পদ্ধতির কথা মাথায় রেখেই একাডেমিয়া তৈরি করা হয়েছে—যাতে শিক্ষক শুধু নম্বর দেবেন, আর নির্ভুল গ্রেডিং, ট্যাবুলেশন ও মার্কশিট তৈরি হবে স্বয়ংক্রিয়ভাবে।
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative">
              <div
                className="absolute -inset-3 translate-x-3 translate-y-3 rounded-[20px] border-2 border-[#4F46E5]/35 pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] shadow-lg bg-[#0B1437]">
                <img
                  src="/src/assets/images/campus_classroom_bd_1795264390087.jpg"
                  alt="বাংলাদেশি মাধ্যমিক বিদ্যালয়ের শ্রেণিকক্ষে পাঠদান ও শিক্ষার্থীদের অধ্যয়ন"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-[#0B1437]/30"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-16 bg-[#F4F6FC] dark:bg-[#0B1020] pt-0">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Target className="w-6 h-6" />,
              title: 'লক্ষ্য',
              body: 'দেশের প্রতিটি স্কুল, কলেজ ও মাদ্রাসার ফলাফল ও একাডেমিক কার্যক্রম সম্পূর্ণ নির্ভুল এবং কাগজমুক্ত করা।',
            },
            {
              icon: <Eye className="w-6 h-6" />,
              title: 'দৃষ্টিভঙ্গি',
              body: 'অধ্যক্ষ, শিক্ষক, শিক্ষার্থী ও অভিভাবকের মধ্যে স্বচ্ছ ও তাৎক্ষণিক একাডেমিক যোগাযোগ গড়ে তোলা।',
            },
            {
              icon: <Lock className="w-6 h-6" />,
              title: 'নিরাপত্তা',
              body: 'টেন্যান্ট-বিচ্ছিন্ন ডেটা সুরক্ষা, ভূমিকাভিত্তিক অনুমতি ও পূর্ণাঙ্গ অডিট ট্রেইল নিশ্চিত করা।',
            },
          ].map((item) => (
            <Card key={item.title} interactive className="space-y-4">
              <div className="w-[46px] h-[46px] rounded-[13px] bg-brand-gradient text-white flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-[#111936] dark:text-[#E8ECFB]">{item.title}</h3>
              <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                {item.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* What we support */}
      <section className="py-16 bg-white dark:bg-[#141B34] border-y border-[#E2E6F3] dark:border-[#262F52]">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 space-y-8">
          <h2 className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB]">
            আমরা যা সমর্থন করি
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPORT_LIST.map((line) => (
              <div
                key={line}
                className="flex items-start gap-3 p-4 rounded-[14px] bg-[#F4F6FC] dark:bg-[#0B1020] border border-[#E2E6F3] dark:border-[#262F52]"
              >
                <span className="w-6 h-6 rounded-full bg-[#14B8A6]/15 text-[#14B8A6] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-medium text-[#111936] dark:text-[#E8ECFB]">
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-[#F4F6FC] dark:bg-[#0B1020]">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 space-y-10">
          <div className="space-y-2">
            <h2 className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB]">আমাদের টিম</h2>
            <p className="text-[#5D6785] dark:text-[#98A2C7]">
              অভিজ্ঞ শিক্ষাবিদ ও সফটওয়্যার প্রকৌশলীদের সমন্বয়ে গঠিত দল।
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_MEMBERS.map((member) => (
              <Card key={member.name} interactive className="text-center space-y-4">
                <div className="relative w-24 h-24 mx-auto group">
                  <div
                    className="absolute inset-0 rounded-full bg-brand-gradient p-[3px] transition-transform duration-700 group-hover:rotate-180"
                    aria-hidden="true"
                  >
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#141B34]" />
                  </div>
                  <img
                    src={member.image}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="relative w-24 h-24 rounded-full object-cover p-[4px]"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                    {member.name}
                  </h3>
                  <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] mt-0.5">{member.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-white dark:bg-[#141B34] border-t border-[#E2E6F3] dark:border-[#262F52]">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB]">যোগাযোগ করুন</h2>
            <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
              প্রতিষ্ঠান নিবন্ধন, ডেমো বা কারিগরি সহায়তার জন্য সরাসরি বার্তা পাঠান।
            </p>
            <div className="rounded-[16px] overflow-hidden aspect-[16/10] bg-[#0B1437] border border-[#E2E6F3] dark:border-[#262F52]">
              <img
                src="/src/assets/images/library_study_card_1795266091398.jpg"
                alt="একাডেমিয়া প্রাতিষ্ঠানিক সহায়তা ও গ্রন্থাগার কার্যক্রম"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 text-sm text-[#111936] dark:text-[#E8ECFB] pt-1">
              <p>ইমেইল: support@academia.edu.bd</p>
              <p className="tabular-nums">ফোন: +৮৮০ ১৭১১-০০২২৩৩</p>
              <p>ঠিকানা: হাউজ ৪২, রোড ১২, ধানমন্ডি, ঢাকা-১২০৯</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="আপনার নাম"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: মোঃ কামাল উদ্দিন"
                  />
                  <Input
                    label="ইমেইল ঠিকানা"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.edu.bd"
                  />
                </div>
                <Textarea
                  label="আপনার বার্তা"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="আপনার প্রতিষ্ঠানের প্রয়োজন বা প্রশ্ন লিখুন..."
                  error={formError}
                />
                <Button type="submit">বার্তা পাঠান</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
