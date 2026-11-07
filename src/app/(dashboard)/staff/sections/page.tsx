import { Metadata } from 'next';
import { SectionsPage } from '@/components/staff/SectionsPage';

export const metadata: Metadata = {
  title: 'Section Management | CWPC BAD Grading System',
  description: 'Manage class sections, schedules, and professor assignments',
};

export default function SectionsPage() {
  return <SectionsPage />;
}