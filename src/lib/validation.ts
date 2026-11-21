import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'ইমেইল ঠিকানা লিখুন।')
    .email('সঠিক ইমেইল ঠিকানা লিখুন।'),
  password: z
    .string()
    .min(4, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।'),
});

export const registerInstitutionSchema = z.object({
  institutionName: z.string().trim().min(3, 'প্রতিষ্ঠানের নাম কমপক্ষে ৩ অক্ষরের হতে হবে।'),
  type: z.enum(['school', 'college', 'madrasa'], {
    error: 'প্রতিষ্ঠানের ধরন নির্বাচন করুন।',
  }),
  eiin: z.string().trim().min(4, 'বৈধ EIIN নম্বর লিখুন।'),
  address: z.string().trim().min(4, 'প্রতিষ্ঠানের ঠিকানা লিখুন।'),
  district: z.string().trim().min(2, 'জেলার নাম নির্বাচন বা লিখুন।'),
  principalName: z.string().trim().min(3, 'অধ্যক্ষের নাম লিখুন।'),
  phone: z.string().trim().min(10, 'বৈধ মোবাইল নম্বর লিখুন (কমপক্ষে ১০ সংখ্যা)।'),
  email: z.string().trim().email('সঠিক ইমেইল ঠিকানা লিখুন।'),
  acceptedTerms: z.literal(true, {
    error: 'শর্তাবলী ও নীতিমালায় সম্মতি দিন।',
  }),
});

export const classSchema = z.object({
  name: z.string().trim().min(1, 'শ্রেণির নাম লিখুন।'),
  code: z.string().trim().min(1, 'শ্রেণির কোড লিখুন।'),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(2, 'বিষয়ের নাম লিখুন।'),
  code: z.string().trim().min(1, 'বিষয় কোড লিখুন।'),
  classId: z.string().min(1, 'শ্রেণি নির্বাচন করুন।'),
  cqFull: z.number().min(0, 'শূন্য বা তার বেশি হতে হবে।').max(200),
  cqPass: z.number().min(0).max(200),
  mcqFull: z.number().min(0).max(200),
  mcqPass: z.number().min(0).max(200),
  practicalFull: z.number().min(0).max(200),
  practicalPass: z.number().min(0).max(200),
  totalFull: z.number().min(1, 'পূর্ণমান কমপক্ষে ১ হতে হবে।').max(300),
  totalPass: z.number().min(0).max(300),
});

export const teacherSchema = z.object({
  name: z.string().trim().min(2, 'শিক্ষকের নাম লিখুন।'),
  email: z.string().trim().email('সঠিক ইমেইল দিন।'),
  phone: z.string().trim().min(10, 'বৈধ ফোন নম্বর লিখুন।'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।').optional(),
});

export const studentSchema = z.object({
  name: z.string().trim().min(2, 'শিক্ষার্থীর নাম লিখুন।'),
  roll: z.number().int('পূর্ণ সংখ্যা দিন।').min(1, 'রোল ১ বা তার বেশি হতে হবে।'),
  studentCode: z.string().trim().min(2, 'শিক্ষার্থী আইডি লিখুন।'),
  classId: z.string().min(1, 'শ্রেণি নির্বাচন করুন।'),
  sectionId: z.string().min(1, 'শাখা নির্বাচন করুন।'),
  fatherName: z.string().trim().min(2, 'পিতার নাম লিখুন।'),
  motherName: z.string().trim().min(2, 'মাতার নাম লিখুন।'),
  guardianPhone: z.string().trim().min(10, 'অভিভাবকের মোবাইল নম্বর লিখুন।'),
  email: z.string().trim().email('সঠিক লগইন ইমেইল দিন।'),
});

export const examSchema = z.object({
  name: z.string().trim().min(2, 'পরীক্ষার নাম লিখুন।'),
  defaultClassId: z.string().min(1, 'শ্রেণি নির্বাচন করুন।'),
  startDate: z.string().min(4, 'শুরুর তারিখ নির্বাচন করুন।'),
  endDate: z.string().min(4, 'শেষের তারিখ নির্বাচন করুন।'),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(3, 'নোটিশের শিরোনাম লিখুন।'),
  body: z.string().trim().min(5, 'নোটিশের বিবরণ লিখুন।'),
  audience: z.enum(['all', 'teachers', 'students', 'parents']),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(3, 'অ্যাসাইনমেন্টের শিরোনাম লিখুন।'),
  description: z.string().trim().min(5, 'নির্দেশনা লিখুন।'),
  fullMarks: z.number().min(1, 'পূর্ণমান কমপক্ষে ১ হতে হবে।').max(200),
  dueDate: z.string().min(4, 'জমাদানের শেষ তারিখ দিন।'),
  classId: z.string().min(1, 'শ্রেণি নির্বাচন করুন।'),
  sectionId: z.string().min(1, 'শাখা নির্বাচন করুন।'),
});

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'আপনার নাম লিখুন।'),
  email: z.string().trim().email('সঠিক ইমেইল লিখুন।'),
  message: z.string().trim().min(10, 'বার্তা কমপক্ষে ১০ অক্ষরের হতে হবে।'),
});

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first ? first.message : 'তথ্য সঠিকভাবে পূরণ করুন।';
}
