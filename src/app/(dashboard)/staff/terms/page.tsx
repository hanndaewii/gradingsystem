import { Metadata } from 'next';
import { TermsPage } from '@/components/staff/TermsPage';

export const metadata: Metadata = {
  title: 'Academic Terms | CWPC BAD Grading System',
  description: 'Manage academic terms, registration periods, and grading scales',
};

export default function TermsPage() {
  return <TermsPage />;
}