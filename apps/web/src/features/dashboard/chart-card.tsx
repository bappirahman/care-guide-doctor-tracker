'use client';

import { BarChart3, Table2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type TableColumn = { header: string; align?: 'right' };

type ChartCardProps = {
  title: string;
  description: ReactNode;
  chart: ReactNode;
  // The same numbers as a table: values never live only in a tooltip or a color.
  table: { columns: TableColumn[]; rows: ReactNode[][] };
  className?: string;
};

export function ChartCard({ title, description, chart, table, className }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -mt-1 -mr-2"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? <BarChart3 aria-hidden /> : <Table2 aria-hidden />}
          {showTable ? 'Chart' : 'Table'}
        </Button>
      </CardHeader>
      <CardContent>
        {showTable ? (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-card sticky top-0">
                <tr className="border-b">
                  {table.columns.map((column) => (
                    <th
                      key={column.header}
                      className={cn(
                        'text-muted-foreground h-9 px-2 text-left text-xs font-medium',
                        column.align === 'right' && 'text-right',
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn(
                          'h-9 px-2',
                          table.columns[cellIndex]?.align === 'right' && 'text-right',
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          chart
        )}
      </CardContent>
    </Card>
  );
}
