import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  IdCard,
  Megaphone,
  Paperclip,
  Pause,
  PenTool,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatNumeral } from '../../lib/grading/numerals';
import { useApp } from '../../store/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const HERO_SLIDES = [
  {
    id: 'campus',
    tag: 'একাডেমিয়া ডিজিটাল ক্যাম্পাস',
    title: 'পুরো প্রতিষ্ঠানের পরীক্ষা ও ফলাফল, এক জায়গায়',
    subtitle:
      'নম্বর এন্ট্রি থেকে মার্কশিট পর্যন্ত — অধ্যক্ষ, শিক্ষক, শিক্ষার্থী ও অভিভাবক সবার জন্য আলাদা ড্যাশবোর্ড।',
    image: '/src/assets/images/hero_campus_gate_1795266091523.jpg',
    alt: 'সকালের রোদে আধুনিক বাংলাদেশি স্কুল ও কলেজ ক্যাম্পাসে শিক্ষার্থীদের যাতায়াত',
    primaryLabel: 'আপনার প্রতিষ্ঠান নিবন্ধন করুন',
    primaryPath: '/register',
    secondaryLabel: 'ডেমো ড্যাশবোর্ড দেখুন',
    secondaryPath: '/login',
  },
  {
    id: 'exam',
    tag: 'কাস্টম নম্বর বণ্টন ও প্রবেশপত্র',
    title: 'নির্ভুল পরীক্ষা নিয়ম ও তাৎক্ষণিক A4 প্রবেশপত্র',
    subtitle:
      'স্কুল, কলেজ ও মাদ্রাসার জন্য CQ, MCQ ও ব্যবহারিক পাস নিয়ম, ৩৩% অটো-ফিল এবং এক ক্লিকে বাল্ক প্রবেশপত্র।',
    image: '/src/assets/images/hero_exam_hall_1795266091888.jpg',
    alt: 'বাংলাদেশি মাধ্যমিক ও মাদ্রাসা পরীক্ষা কেন্দ্রে শিক্ষার্থীদের পরীক্ষায় অংশগ্রহণ',
    primaryLabel: 'পরীক্ষা ডেমো দেখুন',
    primaryPath: '/login',
    secondaryLabel: 'প্রতিষ্ঠান নিবন্ধন করুন',
    secondaryPath: '/register',
  },
  {
    id: 'tabulation',
    tag: 'লাইভ নম্বর এন্ট্রি ও ট্যাবুলেশন',
    title: 'লাইভ গ্রেড হিসাব, ১ম+২য় পত্র ও ৪র্থ বিষয় বোনাস',
    subtitle:
      'শিক্ষক শুধু নম্বর দেবেন; বোর্ড স্কেল অনুযায়ী GPA, সমন্বিত পত্র ও সম্পূর্ণ ট্যাবুলেশন শিট তৈরি হবে স্বয়ংক্রিয়ভাবে।',
    image: '/src/assets/images/hero_computer_lab_1795266091363.jpg',
    alt: 'বাংলাদেশি কলেজের ডিজিটাল কম্পিউটার ল্যাবে শিক্ষক ও শিক্ষার্থীদের একাডেমিক কার্যক্রম',
    primaryLabel: 'শিক্ষক প্যানেল দেখুন',
    primaryPath: '/login',
    secondaryLabel: 'আমাদের সম্পর্কে জানুন',
    secondaryPath: '/about',
  },
  {
    id: 'results',
    tag: 'শাখাভিত্তিক ফলাফল ও মার্কশিট',
    title: 'নিরাপদ ফলাফল প্রকাশ ও অফিসিয়াল ট্রান্সক্রিপ্ট',
    subtitle:
      'অধ্যক্ষের অনুমোদনের সাথে সাথেই শিক্ষার্থী ও অভিভাবকেরা নির্ভুল ট্রান্সক্রিপ্ট দেখতে ও PDF ডাউনলোড করতে পারবেন।',
    image: '/src/assets/images/hero_graduation_celebration_1795266091950.jpg',
    alt: 'পরীক্ষার সাফল্যের পর কলেজ ও মাদ্রাসা শিক্ষার্থীদের আনন্দ উদযাপন',
    primaryLabel: 'অভিভাবক ডেমো দেখুন',
    primaryPath: '/login',
    secondaryLabel: 'বিনামূল্যে শুরু করুন',
    secondaryPath: '/register',
  },
];

const CAMPUS_GALLERY = [
  {
    image: '/src/assets/images/campus_classroom_bd_1795264390087.jpg',
    title: 'শ্রেণিকক্ষ ও শিক্ষক সমন্বয়',
    subtitle: 'শ্রেণি, শাখা ও বিষয়ভিত্তিক শিক্ষক বণ্টন এবং দৈনিক অ্যাসাইনমেন্ট মূল্যায়ন।',
    alt: 'বাংলাদেশি মাধ্যমিক বিদ্যালয়ের শ্রেণিকক্ষে পাঠদান',
  },
  {
    image: '/src/assets/images/library_study_card_1795266091398.jpg',
    title: 'শিক্ষার্থী ও অভিভাবক পোর্টাল',
    subtitle: 'অধ্যয়ন সামগ্রী, অ্যাসাইনমেন্ট জমা ও একাধিক সন্তানের অগ্রগতি এক পর্দায়।',
    alt: 'আধুনিক স্কুল গ্রন্থাগারে শিক্ষার্থীদের দলগত অধ্যয়ন',
  },
  {
    image: '/src/assets/images/hero_computer_lab_1795266091363.jpg',
    title: 'কেন্দ্রীয় ট্যাবুলেশন ও অডিট',
    subtitle: 'প্রতিটি নম্বর পরিবর্তন ও ফলাফল অনুমোদনের নির্ভুল ও সুরক্ষিত রেকর্ড।',
    alt: 'কলেজের ডিজিটাল ল্যাবে ফলাফল সমন্বয় ও পর্যালোচনা',
  },
];

