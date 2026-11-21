import React, { useState } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import type { NoticeAudience } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../../components/ui/FormControls';
import { Pill } from '../../../components/ui/Pill';

interface NoticeBoardViewProps {
  canCompose: boolean;
  canDelete?: boolean;
  allowedAudiences?: Array<{ value: NoticeAudience; label: string }>;
}

const AUDIENCE_LABEL: Record<NoticeAudience, string> = {
  all: 'সকল ব্যবহারকারী',
  teachers: 'শুধু শিক্ষক',
  students: 'শুধু শিক্ষার্থী',
  parents: 'শুধু অভিভাবক',
};

export const NoticeBoardView: React.FC<NoticeBoardViewProps> = ({
  canCompose,
  canDelete = false,
  allowedAudiences = [
    { value: 'all', label: 'সকল' },
    { value: 'teachers', label: 'শিক্ষক' },
    { value: 'students', label: 'শিক্ষার্থী' },
    { value: 'parents', label: 'অভিভাবক' },
  ],
}) => {
  const { repo, numeralLocale, publishNotice, deleteNotice, showToast } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<NoticeAudience>(allowedAudiences[0]?.value ?? 'all');
  const [error, setError] = useState('');

  const notices = repo?.getNotices() ?? [];

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const res = publishNotice({ title, body, audience });
    if (!res.ok) {
      setError(res.error ?? 'নোটিশ প্রকাশ করা যায়নি।');
      return;
    }
    setError('');
    setTitle('');
    setBody('');
    showToast('নোটিশ প্রকাশিত হয়েছে', 'success');
  };

  return (
    <div className="space-y-6">
      {canCompose && (
        <Card>
          <form onSubmit={handlePublish} className="space-y-4">
            <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
              নতুন নোটিশ প্রকাশ করুন
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="নোটিশের শিরোনাম"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: আসন্ন পরীক্ষার সময়সূচি সংক্রান্ত বিজ্ঞপ্তি"
                />
              </div>
              <Select
                label="দর্শক (Audience)"
                value={audience}
                onChange={(e) => setAudience(e.target.value as NoticeAudience)}
              >
                {allowedAudiences.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              label="বিবরণ"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="বিস্তারিত নোটিশ লিখুন..."
              error={error}
            />
            <div className="flex justify-end">
              <Button type="submit">নোটিশ প্রকাশ</Button>
            </div>
          </form>
        </Card>
      )}

      {notices.length === 0 ? (
        <EmptyState
          title="কোনো নোটিশ নেই"
          description={
            canCompose
              ? 'কোনো নোটিশ নেই। উপরে প্রথম নোটিশ লিখুন।'
              : 'এই মুহূর্তে কোনো নতুন নোটিশ প্রকাশিত হয়নি।'
          }
        />
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="w-[46px] h-[46px] rounded-[13px] bg-brand-gradient text-white flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">
                      {notice.title}
                    </h3>
                    <Pill variant="info">{AUDIENCE_LABEL[notice.audience]}</Pill>
                    {notice.institutionId === null && (
                      <Pill variant="neutral">প্ল্যাটফর্ম নোটিশ</Pill>
                    )}
                  </div>
                  <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">
                    {notice.body}
                  </p>
                  <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] tabular-nums">
                    প্রকাশক: {notice.authorName} · তারিখ: {formatNumeral(notice.createdAt, numeralLocale)}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    deleteNotice(notice.id);
                    showToast('নোটিশ মুছে ফেলা হয়েছে', 'success');
                  }}
                  aria-label={`নোটিশ "${notice.title}" মুছুন`}
                  className="p-2 rounded-[10px] text-[#DC2626] hover:bg-[#DC2626]/10 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
