import { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | CWPC BAD Grading System',
  description: 'System administration, user management, and configuration',
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}