const FEATURES = [
  {
    icon: <FileSpreadsheet className="w-6 h-6" strokeWidth={1.75} />,
    title: 'পরীক্ষা ও কাস্টম নম্বর বণ্টন',
    desc: 'CQ, MCQ ও ব্যবহারিক আলাদা বা সমন্বিত পাস নিয়ম ও রেডিমেড প্রিসেটসহ দ্রুত পরীক্ষা সেটআপ।',
  },
  {
    icon: <Calculator className="w-6 h-6" strokeWidth={1.75} />,
    title: 'স্বয়ংক্রিয় ট্যাবুলেশন ও GPA',
    desc: '১ম+২য় পত্র সমন্বয়, ৪র্থ বিষয়ের বোনাস ও বোর্ড স্কেল অনুযায়ী মুহূর্তেই নির্ভুল ট্যাবুলেশন শিট।',
  },
  {
    icon: <IdCard className="w-6 h-6" strokeWidth={1.75} />,
    title: 'প্রবেশপত্র ও মার্কশিট',
    desc: 'এক ক্লিকে একক ও বাল্ক A4 প্রবেশপত্র এবং অফিসিয়াল মার্কশিট প্রিন্ট ও PDF ডাউনলোড।',
  },
  {
    icon: <Paperclip className="w-6 h-6" strokeWidth={1.75} />,
    title: 'অ্যাসাইনমেন্ট ও মূল্যায়ন',
    desc: 'শিক্ষক হোমওয়ার্ক দেবেন, শিক্ষার্থী অনলাইনে জমা দেবে এবং নম্বর ও মন্তব্যসহ মূল্যায়ন হবে।',
  },
  {
    icon: <Calendar className="w-6 h-6" strokeWidth={1.75} />,
    title: 'বহু শিক্ষাবর্ষ',
    desc: 'পূর্বের বছরের শ্রেণি, শাখা, বিষয় ও শিক্ষক বণ্টন কপি করে কয়েক সেকেন্ডে নতুন শিক্ষাবর্ষ শুরু।',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />,
    title: 'অডিট ও নিরাপত্তা',
    desc: 'প্রতিটি লগইন, পরীক্ষা তৈরি ও নম্বর পরিবর্তনের পূর্ববর্তী-পরবর্তী মানসহ অপরিবর্তনীয় অডিট লগ।',
  },
];

const STEPS = [
  {
    num: '০১',
    icon: <Building2 className="w-5 h-5" strokeWidth={1.9} />,
    title: 'প্রতিষ্ঠান নিবন্ধন',
    desc: 'অনলাইনে প্রতিষ্ঠানের তথ্য ও EIIN জমা দিন; সুপার এডমিন যাচাই করে অনুমোদন দেবেন।',
    image: '/src/assets/images/hero_campus_gate_1795266091523.jpg',
    alt: 'প্রতিষ্ঠান নিবন্ধন ও ডিজিটাল ক্যাম্পাস সূচনা',
  },
  {
    num: '০২',
    icon: <BookOpen className="w-5 h-5" strokeWidth={1.9} />,
    title: 'কাঠামো ও শিক্ষার্থী তৈরি',
    desc: 'শ্রেণি, শাখা, বিষয়, শিক্ষক বণ্টন ও CSV/Excel ফাইল থেকে বাল্ক শিক্ষার্থী যুক্ত করুন।',
    image: '/src/assets/images/campus_classroom_bd_1795264390087.jpg',
    alt: 'শ্রেণি, শাখা ও বিষয় কাঠামো সেটআপ',
  },
  {
    num: '০৩',
    icon: <PenTool className="w-5 h-5" strokeWidth={1.9} />,
    title: 'পরীক্ষা ও নম্বর এন্ট্রি',
    desc: 'নম্বর বণ্টন তৈরি ও প্রবেশপত্র প্রিন্ট করুন; শিক্ষক নম্বর দেবেন এবং অধ্যক্ষ অনুমোদন করবেন।',
    image: '/src/assets/images/hero_exam_hall_1795266091888.jpg',
    alt: 'পরীক্ষা পরিচালনা ও নির্ধারিত শিক্ষকের নম্বর এন্ট্রি',
  },
  {
    num: '০৪',
    icon: <Megaphone className="w-5 h-5" strokeWidth={1.9} />,
    title: 'ফলাফল ও মার্কশিট প্রকাশ',
    desc: 'শাখাভিত্তিক ফলাফল প্রকাশ করুন; শিক্ষার্থী ও অভিভাবক তাৎক্ষণিক A4 মার্কশিট ডাউনলোড করবেন।',
    image: '/src/assets/images/hero_graduation_celebration_1795266091950.jpg',
    alt: 'ফলাফল প্রকাশ ও শিক্ষার্থীদের মার্কশিট উদযাপন',
  },
];

const TUTORIAL_CHAPTERS = [
  {
    id: 'register',
    time: '০০:০০',
    title: 'প্রতিষ্ঠান নিবন্ধন ও অনুমোদন',
    caption: '৩ ধাপে স্কুল, কলেজ বা মাদ্রাসার তথ্য ও EIIN জমা দিয়ে দ্রুত পোর্টাল চালু করুন।',
    highlight: 'অধ্যক্ষ অ্যাকাউন্ট + সুপার এডমিন যাচাই',
    image: '/src/assets/images/hero_campus_gate_1795266091523.jpg',
  },
  {
    id: 'setup',
    time: '০০:০৮',
    title: 'শ্রেণি, শাখা ও পরীক্ষা সেটআপ',
    caption: 'পূর্বের শিক্ষাবর্ষ কপি করুন, CSV দিয়ে শিক্ষার্থী যুক্ত করুন ও CQ/MCQ/ব্যবহারিক পাস নিয়ম দিন।',
    highlight: '৩৩% অটো-ফিল ও কাস্টম নম্বর বণ্টন',
    image: '/src/assets/images/campus_classroom_bd_1795264390087.jpg',
  },
  {
    id: 'marks',
    time: '০০:১৬',
    title: 'শিক্ষকের লাইভ নম্বর এন্ট্রি',
    caption: 'নির্ধারিত শ্রেণি ও বিষয়ের নম্বর টাইপ করার সাথে সাথেই মোট নম্বর ও গ্রেড হিসাব দেখুন।',
    highlight: 'নিষ্ক্রিয় অংশ স্বয়ংক্রিয় লক ও অডিট লগ',
    image: '/src/assets/images/hero_computer_lab_1795266091363.jpg',
  },
  {
    id: 'publish',
    time: '০০:২৪',
    title: 'ট্যাবুলেশন ও A4 মার্কশিট PDF',
    caption: '১ম+২য় পত্র ও ৪র্থ বিষয় বোনাসসহ ফলাফল প্রকাশ ও এক ক্লিকে প্রিন্টযোগ্য মার্কশিট।',
    highlight: 'শাখাভিত্তিক প্রকাশ ও অভিভাবক পোর্টাল',
    image: '/src/assets/images/hero_graduation_celebration_1795266091950.jpg',
  },
];

