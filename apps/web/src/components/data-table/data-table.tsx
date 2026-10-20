'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type ColumnSort = {
  asc: string;
  desc: string;
  // Which direction the first click picks: newest-first for dates, A–Z for names.
  initial: 'asc' | 'desc';
};

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  sort?: ColumnSort;
};

type DataTableProps<T> = {
  label: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  // Mobile layout: the few fields that matter, stacked.
  renderCard: (row: T) => ReactNode;
  isLoading: boolean;
  isFetching?: boolean;
  skeletonRows?: number;
  sort?: string;
  onSortChange?: (value: string) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  empty: ReactNode;
};

// Clicks on links, buttons and menus inside a row shouldn't also open the row.
const fromInteractive = (event: MouseEvent) =>
  (event.target as HTMLElement).closest('a, button, [role="menuitem"]') !== null;

export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  renderCard,
  isLoading,
  isFetching = false,
  skeletonRows = 8,
  sort,
  onSortChange,
  onRowClick,
  rowActions,
  empty,
}: DataTableProps<T>) {
  if (!isLoading && rows?.length === 0) return empty;

  const handleRowClick = (row: T) => (event: MouseEvent) => {
    if (onRowClick && !fromInteractive(event)) onRowClick(row);
  };

  return (
    // Previous rows stay visible (dimmed) while the next page or filter result loads.
    <div
      aria-busy={isLoading || isFetching}
      className={cn(isFetching && !isLoading && 'opacity-60 transition-opacity')}
    >
      {/* No overflow wrapper: it would break the sticky header. */}
      <div className="bg-card hidden rounded-lg border md:block">
        <table className="w-full caption-bottom text-sm" aria-label={label}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  aria-sort={ariaSort(column.sort, sort)}
                  className={cn(
                    'bg-card text-muted-foreground sticky top-14 z-10 h-10 px-4 text-xs font-medium first:rounded-tl-lg',
                    !rowActions && 'last:rounded-tr-lg',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.sort && onSortChange ? (
                    <SortButton column={column} sort={sort} onSortChange={onSortChange} />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead className="bg-card sticky top-14 z-10 w-12 rounded-tr-lg">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !rows
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <TableRow key={index} className="hover:bg-transparent">
                    {columns.map((column) => (
                      <TableCell key={column.id} className="h-12 px-4">
                        <Skeleton
                          className={cn('h-4', column.align === 'right' ? 'ml-auto w-10' : 'w-3/4')}
                        />
                      </TableCell>
                    ))}
                    {rowActions && <TableCell />}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={getRowId(row)}
                    onClick={handleRowClick(row)}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          'h-12 px-4',
                          column.align === 'right' && 'text-right',
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell className="pr-2 text-right">
                        <RowActions>{rowActions(row)}</RowActions>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
          </TableBody>
        </table>
      </div>

      <ul className="bg-card divide-y rounded-lg border md:hidden" aria-label={label}>
        {isLoading || !rows
          ? Array.from({ length: Math.min(skeletonRows, 6) }, (_, index) => (
              <li key={index} className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </li>
            ))
          : rows.map((row) => (
              <li
                key={getRowId(row)}
                onClick={handleRowClick(row)}
                className={cn(
                  'flex items-start gap-3 p-4',
                  onRowClick && 'active:bg-muted/50 cursor-pointer',
                )}
              >
                <div className="min-w-0 flex-1">{renderCard(row)}</div>
                {rowActions && <RowActions>{rowActions(row)}</RowActions>}
              </li>
            ))}
      </ul>
    </div>
  );
}

function RowActions({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          aria-label="Row actions"
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortButton<T>({
  column,
  sort,
  onSortChange,
}: {
  column: Column<T>;
  sort: string | undefined;
  onSortChange: (value: string) => void;
}) {
  const options = column.sort;
  if (!options) return null;

  const active = sort === options.asc ? 'asc' : sort === options.desc ? 'desc' : null;
  const next =
    active === 'asc' ? options.desc : active === 'desc' ? options.asc : options[options.initial];
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSortChange(next)}
      className={cn(
        'hover:text-foreground focus-visible:ring-ring/50 -mx-1 inline-flex items-center gap-1 rounded px-1 outline-none focus-visible:ring-2',
        active && 'text-foreground',
        column.align === 'right' && 'flex-row-reverse',
      )}
    >
      {column.header}
      <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
    </button>
  );
}

function ariaSort(options: ColumnSort | undefined, sort: string | undefined) {
  if (!options) return undefined;
  if (sort === options.asc) return 'ascending';
  if (sort === options.desc) return 'descending';
  return 'none';
}
