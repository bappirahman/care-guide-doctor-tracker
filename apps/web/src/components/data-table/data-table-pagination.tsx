'use client';

import type { PaginationMeta } from '@doctor-tracker/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNumber } from '@/lib/format';
import { PAGE_SIZE_OPTIONS } from '@/lib/search-params';

type DataTablePaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function DataTablePagination({
  meta,
  onPageChange,
  onLimitChange,
}: DataTablePaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className="text-muted-foreground flex flex-col-reverse gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p aria-live="polite">
        Showing <span className="text-foreground font-medium">{formatNumber(first)}</span>–
        <span className="text-foreground font-medium">{formatNumber(last)}</span> of{' '}
        <span className="text-foreground font-medium">{formatNumber(total)}</span>
      </p>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">
            Page {formatNumber(page)} of {formatNumber(totalPages)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
}
