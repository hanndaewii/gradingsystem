import { Metadata } from 'next';
import { StaffReportsPage } from '@/components/staff/StaffReportsPage';

export const metadata: Metadata = {
  title: 'Reports | CWPC BAD Grading System',
  description: 'Generate enrollment and academic reports',
};

export default function StaffReportsPage() {
  return <StaffReportsPage />;
}