'use client';

import * as React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
  Row,
  Table as TanStackTable,
  ColumnDef,
  RowData,
  useReactTable,
  getExpandedRowModel,
  ExpandedState,
} from '@tanstack/react-table';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  MessageSquare,
  History,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/DropdownMenu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { GradeCell } from './GradeCell';
import { RubricSidebar } from './RubricSidebar';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { GradeHistoryPanel } from './GradeHistoryPanel';
import { useDebounce } from '@/hooks/useDebounce';

export interface StudentGradeRow {
  id: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  grades: Record<string, GradeCellData>;
  finalGrade: number | null;
  letterGrade: string;
  attendance: number;
  status: 'active' | 'inactive' | 'dropped' | 'incomplete';
}

export interface GradeCellData {
  value: number | null;
  maxPoints: number;
  weight: number;
  status: 'draft' | 'submitted' | 'approved' | 'missing' | 'late' | 'excused';
  comment?: string;
  rubricScores?: Record<string, number>;
  history: GradeHistoryEntry[];
  assessmentId: string;
  assessmentType: string;
}

export interface GradeHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  oldValue: number | null;
  newValue: number | null;
  action: 'created' | 'updated' | 'submitted' | 'approved' | 'reverted';
}

export interface AssessmentColumn {
  id: string;
  title: string;
  type: 'exam' | 'quiz' | 'assignment' | 'project' | 'participation' | 'final';
  maxPoints: number;
  weight: number;
  dueDate?: string;
  rubricId?: string;
  visible: boolean;
  order: number;
}

interface GradebookGridProps {
  students: StudentGradeRow[];
  assessments: AssessmentColumn[];
  onGradeChange: (studentId: string, assessmentId: string, value: number | null, status?: GradeCellData['status']) => void;
  onBulkAction: (action: 'fillDown' | 'fillRight' | 'import' | 'export' | 'submitAll', data?: unknown) => void;
  onStudentClick?: (student: StudentGradeRow) => void;
  loading?: boolean;
  saving?: boolean;
  autoSaveEnabled?: boolean;
  className?: string;
}

const columnHelper = createColumnHelper<StudentGradeRow>();

const STATUS_BADGES: Record<GradeCellData['status'], { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string; icon: React.ReactNode }> = {
  draft: { variant: 'warning', label: 'Draft', icon: <Clock className="h-3 w-3" /> },
  submitted: { variant: 'info', label: 'Submitted', icon: <Save className="h-3 w-3" /> },
  approved: { variant: 'success', label: 'Approved', icon: <CheckCircle className="h-3 w-3" /> },
  missing: { variant: 'error', label: 'Missing', icon: <AlertTriangle className="h-3 w-3" /> },
  late: { variant: 'warning', label: 'Late', icon: <Clock className="h-3 w-3" /> },
  excused: { variant: 'default', label: 'Excused', icon: <EyeOff className="h-3 w-3" /> },
};

const ASSESSMENT_TYPE_ICONS: Record<AssessmentColumn['type'], React.ReactNode> = {
  exam: <span className="text-caption">📝</span>,
  quiz: <span className="text-caption">❓</span>,
  assignment: <span className="text-caption">📋</span>,
  project: <span className="text-caption">📁</span>,
  participation: <span className="text-caption">👥</span>,
  final: <span className="text-caption">🏆</span>,
};

