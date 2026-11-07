import { Metadata } from 'next';
import { CoursesPage } from '@/components/staff/CoursesPage';

export const metadata: Metadata = {
  title: 'Course Management | CWPC BAD Grading System',
  description: 'Create, edit, and manage courses and curriculum',
};

export default function CoursesPage() {
  return <CoursesPage />;
}