import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowClassName,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-[16px] border border-[#E2E6F3] dark:border-[#262F52] bg-white dark:bg-[#141B34]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#4F46E5]/[0.08] dark:bg-[#4F46E5]/[0.16] border-b border-[#E2E6F3] dark:border-[#262F52]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-bold text-[#111936] dark:text-[#E8ECFB] whitespace-nowrap ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E6F3] dark:divide-[#262F52]">
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={`hover:bg-[#4F46E5]/[0.04] dark:hover:bg-[#4F46E5]/[0.08] transition-colors ${
                rowClassName ? rowClassName(row) : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-[#111936] dark:text-[#E8ECFB] tabular-nums ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
