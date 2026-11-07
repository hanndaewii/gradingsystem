'use client';

import { useState } from 'react';
import { 
  Users, 
  Shield, 
  Database, 
  Activity, 
  Settings, 
  Bell, 
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Key,
  Lock,
  Unlock,
  Mail,
  Phone,
  Globe,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EnrollmentChart } from '@/components/ui/EnrollmentChart';

interface SystemMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: 'up' | 'down' | 'neutral';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'professor' | 'student';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  lastLogin: string;
  mfaEnabled: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

const systemMetrics: SystemMetric[] = [
  { label: 'Total Users', value: 2847, change: 5.2, icon: <Users className="w-6 h-6" />, color: 'blue', trend: 'up' },
  { label: 'Active Sessions', value: 342, change: 12.5, icon: <Activity className="w-6 h-6" />, color: 'green', trend: 'up' },
  { label: 'DB Size', value: '2.4 GB', change: 3.1, icon: <Database className="w-6 h-6" />, color: 'purple', trend: 'up' },
  { label: 'API Requests/hr', value: '12,450', change: -2.3, icon: <Server className="w-6 h-6" />, color: 'orange', trend: 'down' },
  { label: 'Error Rate', value: '0.02%', change: -0.01, icon: <AlertCircle className="w-6 h-6" />, color: 'red', trend: 'down' },
  { label: 'Uptime', value: '99.99%', change: 0, icon: <CheckCircle className="w-6 h-6" />, color: 'green', trend: 'neutral' },
];

const mockUsers: User[] = [
  { id: '1', name: 'Dr. Juan Reyes', email: 'reyes@cwc.edu.ph', role: 'professor', status: 'active', lastLogin: '2024-01-15 09:30', mfaEnabled: true },
  { id: '2', name: 'Maria Santos', email: 'santos@cwc.edu.ph', role: 'staff', status: 'active', lastLogin: '2024-01-15 08:15', mfaEnabled: true },
  { id: '3', name: 'Prof. Ana Garcia', email: 'garcia@cwc.edu.ph', role: 'professor', status: 'active', lastLogin: '2024-01-14 16:45', mfaEnabled: false },
  { id: '4', name: 'Carlos Mendoza', email: 'mendoza@cwc.edu.ph', role: 'student', status: 'active', lastLogin: '2024-01-15 10:00', mfaEnabled: false },
  { id: '5', name: 'Dr. Robert Chen', email: 'chen@cwc.edu.ph', role: 'professor', status: 'pending', lastLogin: 'Never', mfaEnabled: false },
  { id: '6', name: 'Admin User', email: 'admin@cwc.edu.ph', role: 'admin', status: 'active', lastLogin: '2024-01-15 07:00', mfaEnabled: true },
];

const mockAuditLogs: AuditLog[] = [
  { id: '1', timestamp: '2024-01-15 09:30:12', actor: 'admin@cwc.edu.ph', action: 'CREATE', entity: 'User', entityId: '5', details: 'Created professor account for Dr. Robert Chen' },
  { id: '2', timestamp: '2024-01-15 09:15:45', actor: 'santos@cwc.edu.ph', action: 'UPDATE', entity: 'Enrollment', entityId: '123', details: 'Enrolled student 2021-00123 in BUSAD 301-A' },
  { id: '3', timestamp: '2024-01-15 08:45:22', actor: 'system', action: 'CRON', entity: 'Waitlist', entityId: '', details: 'Processed waitlist promotions for Fall 2024' },
  { id: '4', timestamp: '2024-01-14 16:30:10', actor: 'garcia@cwc.edu.ph', action: 'SUBMIT', entity: 'Grades', entityId: 'BUSAD-101-A', details: 'Submitted final grades for BUSAD 101 Section A' },
  { id: '5', timestamp: '2024-01-14 14:22:05', actor: 'admin@cwc.edu.ph', action: 'CONFIG', entity: 'Term', entityId: '2024-2', details: 'Updated grading scale for Spring 2025' },
];

