import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { exportToCsv } from '../../../lib/exportUtils';
import { formatNumeral } from '../../../lib/grading/numerals';
import { useApp } from '../../../store/AppContext';
import type { AuditLog } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input, Select } from '../../../components/ui/FormControls';
import { Pill } from '../../../components/ui/Pill';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'সুপার এডমিন',
  institution_admin: 'অধ্যক্ষ',
  teacher: 'শিক্ষক',
  student: 'শিক্ষার্থী',
  parent: 'অভিভাবক',
};

const ACTION_TYPES = [
  'all',
  'লগইন',
  'প্রতিষ্ঠান ব্যবস্থাপনা',
  'পরীক্ষা তৈরি',
  'নম্বর এন্ট্রি',
  'নম্বর পরিবর্তন',
  'ফলাফল প্রকাশ',
  'ব্যবহারকারী ও কাঠামো',
  'নোটিশ',
];

export const AuditLogView: React.FC = () => {
  const { repo, numeralLocale, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');

  const logs = repo?.getAuditLogs() ?? [];

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (dateFrom && log.createdAt.slice(0, 10) < dateFrom) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          log.userName.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, actionFilter, dateFrom, searchQuery]);

  const handleExport = () => {
    exportToCsv(
      'academia-audit-log.csv',
      ['সময়', 'ব্যবহারকারী', 'ভূমিকা', 'কার্যক্রম', 'বিবরণ'],
      filtered.map((l) => [
        l.createdAt,
        l.userName,
        ROLE_LABELS[l.userRole] ?? l.userRole,
        l.action,
        l.details,
      ])
    );
    showToast('অডিট লগ CSV ডাউনলোড হয়েছে', 'success');
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'time',
      header: 'সময়',
      render: (r) => (
        <span className="text-xs text-[#5D6785] dark:text-[#98A2C7] whitespace-nowrap">
          {formatNumeral(r.createdAt, numeralLocale)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'ব্যবহারকারী',
      render: (r) => <span className="font-semibold whitespace-nowrap">{r.userName}</span>,
    },
    {
      key: 'role',
      header: 'ভূমিকা',
      render: (r) => <Pill variant="neutral">{ROLE_LABELS[r.userRole] ?? r.userRole}</Pill>,
    },
    {
      key: 'action',
      header: 'কার্যক্রম',
      render: (r) => (
        <Pill variant={r.action === 'নম্বর পরিবর্তন' ? 'warning' : 'info'}>{r.action}</Pill>
      ),
    },
    {
      key: 'details',
      header: 'বিবরণ',
      render: (r) => (
        <div className="space-y-1 max-w-md">
          <p className="text-xs sm:text-sm">{r.details}</p>
          {(r.beforeValue || r.afterValue) && (
            <p className="text-[11px] font-mono text-[#B45309] dark:text-[#FCD34D] bg-[#F59E0B]/10 rounded px-2 py-0.5 inline-block">
              পূর্ব: {JSON.stringify(r.beforeValue)} → পর: {JSON.stringify(r.afterValue)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Input
            label="ব্যবহারকারী বা বিবরণ খুঁজুন"
            leftIcon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম বা কীওয়ার্ড..."
          />
          <Select
            label="কার্যক্রমের ধরন"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'সকল কার্যক্রম' : a}
              </option>
            ))}
          </Select>
          <Input
            label="তারিখ থেকে"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              CSV ডাউনলোড
            </Button>
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        rowClassName={(r) =>
          r.action === 'নম্বর পরিবর্তন' ? 'bg-[#F59E0B]/[0.06] dark:bg-[#F59E0B]/[0.09]' : ''
        }
        emptyState={
          <EmptyState
            title="কোনো অডিট তথ্য পাওয়া যায়নি"
            description="ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।"
          />
        }
      />
    </div>
  );
};