const SHOWCASE_TABS = [
  {
    key: 'super',
    label: 'সুপার এডমিন',
    heading: 'সকল নিবন্ধিত প্রতিষ্ঠান ও নিরাপত্তা নিয়ন্ত্রণ',
    points: [
      'নতুন প্রতিষ্ঠানের আবেদন যাচাই, অনুমোদন বা স্থগিতকরণ',
      'এক ক্লিকে যেকোনো প্রতিষ্ঠানের ড্যাশবোর্ডে প্রবেশ (ইম্পারসোনেশন)',
      'অধ্যক্ষ, শিক্ষক, শিক্ষার্থী ও অভিভাবক অ্যাকাউন্ট ও পাসওয়ার্ড রিসেট',
      'প্ল্যাটফর্মব্যাপী নোটিশ প্রকাশ এবং বিস্তারিত অডিট লগ',
    ],
    mockStats: [
      { label: 'মোট প্রতিষ্ঠান', val: '১২৪' },
      { label: 'সক্রিয়', val: '১১৮' },
      { label: 'অপেক্ষমাণ', val: '৬' },
    ],
    mockRows: [
      ['আদর্শ উচ্চ বিদ্যালয় ও কলেজ', 'স্কুল', 'ঢাকা', 'অনুমোদিত'],
      ['সবুজবাগ ইসলামিয়া আলিম মাদ্রাসা', 'মাদ্রাসা', 'কুমিল্লা', 'অনুমোদিত'],
      ['নবদিগন্ত মডেল কলেজ', 'কলেজ', 'সিলেট', 'অপেক্ষমাণ'],
    ],
  },
  {
    key: 'principal',
    label: 'অধ্যক্ষ',
    heading: 'পূর্ণাঙ্গ একাডেমিক ও পরীক্ষা নিয়ন্ত্রণ কেন্দ্র',
    points: [
      'শ্রেণি, শাখা, বিষয় ও ৩৩% অটো-ফিল পাস নিয়ম নির্ধারণ',
      'কাস্টম নম্বর বণ্টন ইঞ্জিন, ১ম+২য় পত্র সমন্বয় ও অটো প্রবেশপত্র',
      'বিষয়ভিত্তিক নম্বর অনুমোদন ও শাখাভিত্তিক ফলাফল প্রকাশ',
      'বিস্তারিত/সংক্ষিপ্ত ট্যাবুলেশন শিট, Excel এক্সপোর্ট ও বাল্ক মার্কশিট PDF',
    ],
    mockStats: [
      { label: 'মোট শিক্ষার্থী', val: '১,২৪০' },
      { label: 'শিক্ষক', val: '৪২' },
      { label: 'চলমান পরীক্ষা', val: '২' },
    ],
    mockRows: [
      ['নবম · ক (বিজ্ঞান)', 'বার্ষিক ২০২৬', 'জমা সম্পন্ন', 'প্রকাশিত'],
      ['নবম · খ (ব্যবসায়)', 'বার্ষিক ২০২৬', 'অনুমোদিত', 'অপেক্ষমাণ'],
      ['ষষ্ঠ · ক', 'বার্ষিক ২০২৬', 'ড্রাফট', 'অপেক্ষমাণ'],
    ],
  },
  {
    key: 'teacher',
    label: 'শিক্ষক',
    heading: 'নির্ধারিত শ্রেণি ও বিষয়ের দ্রুত নম্বর এন্ট্রি',
    points: [
      'শুধুমাত্র নিজস্ব বরাদ্দকৃত শ্রেণি, শাখা ও বিষয়ের তালিকা প্রদর্শন',
      'টাইপ করার সাথে সাথেই মোট নম্বর, গ্রেড ও পাস/ফেল লাইভ হিসাব',
      'নিষ্ক্রিয় অংশ (যেমন ব্যবহারিক না থাকলে) স্বয়ংক্রিয়ভাবে লক',
      'অ্যাসাইনমেন্ট তৈরি, শিক্ষার্থীর উত্তর দেখা ও নম্বরসহ ফিডব্যাক প্রদান',
    ],
    mockStats: [
      { label: 'বরাদ্দকৃত শ্রেণি', val: '৪' },
      { label: 'নম্বর জমা', val: '৯২%' },
      { label: 'অ্যাসাইনমেন্ট', val: '৬' },
    ],
    mockRows: [
      ['নবম ক · বাংলা ১ম পত্র', '৬০/৭০', '২৫/৩০', 'A+ (৫.০০)'],
      ['নবম ক · বাংলা ২য় পত্র', '৭৬/১০০', '—', 'A (৪.০০)'],
      ['নবম খ · বাংলা ১ম পত্র', '৫২/৭০', '২২/৩০', 'A (৪.০০)'],
    ],
  },
  {
    key: 'student',
    label: 'শিক্ষার্থী/অভিভাবক',
    heading: 'তাৎক্ষণিক প্রবেশপত্র, ফলাফল ও মার্কশিট',
    points: [
      'অভিভাবকদের জন্য এক অ্যাকাউন্ট থেকে একাধিক সন্তানের সুইচার',
      'চলমান ও আসন্ন পরীক্ষার A4 প্রবেশপত্র প্রিন্ট ও PDF ডাউনলোড',
      'প্রকাশিত পরীক্ষার বিষয়ভিত্তিক নম্বর, ৪র্থ বিষয় বোনাস ও GPA কার্ড',
      'অনলাইনে অ্যাসাইনমেন্ট জমা ও শিক্ষকের মূল্যায়ন দেখা',
    ],
    mockStats: [
      { label: 'সর্বশেষ GPA', val: '৫.০০' },
      { label: 'মোট নম্বর', val: '৬৭৮' },
      { label: 'অ্যাসাইনমেন্ট', val: '১৯/২০' },
    ],
    mockRows: [
      ['বাংলা (১ম + ২য় পত্র)', '১৬৪ / ২০০', 'A+', '৫.০০'],
      ['ইংরেজি (১ম + ২য় পত্র)', '১৫৪ / ২০০', 'A', '৪.০০'],
      ['সাধারণ গণিত', '৯১ / ১০০', 'A+', '৫.০০'],
    ],
  },
];

