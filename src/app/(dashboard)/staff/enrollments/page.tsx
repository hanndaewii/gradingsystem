import { Metadata } from 'next';
import { EnrollmentsPage } from '@/components/staff/EnrollmentsPage';

export const metadata: Metadata = {
  title: 'Enrollment Management | CWPC BAD Grading System',
  description: 'Manage student enrollments, waitlists, and bulk operations',
};

export default function EnrollmentsPage() {
  return <EnrollmentsPage />;
}