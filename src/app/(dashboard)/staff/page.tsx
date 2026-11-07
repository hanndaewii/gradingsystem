import { Metadata } from 'next';
import { StaffDashboard } from '@/components/staff/StaffDashboard';

export const metadata: Metadata = {
  title: 'Staff Dashboard | CWPC BAD Grading System',
  description: 'Staff dashboard for enrollment management and academic operations',
};

export default function StaffDashboardPage() {
  return <StaffDashboard />;
}