export function GradebookGrid({
  students,
  assessments,
  onGradeChange,
  onBulkAction,
  onStudentClick,
  loading = false,
  saving = false,
  autoSaveEnabled = true,
  className,
}: GradebookGridProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [selectedCell, setSelectedCell] = React.useState<{ studentId: string; assessmentId: string } | null>(null);
  const [showRubric, setShowRubric] = React.useState<{ studentId: string; assessmentId: string } | null>(null);
  const [showHistory, setShowHistory] = React.useState<{ studentId: string; assessmentId: string } | null>(null);
  const [keyboardNavigation, setKeyboardNavigation] = React.useState<{ rowIndex: number; colIndex: number } | null>(null);

  // Debounced auto-save
  const debouncedSave = useDebounce((updates: Array<{ studentId: string; assessmentId: string; value: number | null }>) => {
    if (autoSaveEnabled && updates.length > 0) {
      // Auto-save logic would go here
      console.log('Auto-saving:', updates);
    }
  }, 300);

  const pendingSaves = React.useRef<Array<{ studentId: string; assessmentId: string; value: number | null }>>([]);

  const visibleAssessments = assessments.filter(a => a.visible).sort((a, b) => a.order - b.order);

  // Build columns dynamically
  const columns = React.useMemo((): ColumnDef<StudentGradeRow>[] => {
    const cols: ColumnDef<StudentGradeRow>[] = [
      columnHelper.accessor('studentNumber', {
        header: 'ID',
        cell: ({ getValue, row }) => (
          <div className="font-mono text-body-sm text-semantic-text-secondary whitespace-nowrap">
            {getValue()}
          </div>
        ),
        size: 80,
        minSize: 70,
        maxSize: 120,
      }),
      columnHelper.accessor('lastName', {
        header: 'Last Name',
        cell: ({ getValue, row }) => (
          <div className="font-medium text-body-sm text-semantic-text-primary whitespace-nowrap">
            {getValue()}
          </div>
        ),
        size: 140,
        minSize: 120,
      }),
      columnHelper.accessor('firstName', {
        header: 'First Name',
        cell: ({ getValue, row }) => (
          <div className="text-body-sm text-semantic-text-primary whitespace-nowrap">
            {getValue()}
          </div>
        ),
        size: 140,
        minSize: 120,
      }),
    ];

    // Add assessment columns
    visibleAssessments.forEach((assessment, index) => {
      const colIndex = index + 3; // After ID, Last, First
      cols.push(
        columnHelper.accessor(`grades.${assessment.id}`, {
          id: assessment.id,
          header: (
            <div className="relative min-w-[100px]">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1">
                  {ASSESSMENT_TYPE_ICONS[assessment.type]}
                  <span className="font-semibold text-body-sm text-semantic-text-primary whitespace-nowrap">
                    {assessment.title}
                  </span>
                </div>
                <div className="text-caption text-semantic-text-tertiary">
                  {assessment.maxPoints} pts • {assessment.weight}%
                </div>
                {assessment.dueDate && (
                  <div className="text-caption text-semantic-text-tertiary">
                    Due: {new Date(assessment.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ),
          cell: ({ getValue, row }) => {
            const gradeData = row.original.grades[assessment.id];
            if (!gradeData) return null;

            const isSelected = selectedCell?.studentId === row.original.studentId &&
              selectedCell?.assessmentId === assessment.id;

            return (
              <GradeCell
                key={`${row.original.studentId}-${assessment.id}`}
                gradeData={gradeData}
                assessment={assessment}
                student={row.original}
                isSelected={isSelected}
                onChange={(value, status) => handleGradeChange(row.original.studentId, assessment.id, value, status)}
                onSelect={() => setSelectedCell({ studentId: row.original.studentId, assessmentId: assessment.id })}
                onRubricClick={() => setShowRubric({ studentId: row.original.studentId, assessmentId: assessment.id })}
                onHistoryClick={() => setShowHistory({ studentId: row.original.studentId, assessmentId: assessment.id })}
                onKeyDown={(e) => handleKeyNavigation(e, row.index, colIndex)}
              />
            );
          },
          size: 100,
          minSize: 80,
          maxSize: 140,
        })
      );
    });

    // Final grade column
    cols.push(
      columnHelper.accessor('finalGrade', {
        id: 'finalGrade',
        header: 'Final Grade',
        cell: ({ getValue, row }) => (
          <div className="font-bold text-body text-semantic-text-primary">
            {getValue() !== null ? `${getValue()}%` : '—'}
          </div>
        ),
        footer: ({ column }) => {
          const values = column.getFilteredRowModel().rows
            .map(row => row.getValue(column.id))
            .filter((v): v is number => v !== null && v !== undefined);
          const avg = values.length > 0
            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
            : '—';
          return <div className="font-semibold text-body-sm text-semantic-text-secondary">Avg: {avg}%</div>;
        },
        size: 100,
        minSize: 90,
      })
    );

    cols.push(
      columnHelper.accessor('letterGrade', {
        id: 'letterGrade',
        header: 'Letter',
        cell: ({ getValue }) => {
          const grade = getValue();
          const colors: Record<string, string> = {
            A: 'text-emerald-600 bg-emerald-50',
            B: 'text-blue-600 bg-blue-50',
            C: 'text-amber-600 bg-amber-50',
            D: 'text-orange-600 bg-orange-50',
            F: 'text-rose-600 bg-rose-50',
          };
          return (
            <Badge variant="default" className={colors[grade] || ''}>
              {grade || '—'}
            </Badge>
          );
        },
        size: 70,
        minSize: 60,
      })
    );

    return cols;
  }, [visibleAssessments, selectedCell]);

  const table = useReactTable({
    data: students,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
      globalFilter,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
  });

  const handleGradeChange = React.useCallback((
    studentId: string,
    assessmentId: string,
    value: number | null,
    status?: GradeCellData['status']
  ) => {
    onGradeChange(studentId, assessmentId, value, status);

    // Queue for auto-save
    pendingSaves.current.push({ studentId, assessmentId, value });
    debouncedSave([...pendingSaves.current]);
    pendingSaves.current = [];
  }, [onGradeChange, debouncedSave]);

  const handleKeyNavigation = React.useCallback((
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => {
    const totalRows = students.length;
    const totalCols = 3 + visibleAssessments.length + 2; // 3 fixed + assessments + final + letter

    let newRow = rowIndex;
    let newCol = colIndex;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          newCol = colIndex - 1;
          if (newCol < 0) { newCol = totalCols - 1; newRow = rowIndex - 1; }
        } else {
          newCol = colIndex + 1;
          if (newCol >= totalCols) { newCol = 0; newRow = rowIndex + 1; }
        }
        break;
      case 'Enter':
        e.preventDefault();
        newRow = rowIndex + 1;
        break;
      case 'ArrowUp':
        e.preventDefault();
        newRow = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRow = Math.min(totalRows - 1, rowIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newCol = Math.max(0, colIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newCol = Math.min(totalCols - 1, colIndex + 1);
        break;
      default:
        return;
    }

    if (newRow >= 0 && newRow < totalRows && newCol >= 0 && newCol < totalCols) {
      setKeyboardNavigation({ rowIndex: newRow, colIndex: newCol });
      // Focus the cell - would need ref management in real implementation
    }
  }, [students.length, visibleAssessments.length]);

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-semantic-border-primary bg-semantic-card-bg overflow-hidden', className)}>
        <div className="p-4 border-b border-semantic-border-primary flex items-center justify-between">
          <h3 className="text-heading-sm font-semibold text-semantic-text-primary">Gradebook</h3>
          <div className="h-6 w-48 animate-pulse bg-semantic-bg-tertiary rounded" />
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          <table className="w-full" role="grid">
            <thead>
              <tr className="border-b border-semantic-border-primary bg-semantic-bg-secondary">
                {columns.map((col, i) => (
                  <th key={col.id || i} className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">
                    <div className="animate-pulse h-4 w-24 bg-semantic-bg-tertiary rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-semantic-border-primary">
                  {columns.map((_, j) => (
                    <td key={j} className="p-3">
                      <div className="animate-pulse h-4 w-20 bg-semantic-bg-tertiary rounded" />
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
    <div className={cn('rounded-xl border border-semantic-border-primary bg-semantic-card-bg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="p-4 border-b border-semantic-border-primary flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <h3 className="text-heading-sm font-semibold text-semantic-text-primary">Gradebook</h3>
          <Badge variant="outline" className="text-capacity">
            {students.length} students • {visibleAssessments.length} assessments
          </Badge>
          {saving && (
            <Badge variant="info" className="gap-1 animate-pulse">
              <Clock className="h-3 w-3" />
              Saving...
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Actions */}
          <BulkActionsToolbar
            onAction={onBulkAction}
            studentCount={students.length}
            assessmentCount={visibleAssessments.length}
            hasChanges={pendingSaves.current.length > 0}
          />

          {/* Search */}
          <div className="relative max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
            <Input
              placeholder="Search students..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              size="sm"
            />
          </div>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 max-h-96 overflow-y-auto">
              <div className="px-2 py-1.5 text-caption font-medium text-semantic-text-tertiary">Student Info</div>
              <DropdownMenuCheckboxItem
                checked={true}
                onCheckedChange={() => {}}
                disabled
                className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
              >
                Student ID
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={true}
                onCheckedChange={() => {}}
                disabled
                className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
              >
                Last Name
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={true}
                onCheckedChange={() => {}}
                disabled
                className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
              >
                First Name
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-caption font-medium text-semantic-text-tertiary">Assessments</div>
              {visibleAssessments.map((assessment) => (
                <DropdownMenuCheckboxItem
                  key={assessment.id}
                  checked={columnVisibility[assessment.id] !== false}
                  onCheckedChange={(checked) => table.getColumn(assessment.id)?.toggleVisibility(checked)}
                  className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
                >
                  {ASSESSMENT_TYPE_ICONS[assessment.type]}
                  {assessment.title}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={columnVisibility.finalGrade !== false}
                onCheckedChange={(checked) => table.getColumn('finalGrade')?.toggleVisibility(checked)}
                className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
              >
                Final Grade
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.letterGrade !== false}
                onCheckedChange={(checked) => table.getColumn('letterGrade')?.toggleVisibility(checked)}
                className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
              >
                Letter Grade
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onBulkAction('export', { format: 'csv' })}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction('export', { format: 'xlsx' })}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction('export', { format: 'pdf' })}>
                <Download className="h-4 w-4 mr-2" />
                PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full" role="grid">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-semantic-border-primary bg-semantic-bg-secondary sticky top-0 z-10">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'p-2 text-left text-body-sm font-semibold text-semantic-text-secondary',
                      'first:rounded-tl-xl last:rounded-tr-xl',
                      header.column.getCanHide() && 'pr-6'
                    )}
                    style={{ width: header.getSize(), minWidth: header.getSize() }}
                  >
                    <div className="flex items-start gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                header.column.toggleSorting(header.column.getIsSorted() === 'asc' ? false : 'asc');
                              }}
                              className="p-1 rounded hover:bg-semantic-bg-tertiary transition-colors"
                              aria-label={`Sort by ${header.column.columnDef.header}`}
                            >
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-3 w-3 text-semantic-brand-primary" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-3 w-3 text-semantic-brand-primary" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 text-semantic-text-tertiary" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="center">Sort</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-semantic-border-primary">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-semantic-text-tertiary">
                  {globalFilter || columnFilters.length > 0 ? 'No matching students found' : 'No students enrolled'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors duration-fast',
                    'hover:bg-semantic-bg-secondary/50',
                    onStudentClick && 'cursor-pointer',
                    row.getIsExpanded() && 'bg-semantic-bg-secondary/50',
                    keyboardNavigation?.rowIndex === rowIndex && 'ring-2 ring-semantic-brand-primary'
                  )}
                  onClick={() => onStudentClick?.(row.original)}
                  onDoubleClick={() => {
                    const firstAssessment = visibleAssessments[0];
                    if (firstAssessment) {
                      setSelectedCell({ studentId: row.original.studentId, assessmentId: firstAssessment.id });
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id} className="border-t border-semantic-border-primary bg-semantic-bg-secondary">
                {footerGroup.headers.map((header) => (
                  <td key={header.id} className="p-2 text-body-sm font-semibold text-semantic-text-secondary">
                    {flexRender(header.column.columnDef.footer, header.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-semantic-border-primary flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-body-sm text-semantic-text-secondary">
          <span>
            Showing <strong>{pagination.pageIndex * pagination.pageSize + 1}</strong> to{' '}
            <strong>{Math.min((pagination.pageIndex + 1) * pagination.pageSize, table.getFilteredRowModel().rows.length)}</strong>
            of <strong>{table.getFilteredRowModel().rows.length}</strong> students
          </span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => setPagination((prev) => ({ ...prev, pageSize: Number(v) }))}
            options={[
              { value: '25', label: '25 per page' },
              { value: '50', label: '50 per page' },
              { value: '100', label: '100 per page' },
              { value: '200', label: '200 per page' },
            ]}
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

      {/* Side Panels */}
      {showRubric && (
        <RubricSidebar
          studentId={showRubric.studentId}
          assessmentId={showRubric.assessmentId}
          onClose={() => setShowRubric(null)}
          onGradeSubmit={(criteriaScores, comments) => {
            // Handle rubric grading submission
            console.log('Rubric submitted:', criteriaScores, comments);
          }}
        />
      )}

      {showHistory && (
        <GradeHistoryPanel
          studentId={showHistory.studentId}
          assessmentId={showHistory.assessmentId}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}