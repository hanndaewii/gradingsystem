'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  maxPageButtons?: number;
  className?: string;
}

export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      total,
      page,
      pageSize,
      onPageChange,
      onPageSizeChange,
      pageSizes = [10, 25, 50, 100],
      showPageSize = true,
      showTotal = true,
      maxPageButtons = 5,
    },
    ref
  ) => {
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    const getPageNumbers = () => {
      if (totalPages <= maxPageButtons) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const half = Math.floor(maxPageButtons / 2);
      let start = Math.max(1, page - half);
      let end = Math.min(totalPages, start + maxPageButtons - 1);

      if (end - start + 1 < maxPageButtons) {
        start = Math.max(1, end - maxPageButtons + 1);
      }

      const pages: (number | 'ellipsis')[] = [];

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('ellipsis');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('ellipsis');
        pages.push(totalPages);
      }

      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div
        ref={ref}
        className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}
        role="navigation"
        aria-label="Pagination"
      >
        {showTotal && total > 0 && (
          <div className="text-body-sm text-semantic-text-secondary">
            Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{total}</strong> results
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
            {pageNumbers.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-body-sm text-semantic-text-tertiary" aria-hidden="true">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={page === item ? 'primary' : 'ghost'}
                  size="icon"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={page === item ? 'page' : undefined}
                >
                  {item}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-body-sm text-semantic-text-secondary">
              Rows per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 text-body-sm bg-semantic-input-bg border border-semantic-input-border rounded-soft focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export interface SimplePaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  maxButtons?: number;
  className?: string;
}

export const SimplePagination = React.forwardRef<HTMLDivElement, SimplePaginationProps>(
  ({ className, totalPages, currentPage, onPageChange, maxButtons = 5 }, ref) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      if (totalPages <= maxButtons) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const half = Math.floor(maxButtons / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, start + maxButtons - 1);

      if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
      }

      const pages: (number | 'ellipsis')[] = [];

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('ellipsis');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('ellipsis');
        pages.push(totalPages);
      }

      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <nav ref={ref} className={cn('flex items-center gap-1', className)} aria-label="Pagination">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
          {pageNumbers.map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-body-sm text-semantic-text-tertiary" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={currentPage === item ? 'primary' : 'ghost'}
                size="icon"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={currentPage === item ? 'page' : undefined}
              >
                {item}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    );
  }
);

SimplePagination.displayName = 'SimplePagination';

export { Pagination };