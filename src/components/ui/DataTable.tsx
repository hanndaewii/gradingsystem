'use client';

import * as React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  ExpandedState,
  VisibilityState,
  Row,
  Table as TanStackTable,
  ColumnDef,
  RowData,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, ChevronLeft, ChevronRight, Download, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from './DropdownMenu';

interface Column<TData extends RowData> {
  accessorKey: keyof TData | string;
  header: string;
  cell?: (info: { getValue: () => unknown; row: Row<TData> }) => React.ReactNode;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableHiding?: boolean;
  size?: number;
  minSize?: number;
  maxSize?: number;
}

export interface TableProps<TData extends RowData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  rowKey?: string | ((row: TData) => string);
  sortable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  pageSizes?: number[];
  virtualized?: boolean;
  rowHeight?: number;
  onRowClick?: (row: TData) => void;
  rowActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: TData) => void;
    variant?: 'default' | 'destructive';
  }>;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  showColumnVisibility?: boolean;
  showExport?: boolean;
  onExport?: () => void;
}

const columnHelper = createColumnHelper<RowData>();

function DataTable<TData extends RowData>({
  columns,
  data,
  rowKey = 'id',
  sortable = true,
  filterable = true,
  paginated = true,
  pageSize = 10,
  pageSizes = [10, 25, 50, 100],
  virtualized = false,
  rowHeight = 48,
  onRowClick,
  rowActions,
  emptyMessage = 'No data available',
  loading = false,
  className,
  showColumnVisibility = true,
  showExport = false,
  onExport,
}: TableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const getRowId = React.useCallback(
    (row: TData) => (typeof rowKey === 'function' ? rowKey(row) : String((row as Record<string, unknown>)[rowKey])),
    [rowKey]
  );

  const table = React.useMemo(
    () =>
      TanStackTable.createTable<TData>({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: sortable ? getSortedRowModel() : undefined,
        getFilteredRowModel: filterable ? getFilteredRowModel() : undefined,
        getPaginationRowModel: paginated ? getPaginationRowModel() : undefined,
        getExpandedRowModel: getExpandedRowModel(),
        state: {
          sorting,
          columnFilters,
          pagination,
          expanded,
          columnVisibility,
          globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        onExpandedChange: setExpanded,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        getRowId,
        manualPagination: false,
        manualSorting: false,
        manualFiltering: false,
      }),
    [
      data,
      columns,
      sortable,
      filterable,
      paginated,
      sorting,
      columnFilters,
      pagination,
      expanded,
      columnVisibility,
      globalFilter,
      getRowId,
    ]
  );

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-component-card-border bg-component-card-bg', className)}>
        <div className="overflow-x-auto">
          <table className="w-full" role="grid">
            <thead>
              <tr className="border-b border-component-card-border">
                {columns.map((col, i) => (
                  <th key={col.id || i} className="p-4 text-left text-body-sm font-semibold text-semantic-text-secondary">
                    <div className="animate-pulse h-4 w-24 bg-semantic-bg-tertiary rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-component-card-border">
                  {columns.map((_, j) => (
                    <td key={j} className="p-4">
                      <div className="animate-pulse h-4 w-32 bg-semantic-bg-tertiary rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-component-card-border bg-component-card-bg overflow-hidden', className)}>
      {filterable && (
        <div className="p-4 border-b border-component-card-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative max-w-xs w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            {showExport && onExport && (
              <Button variant="ghost" size="sm" onClick={onExport} className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
            {showColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Columns
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        checked={col.getIsVisible()}
                        onCheckedChange={(checked) => col.toggleVisibility(checked)}
                        className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
                      >
                        {col.getIsVisible() && <ChevronLeft className="h-4 w-4" />}
                        {flexRender(col.columnDef.header, col.getContext())}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto" style={virtualized ? { maxHeight: '600px' } : undefined}>
        <table className="w-full" role="grid">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-component-card-border bg-semantic-bg-secondary">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'p-3 text-left text-body-sm font-semibold text-semantic-text-secondary',
                      'first:rounded-tl-xl last:rounded-tr-xl',
                      header.column.getCanHide() && 'pr-8'
                    )}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <button
                          onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc' ? false : 'asc')}
                          className="p-1 rounded hover:bg-semantic-bg-tertiary transition-colors"
                          aria-label={`Sort by ${header.column.columnDef.header}`}
                        >
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-semantic-brand-primary" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-4 w-4 text-semantic-brand-primary" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 text-semantic-text-tertiary" />
                          )}
                        </button>
                      )}
                    </div>
                    {filterable && header.column.getCanFilter() && (
                      <div className="mt-2">
                        <Input
                          placeholder={`Filter ${header.column.columnDef.header}`}
                          value={(header.column.getFilterValue() as string) || ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          size="sm"
                          className="w-full"
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-component-card-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-semantic-text-tertiary">
                  {globalFilter || columnFilters.length > 0 ? 'No matching records found' : emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors duration-fast',
                    'hover:bg-semantic-bg-secondary',
                    onRowClick && 'cursor-pointer',
                    row.getIsExpanded() && 'bg-semantic-bg-secondary'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                  style={{ height: virtualized ? rowHeight : undefined }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3 text-body-sm text-semantic-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => action.onClick(row.original)}
                              className={cn('flex items-center gap-2', action.variant === 'destructive' && 'text-semantic-status-error')}
                            >
                              {action.icon && <span className="h-4 w-4">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated && (
        <div className="p-4 border-t border-component-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-body-sm text-semantic-text-secondary">
            <span>
              Showing{' '}
              <strong>{pagination.pageIndex * pagination.pageSize + 1}</strong> to{' '}
              <strong>{Math.min((pagination.pageIndex + 1) * pagination.pageSize, table.getFilteredRowModel().rows.length)}</strong>{' '}
              of <strong>{table.getFilteredRowModel().rows.length}</strong> results
            </span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination((prev) => ({ ...prev, pageSize: Number(v) }))}
              options={pageSizes.map((size) => ({ value: String(size), label: `${size} per page` }))}
              size="sm"
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable, columnHelper };