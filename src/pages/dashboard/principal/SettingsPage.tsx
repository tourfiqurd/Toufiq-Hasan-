import React, { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import type { FourthSubjectConfig, GradingScaleRule, NumeralLocale } from '../../../lib/grading/types';
import { useApp } from '../../../store/AppContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/FormControls';

export const SettingsPage: React.FC = () => {
  const { repo, updateInstitutionSettings, showToast } = useApp();
  if (!repo) return null;

  const inst = repo.getInstitution();
  const settings = repo.getSettings();
  if (!inst || !settings) return null;

  const [instForm, setInstForm] = useState({
    name: inst.name,
    eiin: inst.eiin,
    address: inst.address,
    district: inst.district,
    phone: inst.phone,
    email: inst.email,
    logoDataUrl: inst.logoDataUrl ?? '',
  });
  const [locale, setLocale] = useState<NumeralLocale>(settings.numeralLocale);
  const [scale, setScale] = useState<GradingScaleRule[]>(
    settings.gradingScale.map((g) => ({ ...g }))
  );
  const [fourthConfig, setFourthConfig] = useState<FourthSubjectConfig>({
    ...settings.fourthConfig,
  });
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    updateInstitutionSettings({
      institutionPatch: instForm,
      numeralLocale: locale,
      fourthConfig,
      gradingScale: scale,
    });
    setDirty(false);
    showToast('প্রতিষ্ঠান সেটিংস সংরক্ষিত হয়েছে', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Institution Info */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">প্রতিষ্ঠানের তথ্য</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="প্রতিষ্ঠানের নাম"
            value={instForm.name}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, name: e.target.value }));
              setDirty(true);
            }}
          />
          <Input
            label="EIIN"
            value={instForm.eiin}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, eiin: e.target.value }));
              setDirty(true);
            }}
          />
          <Input
            label="জেলা"
            value={instForm.district}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, district: e.target.value }));
              setDirty(true);
            }}
          />
          <Input
            label="ঠিকানা"
            value={instForm.address}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, address: e.target.value }));
              setDirty(true);
            }}
          />
          <Input
            label="ফোন"
            value={instForm.phone}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, phone: e.target.value }));
              setDirty(true);
            }}
          />
          <Input
            label="ইমেইল"
            value={instForm.email}
            onChange={(e) => {
              setInstForm((p) => ({ ...p, email: e.target.value }));
              setDirty(true);
            }}
          />
        </div>
        <div className="pt-1">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#E2E6F3] dark:border-[#262F52] text-xs font-semibold cursor-pointer hover:bg-[#4F46E5]/10">
            <Upload className="w-4 h-4 text-[#4F46E5]" />
            <span>প্রতিষ্ঠানের লোগো পরিবর্তন</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setInstForm((p) => ({ ...p, logoDataUrl: String(reader.result) }));
                  setDirty(true);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      </Card>

      {/* 2. Numeral Format */}
      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">সংখ্যা ফরম্যাট</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setLocale('bn');
              setDirty(true);
            }}
            className={`px-4 py-2.5 rounded-[12px] border-[1.5px] text-sm font-semibold cursor-pointer ${
              locale === 'bn'
                ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#A5B4FC]'
                : 'border-[#E2E6F3] dark:border-[#262F52]'
            }`}
          >
            বাংলা সংখ্যা (১২৩, ৫.০০)
          </button>
          <button
            type="button"
            onClick={() => {
              setLocale('en');
              setDirty(true);
            }}
            className={`px-4 py-2.5 rounded-[12px] border-[1.5px] text-sm font-semibold cursor-pointer ${
              locale === 'en'
                ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#A5B4FC]'
                : 'border-[#E2E6F3] dark:border-[#262F52]'
            }`}
          >
            ইংরেজি সংখ্যা (123, 5.00)
          </button>
        </div>
      </Card>

      {/* 3. Grading Scale */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">গ্রেডিং স্কেল</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E6F3] dark:border-[#262F52] text-xs font-bold">
                <th className="py-2 text-left">লেটার গ্রেড</th>
                <th className="py-2 text-left">সর্বনিম্ন নম্বর</th>
                <th className="py-2 text-left">সর্বোচ্চ নম্বর</th>
                <th className="py-2 text-left">গ্রেড পয়েন্ট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
              {scale.map((row, idx) => (
                <tr key={row.letter}>
                  <td className="py-2 font-bold">{row.letter}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={row.minMark}
                      onChange={(e) => {
                        setScale((prev) =>
                          prev.map((g, i) =>
                            i === idx ? { ...g, minMark: Number(e.target.value) } : g
                          )
                        );
                        setDirty(true);
                      }}
                      className="w-24 rounded-lg border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020] px-2.5 py-1 text-sm tabular-nums"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={row.maxMark}
                      onChange={(e) => {
                        setScale((prev) =>
                          prev.map((g, i) =>
                            i === idx ? { ...g, maxMark: Number(e.target.value) } : g
                          )
                        );
                        setDirty(true);
                      }}
                      className="w-24 rounded-lg border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020] px-2.5 py-1 text-sm tabular-nums"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.25"
                      value={row.point}
                      onChange={(e) => {
                        setScale((prev) =>
                          prev.map((g, i) =>
                            i === idx ? { ...g, point: Number(e.target.value) } : g
                          )
                        );
                        setDirty(true);
                      }}
                      className="w-24 rounded-lg border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#0B1020] px-2.5 py-1 text-sm tabular-nums"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Fourth Subject Rules */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">৪র্থ বিষয়ের নিয়ম</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="বেস পাস পয়েন্ট (বোনাস বাদ দেওয়ার ভিত্তি)"
            type="number"
            step="0.5"
            value={fourthConfig.basePassPoint}
            onChange={(e) => {
              setFourthConfig((p) => ({ ...p, basePassPoint: Number(e.target.value) }));
              setDirty(true);
            }}
          />
          <Input
            label="সর্বোচ্চ বোনাস পয়েন্ট"
            type="number"
            step="0.5"
            value={fourthConfig.maxBonus}
            onChange={(e) => {
              setFourthConfig((p) => ({ ...p, maxBonus: Number(e.target.value) }));
              setDirty(true);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="fourth-fail"
              checked={fourthConfig.failZerosBonusOnly}
              onChange={() => {
                setFourthConfig((p) => ({ ...p, failZerosBonusOnly: true }));
                setDirty(true);
              }}
            />
            <span>৪র্থ বিষয়ে ফেল করলে শুধু বোনাস ০ হবে</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="fourth-fail"
              checked={!fourthConfig.failZerosBonusOnly}
              onChange={() => {
                setFourthConfig((p) => ({ ...p, failZerosBonusOnly: false }));
                setDirty(true);
              }}
            />
            <span>৪র্থ বিষয়ে ফেল করলে পুরো পরীক্ষা অনুত্তীর্ণ হবে</span>
          </label>
        </div>
      </Card>

      {/* Sticky Save Bar */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-[16px] bg-[#0B1437] text-white px-6 py-3 floating-shadow flex items-center gap-4 border border-white/15">
          <span className="text-sm font-semibold">অসংরক্ষিত পরিবর্তন রয়েছে</span>
          <Button size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
            সেটিংস সংরক্ষণ করুন
          </Button>
        </div>
      )}
    </div>
  );
};