const FAQS = [
  {
    q: 'একাডেমিয়া ব্যবহারে খরচ কেমন এবং কীভাবে শুরু করব?',
    a: 'প্রতিষ্ঠান নিবন্ধন ফর্ম পূরণ করে বিনামূল্যে আবেদন জমা দিন। যাচাই ও অনুমোদনের পর আপনার প্রতিষ্ঠানের পোর্টাল চালু হয়ে যাবে এবং ডেমো থেকে সরাসরি সব ফিচার পরীক্ষা করতে পারবেন।',
  },
  {
    q: 'প্রতিষ্ঠানের তথ্য ও ফলাফলের নিরাপত্তা কীভাবে নিশ্চিত করা হয়?',
    a: 'প্রতিটি প্রতিষ্ঠানের ডেটা সম্পূর্ণ আলাদা টেন্যান্ট হিসেবে সংরক্ষিত থাকে। নম্বর এন্ট্রি বা পরিবর্তনের প্রতিটি ধাপে পূর্ববর্তী ও পরবর্তী মানসহ অপরিবর্তনীয় অডিট লগ তৈরি হয়।',
  },
  {
    q: '৪র্থ বিষয় ও ১ম+২য় পত্র সমন্বিত বিষয়ের নিয়ম কি কাস্টমাইজ করা যায়?',
    a: 'হ্যাঁ। প্রতিষ্ঠান সেটিংস থেকে ৪র্থ বিষয়ের বেস পয়েন্ট (ডিফল্ট ২.০০), সর্বোচ্চ বোনাস (ডিফল্ট ৩.০০) এবং ৪র্থ বিষয়ে ফেল করলে শুধু বোনাস শূন্য হবে নাকি পুরো পরীক্ষা ফেল হবে—তা নির্বাচন করা যায়।',
  },
  {
    q: 'পুরোনো তালিকা থেকে একবারে শত শত শিক্ষার্থী যুক্ত করা যাবে?',
    a: 'অবশ্যই। স্যাম্পল CSV ডাউনলোড করে Excel বা CSV ফাইল আপলোড করলে প্রিভিউ টেবিলে ত্রুটিপূর্ণ সারি লাল রঙে চিহ্নিত করে দেখানো হয় এবং নিশ্চিত করলে সবার লগইন অ্যাকাউন্ট তৈরি হয়ে যায়।',
  },
  {
    q: 'নতুন শিক্ষাবর্ষে কি আবার সব শ্রেণি ও বিষয় নতুন করে তৈরি করতে হবে?',
    a: 'না। নতুন শিক্ষাবর্ষ যোগ করার সময় একটি টিক চিহ্নেই পূর্ববর্তী বছরের সব শ্রেণি, শাখা, বিষয় এবং শিক্ষক বণ্টন স্বয়ংক্রিয়ভাবে কপি হয়ে যায়।',
  },
  {
    q: 'অভিভাবকরা কীভাবে সন্তানের ফলাফল দেখতে পারবেন?',
    a: 'অভিভাবক অ্যাকাউন্টে লগইন করলে এক বা একাধিক সন্তানের প্রোফাইল সুইচার থাকে। শাখাভিত্তিক ফলাফল প্রকাশিত হলেই কেবল সন্তানের মার্কশিট ও প্রবেশপত্র দেখা যায়।',
  },
];

const CountUpStat: React.FC<{ target: number; suffix?: string; label: string }> = ({
  target,
  suffix = '+',
  label,
}) => {
  const { numeralLocale } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVal(target);
      return;
    }
    const start = performance.now();
    const duration = 950;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <div ref={ref} className="text-center space-y-1">
      <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {formatNumeral(val.toLocaleString('en-US'), numeralLocale)}
        {suffix}
      </p>
      <p className="text-sm font-medium text-white/85">{label}</p>
    </div>
  );
};