const resourceUsage = [
  { label: 'CPU', used: 45, total: 100, unit: '%' },
  { label: 'Memory', used: 3.2, total: 8, unit: 'GB' },
  { label: 'Disk', used: 2.4, total: 50, unit: 'GB' },
  { label: 'Bandwidth', used: 120, total: 1000, unit: 'Mbps' },
];

const apiTrendData = [
  { label: '00:00', requests: 2100, errors: 2 },
  { label: '04:00', requests: 1800, errors: 1 },
  { label: '08:00', requests: 5200, errors: 8 },
  { label: '12:00', requests: 8900, errors: 12 },
  { label: '16:00', requests: 12450, errors: 15 },
  { label: '20:00', requests: 9800, errors: 9 },
];

const userColumns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { 
    accessorKey: 'role', 
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={
        row.original.role === 'admin' ? 'danger' : 
        row.original.role === 'staff' ? 'warning' : 
        row.original.role === 'professor' ? 'info' : 'secondary'
      }>
        {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
      </Badge>
    )
  },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'active' ? 'success' : 
        row.original.status === 'pending' ? 'warning' : 
        row.original.status === 'suspended' ? 'danger' : 'secondary'
      }>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    )
  },
  { accessorKey: 'lastLogin', header: 'Last Login' },
  { 
    accessorKey: 'mfaEnabled', 
    header: 'MFA',
    cell: ({ row }) => (
      <Badge variant={row.original.mfaEnabled ? 'success' : 'danger'}>
        {row.original.mfaEnabled ? 'Enabled' : 'Disabled'}
      </Badge>
    )
  },
];

