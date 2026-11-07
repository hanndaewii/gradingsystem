'use client';

import { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';

interface CSVRow {
  studentId: string;
  courseCode: string;
  section: string;
  term: string;
}

interface ValidationResult {
  row: CSVRow;
  valid: boolean;
  errors: string[];
  studentName?: string;
  courseName?: string;
}

type Step = 'upload' | 'validate' | 'confirm' | 'processing' | 'complete';

export function BulkEnrollWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return {
        studentId: row.studentid || row['student id'] || '',
        courseCode: row.coursecodigo || row['course code'] || row.coursecode || '',
        section: row.section || '',
        term: row.term || 'Fall 2024',
      };
    });
  };

  const validateRows = async (rows: CSVRow[]) => {
    // Simulate validation
    const results: ValidationResult[] = rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.studentId) errors.push('Missing student ID');
      if (!row.courseCode) errors.push('Missing course code');
      if (!row.section) errors.push('Missing section');
      
      // Mock validation against database
      const studentExists = row.studentId.startsWith('202');
      const courseExists = ['BUSAD 101', 'BUSAD 301', 'ECON 101', 'ECON 201', 'MGMT 401', 'MKTG 301', 'FIN 401', 'ACCT 201'].includes(row.courseCode);
      const sectionValid = ['A', 'B', 'C', 'D'].includes(row.section.toUpperCase());
      
      if (!studentExists) errors.push('Student ID not found');
      if (!courseExists) errors.push('Course code not found');
      if (!sectionValid) errors.push('Invalid section');
      
      return {
        row,
        valid: errors.length === 0,
        errors,
        studentName: studentExists ? `Student ${row.studentId}` : undefined,
        courseName: courseExists ? row.courseCode : undefined,
      };
    });
    setValidationResults(results);
    setStep('validate');
  };

  const handleUpload = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      validateRows(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    setStep('processing');
    setProcessingIndex(0);
    setSuccessCount(0);
    setErrorCount(0);
    processNext();
  };

  const processNext = () => {
    const validRows = validationResults.filter(r => r.valid);
    if (processingIndex >= validRows.length) {
      setProcessingComplete(true);
      setStep('complete');
      return;
    }

    // Simulate processing delay
    setTimeout(() => {
      setProcessingIndex(prev => prev + 1);
      if (Math.random() > 0.1) { // 90% success rate
        setSuccessCount(prev => prev + 1);
      } else {
        setErrorCount(prev => prev + 1);
      }
      processNext();
    }, 100);
  };

  const downloadTemplate = () => {
    const csv = 'Student ID,Course Code,Section,Term\n2021-00123,BUSAD 301,A,Fall 2024\n2021-00456,ECON 201,B,Fall 2024';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrollment_template.csv';
    a.click();
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;

  const progress = step === 'processing' ? (processingIndex / validationResults.filter(r => r.valid).length) * 100 : 0;

  const steps: { key: Step; label: string; number: number }[] = [
    { key: 'upload', label: 'Upload CSV', number: 1 },
    { key: 'validate', label: 'Validate', number: 2 },
    { key: 'confirm', label: 'Confirm', number: 3 },
    { key: 'processing', label: 'Processing', number: 4 },
    { key: 'complete', label: 'Complete', number: 5 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Bulk Enrollment Wizard" size="xl">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                i < currentStepIndex ? 'bg-green-500 text-white' :
                i === currentStepIndex ? 'bg-primary text-white' :
                'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : s.number}
              </div>
              <span className={`ml-2 text-sm font-medium ${i <= currentStepIndex ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>{s.label}</span>
              {i < steps.length - 1 && (
                <div className={`ml-4 w-16 h-0.5 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Card variant="outlined" className="p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upload Enrollment CSV</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                Drag and drop a CSV file or click to browse. The file should contain columns: Student ID, Course Code, Section, Term
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />Download Template
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Button disabled={!file} className="w-full sm:w-auto">
                    <FileText className="w-4 h-4 mr-2" />Choose File
                  </Button>
                </label>
              </div>
              {file && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </Card>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file}><ArrowRight className="w-4 h-4 ml-2" />Validate</Button>
            </div>
          </div>
        )}

        {step === 'validate' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{validCount}</p>
                <p className="text-sm text-gray-500">Valid Rows</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{invalidCount}</p>
                <p className="text-sm text-gray-500">Invalid Rows</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{validationResults.length}</p>
                <p className="text-sm text-gray-500">Total Rows</p>
              </Card>
            </div>

            {invalidCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Validation Errors ({invalidCount})</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { accessorKey: 'studentId', header: 'Student ID' },
                      { accessorKey: 'courseCode', header: 'Course Code' },
                      { accessorKey: 'section', header: 'Section' },
                      { accessorKey: 'errors', header: 'Errors', cell: ({ row }) => (
                        <div className="space-y-1">
                          {row.original.errors.map((err, i) => (
                            <Badge key={i} variant="danger" className="text-xs">{err}</Badge>
                          ))}
                        </div>
                      )},
                    ]}
                    data={validationResults.filter(r => !r.valid)}
                    pagination={false}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Valid Records ({validCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { accessorKey: 'studentId', header: 'Student ID' },
                    { accessorKey: 'studentName', header: 'Student Name' },
                    { accessorKey: 'courseCode', header: 'Course Code' },
                    { accessorKey: 'courseName', header: 'Course Name' },
                    { accessorKey: 'section', header: 'Section' },
                    { accessorKey: 'term', header: 'Term' },
                  ]}
                  data={validationResults.filter(r => r.valid)}
                  pagination
                  pageSize={10}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
              <Button onClick={handleConfirm} disabled={validCount === 0}>
                Confirm Enrollment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <h3 className="text-xl font-medium">Processing Enrollments...</h3>
            <p className="text-gray-500">Processing record {processingIndex + 1} of {validationResults.filter(r => r.valid).length}</p>
            <Progress value={progress} className="mt-4 max-w-md mx-auto" showLabel />
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Success: {successCount}</span>
              <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> Errors: {errorCount}</span>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-green-500">
              <CheckCircle className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-medium">Enrollment Complete!</h3>
            <p className="text-gray-500">Successfully processed {successCount} enrollments with {errorCount} errors.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setValidationResults([]); onOpenChange(false); }}>Done</Button>
              <Button onClick={() => { setStep('upload'); setFile(null); setValidationResults([]); }}>Process Another Batch</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}