const ScrollHeading: React.FC<{
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  subtitleClassName?: string;
  wrapperClassName?: string;
}> = ({
  children,
  subtitle,
  className = '',
  subtitleClassName = 'text-[#5D6785] dark:text-[#98A2C7]',
  wrapperClassName = 'space-y-2',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 95%', 'start 35%'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 26,
    mass: 0.3,
  });
  const y = useTransform(smoothProgress, [0, 1], [24, 0]);
  const opacity = useTransform(smoothProgress, [0, 0.55, 1], [0.3, 0.9, 1]);
  const scale = useTransform(smoothProgress, [0, 1], [0.97, 1]);

  if (prefersReduced) {
    return (
      <div className={wrapperClassName}>
        <h2 className={className}>{children}</h2>
        {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ y, opacity, scale }} className={wrapperClassName}>
      <h2 className={className}>{children}</h2>
      {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
    </motion.div>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { numeralLocale } = useApp();
  const prefersReduced = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialChapter, setTutorialChapter] = useState(0);
  const [tutorialPlaying, setTutorialPlaying] = useState(true);
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.25 });
  const marksheetRef = useRef<HTMLDivElement>(null);
  const marksheetInView = useInView(marksheetRef, { once: true, amount: 0.25 });

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const smoothHeroScroll = useSpring(heroScrollProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
  });
  const heroHeadingY = useTransform(smoothHeroScroll, [0, 1], [0, 44]);
  const heroHeadingOpacity = useTransform(smoothHeroScroll, [0, 0.85], [1, 0.25]);

  useEffect(() => {
    if (!tutorialOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTutorialOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen || !tutorialPlaying) return;
    const timer = window.setInterval(() => {
      setTutorialProgress((prev) => {
        if (prev >= 100) {
          setTutorialChapter((c) => (c + 1) % TUTORIAL_CHAPTERS.length);
          return 0;
        }
        return prev + 2;
      });
    }, 140);
    return () => window.clearInterval(timer);
  }, [tutorialOpen, tutorialPlaying]);

  useEffect(() => {
    if (isCarouselPaused || tutorialOpen) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isCarouselPaused, tutorialOpen]);

  const goPrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const goNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const currentSlide = HERO_SLIDES[activeSlide];
  const currentTab = SHOWCASE_TABS[activeTab];

  return (
    <div>
      {/* 3.1 Hero Carousel directly behind transparent Navbar */}
      <section
        ref={heroRef}
        aria-roledescription="carousel"
        aria-label="একাডেমিয়া প্রধান বৈশিষ্ট্য স্লাইডার"
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
        onFocusCapture={() => setIsCarouselPaused(true)}
        onBlurCapture={() => setIsCarouselPaused(false)}
        className="relative overflow-hidden bg-[#0B1437] text-white"
      >
        {/* Distinct Slide Background Images */}
        <div className="absolute inset-0 bg-[#0B1437]" aria-hidden="true">
          {HERO_SLIDES.map((slide, idx) => {
            const active = idx === activeSlide;
            return (
              <img
                key={slide.id}
                src={slide.image}
                alt=""
                referrerPolicy="no-referrer"
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            );
          })}
          {/* Measured Navy-Indigo-Teal contrast scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1437]/95 via-[#0B1437]/82 to-[#0B1437]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1437]/90 via-transparent to-[#0B1437]/30" />
          <div className="absolute inset-0 dotted-grid-bg opacity-45 pointer-events-none" />
        </div>

        {/* Main Hero Content */}
        <div className="relative max-w-[1250px] mx-auto px-5 sm:px-8 pt-24 pb-8 sm:pt-28 lg:pt-32 lg:pb-12 grid grid-cols-1 min-[860px]:grid-cols-12 gap-10 items-center">
          <div key={currentSlide.id} className="min-[860px]:col-span-7 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#5EEAD4] tracking-wide"
            >
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" aria-hidden="true" />
              <span>{currentSlide.tag}</span>
            </motion.div>

            <motion.div
              style={
                prefersReduced
                  ? undefined
                  : { y: heroHeadingY, opacity: heroHeadingOpacity }
              }
            >
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                className="text-[clamp(2rem,4.4vw,3.3rem)] font-bold leading-[1.2] text-balance"
              >
                {currentSlide.title}
              </motion.h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-base sm:text-lg text-white/90 max-w-[34em] leading-relaxed"
            >
              {currentSlide.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Button size="lg" onClick={() => navigate(currentSlide.primaryPath)}>
                {currentSlide.primaryLabel}
              </Button>
              <Button
                size="lg"
                variant="outline-white"
                onClick={() => navigate(currentSlide.secondaryPath)}
              >
                {currentSlide.secondaryLabel}
              </Button>
            </motion.div>
          </div>

          {/* Right Side YouTube Tutorial Video Trigger */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="min-[860px]:col-span-5 flex flex-col items-center justify-center py-6"
          >
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              aria-label="টিউটোরিয়াল ভিডিও দেখুন"
              className="group relative flex flex-col items-center gap-4 focus:outline-none cursor-pointer"
            >
              <span className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/10 border border-white/25 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:scale-105">
                <span
                  className="absolute inset-0 rounded-full bg-[#FF0000]/25 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
                {/* Authentic YouTube Video Logo */}
                <svg
                  viewBox="0 0 68 48"
                  className="relative w-16 h-12 sm:w-20 sm:h-14 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                  aria-hidden="true"
                >
                  <path
                    d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                    fill="#FF0000"
                  />
                  <path d="M45 24L27 14v20" fill="#FFFFFF" />
                </svg>
              </span>
              <span className="text-sm sm:text-base font-semibold text-white/95 group-hover:text-white transition-colors">
                ভিডিও টিউটোরিয়াল দেখুন
              </span>
            </button>
          </motion.div>
        </div>

        {/* Clean Carousel Dot Controls & Prev/Next Buttons */}
        <div className="relative max-w-[1250px] mx-auto px-5 sm:px-8 pb-7 pt-3 flex items-center justify-between gap-4 border-t border-white/10">
          <div className="flex items-center gap-2.5" role="tablist" aria-label="স্লাইড তালিকা">
            {HERO_SLIDES.map((slide, idx) => {
              const active = idx === activeSlide;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`স্লাইড ${formatNumeral(idx + 1, numeralLocale)}`}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    active ? 'w-9 bg-[#14B8A6]' : 'w-2.5 bg-white/40 hover:bg-white/75'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/75 tabular-nums mr-1">
              {formatNumeral(activeSlide + 1, numeralLocale)} / {formatNumeral(HERO_SLIDES.length, numeralLocale)}
            </span>
            <button
              type="button"
              onClick={goPrevSlide}
              aria-label="পূর্ববর্তী স্লাইড"
              className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNextSlide}
              aria-label="পরবর্তী স্লাইড"
              className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Visual Campus Highlights Strip */}
      <section className="py-12 bg-white dark:bg-[#141B34] border-b border-[#E2E6F3] dark:border-[#262F52]">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <ScrollHeading
              wrapperClassName="space-y-1"
              className="text-[1.75rem] font-bold text-[#111936] dark:text-[#E8ECFB] leading-tight"
              subtitle="শ্রেণিকক্ষ থেকে পরীক্ষার হল এবং কেন্দ্রীয় ফলাফল প্রকাশ পর্যন্ত সমন্বিত পরিবেশ।"
              subtitleClassName="text-sm text-[#5D6785] dark:text-[#98A2C7]"
            >
              দেশের শিক্ষা প্রতিষ্ঠানের বাস্তব কর্মপ্রবাহ
            </ScrollHeading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CAMPUS_GALLERY.map((item) => (
              <div
                key={item.title}
                className="group relative rounded-[18px] overflow-hidden bg-[#0B1437] border border-[#E2E6F3] dark:border-[#262F52] shadow-sm"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#0B1437]">
                  <img
                    src={item.image}
                    alt={item.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5 bg-white dark:bg-[#141B34] space-y-1.5">
                  <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3.3 Features Grid */}
      <section className="relative py-16 bg-[#F4F6FC] dark:bg-[#0B1020]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(79, 70, 229, 0.08), transparent 65%)',
          }}
        />
        <div className="relative max-w-[1250px] mx-auto px-5 sm:px-8 space-y-10">
          <ScrollHeading
            wrapperClassName="max-w-2xl space-y-2"
            className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB] leading-tight"
            subtitle="ছয়টি মূল সুবিধা, একটি প্ল্যাটফর্মে।"
          >
            সবকিছু যা একটি প্রতিষ্ঠানের দরকার
          </ScrollHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <Card interactive className="h-full space-y-4">
                  <div
                    className="w-[46px] h-[46px] rounded-[13px] bg-brand-gradient flex items-center justify-center text-white shadow-sm"
                    aria-hidden="true"
                  >
                    {f.icon}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-[1.2rem] font-semibold text-[#111936] dark:text-[#E8ECFB]">
                      {f.title}
                    </h3>
                    <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3.4 How it works — Animated Visual Workflow */}
      <section className="py-16 bg-white dark:bg-[#141B34] border-y border-[#E2E6F3] dark:border-[#262F52]">
        <div ref={stepsRef} className="max-w-[1250px] mx-auto px-5 sm:px-8 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <ScrollHeading
              wrapperClassName="max-w-2xl space-y-2"
              className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB]"
              subtitle="নিবন্ধন থেকে ফলাফল প্রকাশ—চারটি সুশৃঙ্খল ও স্বয়ংক্রিয় ধাপে।"
            >
              কীভাবে কাজ করে
            </ScrollHeading>
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC]">
              <span>সম্পূর্ণ কর্মপ্রবাহ</span>
              <span className="w-24 h-1.5 rounded-full bg-[#E2E6F3] dark:bg-[#262F52] overflow-hidden">
                <span
                  className="block h-full bg-brand-gradient transition-transform duration-1000 ease-out origin-left"
                  style={{ transform: stepsInView ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                className="group relative rounded-[20px] bg-[#F4F6FC] dark:bg-[#0B1020] border border-[#E2E6F3] dark:border-[#262F52] overflow-hidden shadow-sm hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Step Image Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#0B1437]">
                  <img
                    src={step.image}
                    alt={step.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#0B1437]/90 via-[#0B1437]/25 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-[12px] bg-brand-gradient text-white flex items-center justify-center shadow-lg">
                    {step.icon}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-xs font-bold tracking-wide text-[#5EEAD4]">
                      ধাপ {formatNumeral(step.num, numeralLocale)}
                    </span>
                    <span className="text-lg font-bold tabular-nums opacity-85">
                      {formatNumeral(step.num, numeralLocale)}
                    </span>
                  </div>
                </div>

                {/* Step Content */}
                <div className="p-5 space-y-2 flex-1 flex flex-col">
                  <div className="h-1 w-12 rounded-full bg-brand-gradient transition-all duration-500 group-hover:w-20" />
                  <h3 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB] pt-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3.5 Dashboard Showcase (Tabs) */}
      <section className="py-16 bg-sidebar-gradient text-white">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 space-y-10">
          <div className="space-y-4">
            <ScrollHeading className="text-[2rem] font-bold text-white">
              প্রতিটি ভূমিকার জন্য নিবেদিত ড্যাশবোর্ড
            </ScrollHeading>
            <div className="flex flex-wrap gap-2 border-b border-white/15 pb-1" role="tablist">
              {SHOWCASE_TABS.map((tab, idx) => {
                const active = activeTab === idx;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(idx)}
                    className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      active ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-brand-gradient" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            key={currentTab.key}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Browser-Window Live Mock */}
            <div className="lg:col-span-7 rounded-[20px] bg-white text-[#111936] overflow-hidden floating-shadow border border-white/20">
              <div className="bg-[#0B1437] px-4 py-2.5 flex items-center justify-between text-xs text-white/80">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FCD34D]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
                </div>
                <span className="font-semibold">একাডেমিয়া — {currentTab.label} প্যানেল</span>
                <span className="text-white/50">২০২৬</span>
              </div>

              <div className="p-5 space-y-4 bg-[#F4F6FC]">
                <div className="grid grid-cols-3 gap-3">
                  {currentTab.mockStats.map((st) => (
                    <div
                      key={st.label}
                      className="rounded-[12px] bg-white border border-[#E2E6F3] p-3"
                    >
                      <p className="text-[11px] text-[#5D6785]">{st.label}</p>
                      <p className="text-lg font-bold text-[#111936] tabular-nums">{st.val}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[12px] bg-white border border-[#E2E6F3] overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {currentTab.mockRows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b last:border-b-0 border-[#E2E6F3]">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3 py-2.5 tabular-nums ${
                                cIdx === 0 ? 'font-semibold text-[#111936]' : 'text-[#5D6785]'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Feature Checklist */}
            <div className="lg:col-span-5 space-y-5">
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {currentTab.heading}
              </h3>
              <ul className="space-y-3.5">
                {currentTab.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-3 text-sm sm:text-base text-white/90">
                    <span className="w-6 h-6 rounded-full bg-[#14B8A6]/20 text-[#14B8A6] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Button variant="warm" onClick={() => navigate('/login')}>
                  {currentTab.label} ডেমো খুলুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.6 Result Preview Section */}
      <section className="py-16 bg-white dark:bg-[#141B34] overflow-hidden">
        <div
          ref={marksheetRef}
          className="max-w-[1250px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
        >
          <div className="lg:col-span-6 space-y-5">
            <ScrollHeading
              wrapperClassName="space-y-4"
              className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB] leading-tight"
              subtitle="বাংলাদেশ শিক্ষাবোর্ডের নিয়ম মেনে ১ম ও ২য় পত্রের যোগফল বা গড়, আলাদা পাস নম্বর এবং ৪র্থ বিষয়ের অতিরিক্ত পয়েন্ট স্বয়ংক্রিয়ভাবে হিসাব হয়।"
              subtitleClassName="text-[#5D6785] dark:text-[#98A2C7] max-w-[34em]"
            >
              নির্ভুল ফলাফল, সমন্বিত বিষয় ও ৪র্থ বিষয়সহ
            </ScrollHeading>
            <ul className="space-y-3 text-sm sm:text-base">
              <li className="flex items-center gap-2.5 font-semibold text-[#111936] dark:text-[#E8ECFB]">
                <Check className="w-5 h-5 text-[#14B8A6]" />
                <span>১ম ও ২য় পত্র একত্রে মূল্যায়ন ও সমন্বিত গ্রেড</span>
              </li>
              <li className="flex items-center gap-2.5 font-semibold text-[#111936] dark:text-[#E8ECFB]">
                <Check className="w-5 h-5 text-[#14B8A6]" />
                <span>শাখাভিত্তিক ফলাফল প্রকাশ ও অনুমোদন নিয়ন্ত্রণ</span>
              </li>
              <li className="flex items-center gap-2.5 font-semibold text-[#111936] dark:text-[#E8ECFB]">
                <Check className="w-5 h-5 text-[#14B8A6]" />
                <span>অফিসিয়াল A4 মার্কশিট PDF ও বাল্ক প্রিন্ট</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6 relative flex justify-center">
            <div
              className="absolute inset-4 rounded-full bg-brand-gradient opacity-15 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="relative w-full max-w-md rounded-[20px] bg-white text-[#111936] border border-[#E2E6F3] floating-shadow overflow-hidden transition-transform duration-700 ease-out"
              style={{
                transform: marksheetInView ? 'rotate(3deg)' : 'rotate(8deg)',
              }}
            >
              <div className="bg-[#0B1437] text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">আদর্শ উচ্চ বিদ্যালয় ও কলেজ</p>
                  <p className="font-bold text-sm">অফিসিয়াল একাডেমিক ট্রান্সক্রিপ্ট</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-warm-gradient text-[#0B1437] text-xs font-bold">
                  উত্তীর্ণ
                </span>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="flex justify-between font-semibold border-b border-[#E2E6F3] pb-2">
                  <span>তানভীর ইসলাম · রোল {formatNumeral(1, numeralLocale)}</span>
                  <span>নবম (ক)</span>
                </div>
                <div className="space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span>বাংলা (১ম+২য়)</span>
                    <span className="font-bold">১৬৮/২০০ · A+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ইংরেজি (১ম+২য়)</span>
                    <span className="font-bold">১৫২/২০০ · A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>সাধারণ গণিত</span>
                    <span className="font-bold">৯৪/১০০ · A+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>পদার্থবিজ্ঞান</span>
                    <span className="font-bold">৮৭/১০০ · A+</span>
                  </div>
                  <div className="flex justify-between text-[#4F46E5] font-semibold">
                    <span>উচ্চতর গণিত (৪র্থ বিষয়)</span>
                    <span>৯০/১০০ (+৩.০০ বোনাস)</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E2E6F3] flex items-center justify-between">
                  <span className="font-semibold text-[#5D6785]">সর্বমোট GPA</span>
                  <span className="px-3.5 py-1 rounded-[10px] bg-warm-gradient text-[#0B1437] font-bold text-base tabular-nums">
                    GPA {formatNumeral('5.00', numeralLocale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.7 Stats Band */}
      <section className="py-10 px-5 sm:px-8 bg-[#F4F6FC] dark:bg-[#0B1020]">
        <div className="max-w-[1250px] mx-auto rounded-[22px] bg-brand-gradient py-12 px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 shadow-lg">
          <CountUpStat target={120} label="নিবন্ধিত প্রতিষ্ঠান" />
          <CountUpStat target={48000} label="সক্রিয় শিক্ষার্থী" />
          <CountUpStat target={3200} label="অভিজ্ঞ শিক্ষক" />
          <CountUpStat target={900} label="প্রকাশিত পরীক্ষা" />
        </div>
      </section>

      {/* 3.8 FAQ Accordion */}
      <section className="py-16 bg-[#F4F6FC] dark:bg-[#0B1020]">
        <div className="max-w-[900px] mx-auto px-5 sm:px-8 space-y-8">
          <ScrollHeading
            wrapperClassName="space-y-2"
            className="text-[2rem] font-bold text-[#111936] dark:text-[#E8ECFB]"
            subtitle="প্ল্যাটফর্ম ব্যবহার সম্পর্কিত সর্বাধিক জিজ্ঞাসিত প্রশ্ন ও উত্তর।"
          >
            সাধারণ জিজ্ঞাসা
          </ScrollHeading>

          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-[16px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left font-semibold text-[#111936] dark:text-[#E8ECFB] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#4F46E5] shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3.9 Final Call To Action */}
      <section className="relative overflow-hidden bg-[#0B1437] text-white py-20">
        <img
          src="/src/assets/images/hero_graduation_celebration_1795266091950.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0B1437]/92 via-[#2A1A73]/85 to-[#0B6B73]/80"
          aria-hidden="true"
        />

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center space-y-6">
          <ScrollHeading className="text-3xl sm:text-4xl font-bold leading-tight text-balance">
            আজই আপনার প্রতিষ্ঠানের ফলাফল ডিজিটাল করুন
          </ScrollHeading>
          <div className="w-24 h-1.5 mx-auto rounded-full bg-warm-gradient" />
          <p className="text-white/85 text-base max-w-xl mx-auto">
            কাগজের ট্যাবুলেশনের ভুল ও সময়ক্ষেপণ দূর করে নির্ভুল ফলাফল ব্যবস্থাপনায় যুক্ত হোন।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5 pt-2">
            <Button size="lg" onClick={() => navigate('/register')}>
              প্রতিষ্ঠান নিবন্ধন করুন
            </Button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-white underline underline-offset-4 hover:text-[#FCD34D] cursor-pointer"
            >
              ডেমো দেখুন
            </button>
          </div>
        </div>
      </section>

      {/* Fullscreen YouTube Tutorial Modal */}
      {tutorialOpen && (() => {
        const chapter = TUTORIAL_CHAPTERS[tutorialChapter];
        const overallPct = ((tutorialChapter * 100 + tutorialProgress) / (TUTORIAL_CHAPTERS.length * 100)) * 100;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="একাডেমিয়া ভিডিও টিউটোরিয়াল"
            className="fixed inset-0 z-50 bg-[#0B1437]/96 backdrop-blur-md flex flex-col"
          >
            <div className="h-[68px] px-4 sm:px-8 border-b border-white/15 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 text-white min-w-0">
                <svg viewBox="0 0 68 48" className="w-8 h-6 shrink-0" aria-hidden="true">
                  <path
                    d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                    fill="#FF0000"
                  />
                  <path d="M45 24L27 14v20" fill="#FFFFFF" />
                </svg>
                <span className="font-bold text-base sm:text-lg truncate">
                  একাডেমিয়া — পূর্ণাঙ্গ ব্যবহারিক টিউটোরিয়াল
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTutorialOpen(false)}
                aria-label="ভিডিও বন্ধ করুন"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 min-h-0 gap-4">
              {/* Interactive Fullscreen Video Frame */}
              <div className="relative w-full max-w-[1200px] flex-1 max-h-[72vh] aspect-video rounded-[18px] overflow-hidden bg-[#060B22] border border-white/20 shadow-2xl flex flex-col justify-end">
                <img
                  key={chapter.id}
                  src={chapter.image}
                  alt={chapter.title}
                  referrerPolicy="no-referrer"
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${
                    tutorialPlaying ? 'scale-105' : 'scale-100'
                  }`}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#060B22] via-[#0B1437]/60 to-[#0B1437]/30"
                  aria-hidden="true"
                />

                {/* Center Play/Pause Overlay Trigger */}
                <button
                  type="button"
                  onClick={() => setTutorialPlaying((p) => !p)}
                  aria-label={tutorialPlaying ? 'বিরতি দিন' : 'চালু করুন'}
                  className="relative z-10 m-auto w-20 h-20 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105 cursor-pointer"
                >
                  {tutorialPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 translate-x-0.5" />
                  )}
                </button>

                {/* Caption + Bottom YouTube-Style Control Bar */}
                <div className="relative z-10 px-5 sm:px-8 pb-5 pt-10 space-y-4">
                  <div className="max-w-2xl space-y-1.5">
                    <span className="inline-block text-xs font-bold text-[#5EEAD4]">
                      অধ্যায় {formatNumeral(tutorialChapter + 1, numeralLocale)} · {chapter.highlight}
                    </span>
                    <h3 className="text-xl sm:text-3xl font-bold text-white leading-tight">
                      {chapter.title}
                    </h3>
                    <p className="text-sm sm:text-base text-white/85">{chapter.caption}</p>
                  </div>

                  {/* Red YouTube Progress Scrubber */}
                  <div className="space-y-2.5">
                    <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-[#FF0000] transition-all duration-150"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/85">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setTutorialPlaying((p) => !p)}
                          className="inline-flex items-center gap-1.5 font-semibold hover:text-white cursor-pointer"
                        >
                          {tutorialPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{tutorialPlaying ? 'বিরতি' : 'চালু করুন'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTutorialChapter(0);
                            setTutorialProgress(0);
                            setTutorialPlaying(true);
                          }}
                          className="inline-flex items-center gap-1.5 font-semibold hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>শুরু থেকে</span>
                        </button>
                        <span className="tabular-nums text-white/70">
                          {formatNumeral(chapter.time, numeralLocale)} / {formatNumeral('০০:৩২', numeralLocale)}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setTutorialOpen(false);
                          navigate('/register');
                        }}
                      >
                        এখনই প্রতিষ্ঠান নিবন্ধন করুন
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clickable Chapter Strip */}
              <div className="w-full max-w-[1200px] grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                {TUTORIAL_CHAPTERS.map((ch, idx) => {
                  const active = idx === tutorialChapter;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setTutorialChapter(idx);
                        setTutorialProgress(0);
                        setTutorialPlaying(true);
                      }}
                      className={`text-left px-3.5 py-2.5 rounded-[12px] border transition-all cursor-pointer ${
                        active
                          ? 'bg-white/15 border-[#FF0000]/70 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-[#5EEAD4] tabular-nums">
                        {formatNumeral(ch.time, numeralLocale)} · অধ্যায় {formatNumeral(idx + 1, numeralLocale)}
                      </span>
                      <span className="block text-xs sm:text-sm font-semibold truncate">
                        {ch.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