const auditColumns: ColumnDef<AuditLog>[] = [
  { accessorKey: 'timestamp', header: 'Timestamp' },
  { accessorKey: 'actor', header: 'Actor' },
  { 
    accessorKey: 'action', 
    header: 'Action',
    cell: ({ row }) => (
      <Badge variant={
        row.original.action === 'CREATE' ? 'success' : 
        row.original.action === 'UPDATE' ? 'info' : 
        row.original.action === 'DELETE' ? 'danger' : 
        row.original.action === 'SUBMIT' ? 'warning' : 'secondary'
      }>
        {row.original.action}
      </Badge>
    )
  },
  { accessorKey: 'entity', header: 'Entity' },
  { accessorKey: 'entityId', header: 'Entity ID' },
  { accessorKey: 'details', header: 'Details', cell: ({ row }) => <div className="max-w-xs truncate">{row.original.details}</div> },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'system' | 'settings'>('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">System administration, user management, and monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export Logs</Button>
            <Button variant="outline" size="sm" onClick={() => setShowInviteModal(true)}><UserPlus className="w-4 h-4 mr-2" />Invite User</Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="equal-edges">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {systemMetrics.map((metric) => (
                <StatCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  change={metric.change}
                  icon={metric.icon}
                  color={metric.color}
                  trend={metric.trend}
                />
              ))}
            </div>
          </div>

          <div className="equal-edges grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Requests (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrollmentChart
                  data={apiTrendData}
                  xKey="label"
                  yKeys={['requests', 'errors']}
                  labels={['Requests', 'Errors']}
                  colors={['var(--color-primary)', 'var(--color-danger)']}
                  height={300}
                  type="line"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resourceUsage.map((resource) => (
                  <div key={resource.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{resource.label}</span>
                      <span className="text-gray-500">{resource.used}{resource.unit} / {resource.total}{resource.unit}</span>
                    </div>
                    <Progress value={(resource.used / resource.total) * 100} showLabel />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Audit Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={auditColumns}
                  data={mockAuditLogs}
                  pagination
                  pageSize={5}
                  searchable
                  filterable
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="equal-edges flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 min-w-[250px]">
              <Input placeholder="Search users..." icon={<Search className="w-4 h-4" />} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="equal-edges">
            <CardContent className="p-0">
              <DataTable
                columns={userColumns}
                data={mockUsers}
                searchable
                filterable
                sortable
                pagination
                pageSize={10}
                rowActions={[
                  { label: 'View', onClick: (row) => setSelectedUser(row.original), icon: <Eye className="w-4 h-4" /> },
                  { label: 'Edit', onClick: (row) => setSelectedUser(row.original), icon: <Edit className="w-4 h-4" /> },
                  { label: row.original.status === 'active' ? 'Suspend' : 'Activate', onClick: (row) => console.log('Toggle status', row.original.id), icon: row.original.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />, variant: row.original.status === 'active' ? 'warning' : 'success' },
                  { label: 'Reset Password', onClick: (row) => console.log('Reset password', row.original.id), icon: <Key className="w-4 h-4" /> },
                  { label: 'Delete', onClick: (row) => console.log('Delete', row.original.id), icon: <Trash2 className="w-4 h-4" />, variant: 'danger' },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="equal-edges flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 min-w-[250px]">
              <Input placeholder="Search audit logs..." icon={<Search className="w-4 h-4" />} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="SUBMIT">Submit</SelectItem>
                <SelectItem value="CONFIG">Config</SelectItem>
                <SelectItem value="CRON">Cron</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Enrollment">Enrollment</SelectItem>
                <SelectItem value="Grades">Grades</SelectItem>
                <SelectItem value="Term">Term</SelectItem>
                <SelectItem value="Course">Course</SelectItem>
                <SelectItem value="Waitlist">Waitlist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="equal-edges">
            <CardContent className="p-0">
              <DataTable
                columns={auditColumns}
                data={mockAuditLogs}
                searchable
                filterable
                sortable
                pagination
                pageSize={15}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="equal-edges grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium">Database</span></div>
                    <p className="text-sm text-gray-500 mt-1">Connected - 12ms latency</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium">Auth Service</span></div>
                    <p className="text-sm text-gray-500 mt-1">Operational</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium">Storage</span></div>
                    <p className="text-sm text-gray-500 mt-1">2.4 GB / 50 GB used</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium">Realtime</span></div>
                    <p className="text-sm text-gray-500 mt-1">342 active connections</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-yellow-500" /><span className="font-medium">Edge Functions</span></div>
                    <p className="text-sm text-gray-500 mt-1">2 functions with warnings</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium">Backups</span></div>
                    <p className="text-sm text-gray-500 mt-1">Last: 2024-01-15 02:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edge Functions Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'grade-calculator', status: 'healthy', invocations: 12450, avgDuration: '45ms', errors: 0 },
                  { name: 'enrollment-sync', status: 'healthy', invocations: 4, avgDuration: '2.3s', errors: 0 },
                  { name: 'waitlist-processor', status: 'healthy', invocations: 1, avgDuration: '1.8s', errors: 0 },
                  { name: 'grade-release-notifier', status: 'healthy', invocations: 89, avgDuration: '120ms', errors: 0 },
                  { name: 'report-generator', status: 'warning', invocations: 23, avgDuration: '15.2s', errors: 2 },
                  { name: 'backup-trigger', status: 'healthy', invocations: 1, avgDuration: '45s', errors: 0 },
                ].map((fn) => (
                  <div key={fn.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${fn.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <div>
                        <p className="font-mono text-sm font-medium">{fn.name}</p>
                        <p className="text-xs text-gray-500">{fn.invocations} invocations • {fn.avgDuration} avg • {fn.errors} errors</p>
                      </div>
                    </div>
                    <Badge variant={fn.status === 'healthy' ? 'success' : 'warning'}>{fn.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>API Performance (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrollmentChart
                  data={apiTrendData}
                  xKey="label"
                  yKeys={['requests', 'errors']}
                  labels={['Requests', 'Errors']}
                  colors={['var(--color-primary)', 'var(--color-danger)']}
                  height={300}
                  type="line"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="equal-edges grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Institution Name</label>
                  <Input defaultValue="Cavite West Point College" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <Input defaultValue="Business Administration" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Default Grading Scale</label>
                  <Select defaultValue="philippine">
                    <SelectTrigger><SelectValue placeholder="Select scale" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="philippine">Philippine 1.0-5.0</SelectItem>
                      <SelectItem value="letter">Letter Grade A-F</SelectItem>
                      <SelectItem value="percentage">Percentage 0-100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <Select defaultValue="asia/manila">
                    <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia/manila">Asia/Manila (UTC+8)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-gray-500">Restrict access to admins only</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email & Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Host</label>
                  <Input placeholder="smtp.example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="SMTP Port" placeholder="587" type="number" />
                  <Select defaultValue="tls">
                    <SelectTrigger><SelectValue placeholder="Security" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">From Email</label>
                  <Input placeholder="noreply@cwc.edu.ph" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">From Name</label>
                  <Input placeholder="CWPC Grading System" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Enable system-wide email notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-primary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
                <Button>Save Email Settings</Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'grading_v2', label: 'New Grading Interface', description: 'Enable the redesigned gradebook with rubric support', enabled: true },
                  { name: 'realtime_collab', label: 'Real-time Collaboration', description: 'Allow multiple professors to grade simultaneously', enabled: false },
                  { name: 'new_report_builder', label: 'Advanced Report Builder', description: 'New drag-and-drop report designer', enabled: true },
                  { name: 'student_portal', label: 'Student Portal (Beta)', description: 'Allow students to view their grades and transcripts', enabled: false },
                  { name: 'mobile_app', label: 'Mobile App API', description: 'Enable API endpoints for mobile application', enabled: false },
                  { name: 'ai_grading_assist', label: 'AI Grading Assistant', description: 'Experimental AI-powered grade suggestions', enabled: false },
                ].map((flag) => (
                  <div key={flag.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="font-medium">{flag.label}</p>
                      <p className="text-sm text-gray-500">{flag.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={flag.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Detail Modal */}
      <Modal open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} title={selectedUser ? `User: ${selectedUser.name}` : 'User Details'} size="lg">
        {selectedUser && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Name</label><p className="font-medium">{selectedUser.name}</p></div>
              <div><label className="text-sm text-gray-500">Email</label><p>{selectedUser.email}</p></div>
              <div><label className="text-sm text-gray-500">Role</label><p><Badge variant={selectedUser.role === 'admin' ? 'danger' : selectedUser.role === 'staff' ? 'warning' : selectedUser.role === 'professor' ? 'info' : 'secondary'}>{selectedUser.role}</Badge></p></div>
              <div><label className="text-sm text-gray-500">Status</label><p><Badge variant={selectedUser.status === 'active' ? 'success' : selectedUser.status === 'pending' ? 'warning' : selectedUser.status === 'suspended' ? 'danger' : 'secondary'}>{selectedUser.status}</Badge></p></div>
              <div><label className="text-sm text-gray-500">Last Login</label><p>{selectedUser.lastLogin}</p></div>
              <div><label className="text-sm text-gray-500">MFA</label><p><Badge variant={selectedUser.mfaEnabled ? 'success' : 'danger'}>{selectedUser.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge></p></div>
            </div>
            <div className="pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
              <Button onClick={() => setSelectedUser(null)}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invite User Modal */}
      <Modal open={showInviteModal} onOpenChange={setShowInviteModal} title="Invite New User" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="e.g., Dr. Juan Reyes" required />
            <Input label="Email" type="email" placeholder="e.g., reyes@cwc.edu.ph" required />
          </div>
          <Select defaultValue="professor" required>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professor">Professor</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <label className="block text-sm font-medium mb-2">Departments (for professors/staff)</label>
            <div className="flex flex-wrap gap-2">
              {['Business Administration', 'Economics', 'Management', 'Marketing', 'Finance', 'Accounting'].map((dept) => (
                <label key={dept} className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary/20" />
                  <span className="text-sm">{dept}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium">Send invitation email</p>
              <p className="text-sm text-gray-500">User will receive a magic link to set up their account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-primary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit">Send Invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}