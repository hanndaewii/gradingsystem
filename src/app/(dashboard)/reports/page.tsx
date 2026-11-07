import { Metadata } from 'next';
import { ReportsPage } from '@/components/reports/ReportsPage';

export const metadata: Metadata = {
  title: 'Reports & Transcripts | CWPC BAD Grading System',
  description: 'Generate and download academic reports and transcripts',
};

export default function ReportsPage() {
  return <ReportsPage />;
}