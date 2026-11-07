'use client';

import * as React from 'react';
import { X, Mail, Send, Users, User, Calendar, Clock, Filter, Download, Plus, Save, Loader2, CheckCircle, AlertTriangle, Eye, Edit, Trash2, MoreHorizontal, Paperclip, Smile, Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered, Quote, Link as LinkIcon, Image, Table, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

interface CommunicationCenterProps {
  onClose: () => void;
  onSend: () => void;
}

const recipientTypes = [
  { value: 'students', label: 'Students', icon: Users, count: 15420 },
  { value: 'professors', label: 'Professors', icon: User, count: 387 },
  { value: 'sections', label: 'Course Sections', icon: Calendar, count: 342 },
  { value: 'custom', label: 'Custom List', icon: User, count: 0 },
];

const studentFilters = [
  { key: 'term', label: 'Term', type: 'select', options: ['All Terms', 'Fall 2024', 'Spring 2025', 'Summer 2024'] },
  { key: 'major', label: 'Major', type: 'select', options: ['All Majors', 'Computer Science', 'Mathematics', 'Physics', 'English', 'Biology'] },
  { key: 'year', label: 'Year', type: 'select', options: ['All Years', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] },
  { key: 'enrollmentStatus', label: 'Enrollment Status', type: 'select', options: ['All', 'Active', 'Waitlisted', 'Dropped', 'Not Registered'] },
  { key: 'gpaRange', label: 'GPA Range', type: 'range', min: 0, max: 4 },
  { key: 'creditsRange', label: 'Credits Completed', type: 'range', min: 0, max: 150 },
];

const professorFilters = [
  { key: 'department', label: 'Department', type: 'select', options: ['All Departments', 'Computer Science', 'Mathematics', 'Physics', 'English'] },
  { key: 'hasPendingGrades', label: 'Has Pending Grades', type: 'boolean' },
  { key: 'sectionCount', label: 'Sections Teaching', type: 'range', min: 0, max: 10 },
];

const templates = [
  { id: 'registration-reminder', name: 'Registration Reminder', subject: 'Reminder: Register for {term} Classes', type: 'email' },
  { id: 'grade-deadline', name: 'Grade Submission Deadline', subject: 'Action Required: Grade Submission Due {date}', type: 'email' },
  { id: 'waitlist-promotion', name: 'Waitlist Promotion', subject: 'You\'ve been promoted from the waitlist for {course}', type: 'email' },
  { id: 'schedule-change', name: 'Schedule Change Notification', subject: 'Schedule Update: {course} - {details}', type: 'sms' },
  { id: 'catalog-available', name: 'Course Catalog Available', subject: 'New Course Catalog for {term} Now Available', type: 'email' },
  { id: 'override-request', name: 'Prerequisite Override Request', subject: 'Override Request: {student} for {course}', type: 'email' },
];

export function CommunicationCenter({ onClose, onSend }: CommunicationCenterProps) {
  const [activeTab, setActiveTab] = React.useState<'compose' | 'templates' | 'scheduled' | 'sent'>('compose');
  const [messageType, setMessageType] = React.useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = React.useState<'students' | 'professors' | 'sections' | 'custom'>('students');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sendAt, setSendAt] = React.useState<string>('');
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [estimatedCount, setEstimatedCount] = React.useState(15420);

  // Update estimated count based on recipient type
  React.useEffect(() => {
    const type = recipientTypes.find(t => t.value === recipientType);
    setEstimatedCount(type?.count || 0);
  }, [recipientType]);

  const handleSend = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    onSend();
  };

  const handleSchedule = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSending(false);
    onSend();
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject);
      setMessageType(template.type as 'email' | 'sms');
      // Set default message based on template
      setMessage(getDefaultMessage(templateId));
    }
  };

  const getDefaultMessage = (templateId: string): string => {
    const messages: Record<string, string> = {
      'registration-reminder': `
        <p>Dear Student,</p>
        <p>This is a reminder that registration for <strong>{term}</strong> is now open and will close on <strong>{registrationCloseDate}</strong>.</p>
        <p>Please log in to the student portal to register for your classes. Popular sections fill up quickly, so we encourage you to register as soon as possible.</p>
        <p>If you need assistance with registration, please contact your academic advisor or the registrar's office.</p>
        <p>Best regards,<br>The Registrar's Office</p>
      `,
      'grade-deadline': `
        <p>Dear Professor,</p>
        <p>This is a reminder that final grade submission for <strong>{term}</strong> is due by <strong>{deadlineDate}</strong>.</p>
        <p>Please ensure all grades are submitted and approved before the deadline. Late submissions may delay transcript processing for students.</p>
        <p>If you have any questions, please contact the registrar's office.</p>
        <p>Best regards,<br>The Registrar's Office</p>
      `,
      'waitlist-promotion': `
        <p>Dear Student,</p>
        <p>Great news! You have been promoted from the waitlist for <strong>{course}</strong> (Section: {section}).</p>
        <p>You are now officially enrolled in this course. Please check your schedule for the meeting times and location.</p>
        <p>If you no longer wish to take this course, please drop it through the student portal immediately so the seat can be offered to the next student on the waitlist.</p>
        <p>Best regards,<br>The Registrar's Office</p>
      `,
      'schedule-change': `Schedule change for {course}: {details}. Please check your updated schedule.`,
      'catalog-available': `
        <p>Dear Student,</p>
        <p>The course catalog for <strong>{term}</strong> is now available for viewing.</p>
        <p>You can browse available courses, check prerequisites, and plan your schedule. Registration opens on <strong>{registrationOpenDate}</strong>.</p>
        <p>Best regards,<br>The Registrar's Office</p>
      `,
      'override-request': `
        <p>Dear Professor,</p>
        <p>Student <strong>{student}</strong> has requested a prerequisite override for <strong>{course}</strong>.</p>
        <p><strong>Reason:</strong> {reason}</p>
        <p>Please review this request and approve or deny through the faculty portal.</p>
        <p>Best regards,<br>The Registrar's Office</p>
      `,
    };
    return messages[templateId] || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl max-h-[90vh] bg-semantic-bg-primary rounded-xl border border-semantic-border-primary shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
              <Mail className="h-5 w-5 text-semantic-brand-primary" />
            </div>
            <div>
              <h2 className="text-heading-md font-semibold text-semantic-text-primary">Compose Communication</h2>
              <p className="text-body-sm text-semantic-text-secondary">Create and send emails or SMS to students and faculty</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-auto m-4">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="m-4 flex-1 overflow-y-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Panel - Recipients & Settings */}
              <div className="lg:col-span-1 space-y-6">
                {/* Message Type */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Message Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={messageType === 'email' ? 'primary' : 'outline'}
                        className="gap-2"
                        onClick={() => setMessageType('email')}
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        variant={messageType === 'sms' ? 'primary' : 'outline'}
                        className="gap-2"
                        onClick={() => setMessageType('sms')}
                      >
                        <Send className="h-4 w-4" />
                        SMS
                      </Button>
                    </div>
                    {messageType === 'sms' && (
                      <p className="text-caption text-semantic-text-tertiary mt-2">SMS messages are limited to 160 characters</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recipients */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Recipients</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Recipient Type</Label>
                      <Select
                        value={recipientType}
                        onValueChange={setRecipientType}
                        options={recipientTypes.map(t => ({ value: t.value, label: t.label }))}
                      />
                    </div>

                    <div className="p-3 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-semantic-text-primary">Estimated Recipients</span>
                        <span className="text-heading-md font-bold text-semantic-brand-primary">{estimatedCount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Filters based on recipient type */}
                    {(recipientType === 'students' || recipientType === 'professors') && (
                      <div className="space-y-3">
                        <Label>Filters</Label>
                        <div className="space-y-2">
                          {(recipientType === 'students' ? studentFilters : professorFilters).map((filter) => (
                            <div key={filter.key} className="p-3 bg-semantic-bg-secondary rounded-lg">
                              <label className="text-caption text-semantic-text-tertiary">{filter.label}</label>
                              {filter.type === 'select' && (
                                <Select
                                  value={filters[filter.key] || filter.options[0]}
                                  onValueChange={(v) => setFilters({ ...filters, [filter.key]: v })}
                                  options={filter.options.map(o => ({ value: o, label: o }))}
                                  className="mt-1 w-full"
                                />
                              )}
                              {filter.type === 'boolean' && (
                                <label className="flex items-center gap-2 mt-1">
                                  <Switch
                                    checked={filters[filter.key] || false}
                                    onCheckedChange={(v) => setFilters({ ...filters, [filter.key]: v })}
                                  />
                                  <span className="text-body-sm text-semantic-text-primary">Yes</span>
                                </label>
                              )}
                              {filter.type === 'range' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input type="number" min={filter.min} max={filter.max} placeholder="Min" className="w-24" />
                                  <span className="text-semantic-text-tertiary">to</span>
                                  <Input type="number" min={filter.min} max={filter.max} placeholder="Max" className="w-24" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {recipientType === 'sections' && (
                      <div className="space-y-3">
                        <Label>Select Sections</Label>
                        <Select
                          placeholder="Choose sections..."
                          options={[
                            { value: 'cs301-a', label: 'CS 301-A (38 enrolled)' },
                            { value: 'cs101-a', label: 'CS 101-A (142 enrolled)' },
                            { value: 'cs201-b', label: 'CS 201-B (45 enrolled)' },
                          ]}
                        />
                      </div>
                    )}

                    {recipientType === 'custom' && (
                      <div className="space-y-3">
                        <Label>Upload Custom List</Label>
                        <Input type="file" accept=".csv,.xlsx" />
                        <p className="text-caption text-semantic-text-tertiary">CSV with email/phone column required</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scheduling */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Scheduling</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center gap-2">
                      <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                      <span className="text-body-sm text-semantic-text-primary">Schedule for later</span>
                    </label>
                    {isScheduled && (
                      <div>
                        <Label htmlFor="sendAt">Send At</Label>
                        <Input
                          id="sendAt"
                          type="datetime-local"
                          value={sendAt}
                          onChange={(e) => setSendAt(e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Message Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Template Selector */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-heading-md">Message Template</CardTitle>
                    <Select
                      value={selectedTemplate || ''}
                      onValueChange={handleTemplateSelect}
                      options={[{ value: '', label: 'Select Template' }, ...templates.map(t => ({ value: t.id, label: t.name }))]}
                      placeholder="Choose a template..."
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate === template.id ? 'primary' : 'outline'}
                          size="sm"
                          className="gap-1"
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          {template.type === 'email' ? <Mail className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Subject */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Subject Line</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject line..."
                    />
                    <p className="text-caption text-semantic-text-tertiary mt-1">Use merge fields like {studentName}, {course}, {term}, {deadlineDate}</p>
                  </CardContent>
                </Card>

                {/* Message Body */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Message Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-1 p-2 border-b border-semantic-border-primary mb-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Bold"><Bold className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Italic"><Italic className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Underline"><Underline className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
                      <div className="w-px h-6 bg-semantic-border-primary mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Code"><Code className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Bullet List"><List className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Quote"><Quote className="h-4 w-4" /></Button>
                      <div className="w-px h-6 bg-semantic-border-primary mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Link"><LinkIcon className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Image"><Image className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Table"><Table className="h-4 w-4" /></Button>
                      <div className="w-px h-6 bg-semantic-border-primary mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Align Right"><AlignRight className="h-4 w-4" /></Button>
                      <div className="w-px h-6 bg-semantic-border-primary mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Undo"><Undo className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Redo"><Redo className="h-4 w-4" /></Button>
                    </div>
                    {/* Message Area */}
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={messageType === 'email' ? 'Write your email message here...' : 'Write your SMS message (max 160 chars)...'}
                      rows={15}
                      className={messageType === 'sms' ? 'font-mono' : ''}
                    />
                    {messageType === 'sms' && (
                      <p className="text-caption text-semantic-text-tertiary mt-1 text-right">
                        {message.length}/160 characters
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Merge Fields Helper */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-heading-md">Available Merge Fields</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {['{studentName}', '{studentNumber}', '{course}', '{section}', '{term}', '{professor}', '{schedule}', '{location}', '{deadlineDate}', '{registrationCloseDate}', '{registrationOpenDate}', '{reason}'].map(field => (
                        <Button key={field} variant="ghost" size="sm" className="gap-1 font-mono text-xs" onClick={() => setMessage(message + field)}>
                          {field}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer Actions */}
            <CardFooter className="m-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-semantic-border-primary">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={isScheduled ? handleSchedule : handleSend} disabled={isSending || !subject.trim() || !message.trim() || estimatedCount === 0} className="gap-2 flex-1 sm:w-auto">
                {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isScheduled ? 'Schedule' : 'Send Now'}
              </Button>
            </CardFooter>
          </TabsContent>

          <TabsContent value="templates" className="m-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Message Templates</CardTitle>
                  <CardDescription>Reusable templates for common communications</CardDescription>
                </div>
                <Button variant="primary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                            {template.type === 'email' ? <Mail className="h-5 w-5 text-semantic-brand-primary" /> : <Send className="h-5 w-5 text-semantic-status-success" />}
                          </div>
                          <Badge variant="default">{template.type.toUpperCase()}</Badge>
                        </div>
                        <h4 className="font-semibold text-semantic-text-primary mb-1">{template.name}</h4>
                        <p className="text-body-sm text-semantic-text-secondary mb-4">{template.subject}</p>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" className="flex-1 gap-1" onClick={() => { setActiveTab('compose'); handleTemplateSelect(template.id); }}>
                            <Mail className="h-3 w-3" />
                            Use
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {}} className="gap-2">
                                <Edit className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="gap-2">
                                <Copy className="h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="m-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Scheduled Communications</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('subject', { header: 'Subject', cell: info => info.getValue() as string, size: 300 }),
                    columnHelper.accessor('type', { header: 'Type', cell: info => <Badge variant="default">{info.getValue()}</Badge>, size: 80 }),
                    columnHelper.accessor('recipients', { header: 'Recipients', cell: info => `${info.getValue().count} ${info.getValue().type}`, size: 150 }),
                    columnHelper.accessor('scheduledAt', { header: 'Scheduled For', cell: info => formatRelativeTime(info.getValue() as string), size: 180 }),
                    columnHelper.accessor('status', { header: 'Status', cell: info => <Badge variant="warning">{info.getValue()}</Badge>, size: 120 }),
                    columnHelper.display({
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Send className="h-4 w-4" />
                              Send Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                              <Trash2 className="h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={[
                    { id: '1', subject: 'Grade Submission Deadline - January 20', type: 'email', recipients: { count: 387, type: 'professors' }, scheduledAt: '2024-01-16T09:00:00Z', status: 'scheduled' },
                    { id: '2', subject: 'Spring 2025 Course Catalog Available', type: 'email', recipients: { count: 15420, type: 'students' }, scheduledAt: '2024-11-15T10:00:00Z', status: 'scheduled' },
                  ]}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  showExport={true}
                  onExport={() => {}}
                  className="rounded-none"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="m-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Sent Communications</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('subject', { header: 'Subject', cell: info => info.getValue() as string, size: 300 }),
                    columnHelper.accessor('type', { header: 'Type', cell: info => <Badge variant="default">{info.getValue()}</Badge>, size: 80 }),
                    columnHelper.accessor('recipients', { header: 'Recipients', cell: info => `${info.getValue().count} ${info.getValue().type}`, size: 150 }),
                    columnHelper.accessor('sentAt', { header: 'Sent', cell: info => formatRelativeTime(info.getValue() as string), size: 180 }),
                    columnHelper.accessor('delivered', { header: 'Delivered', cell: info => info.getValue(), size: 100 }),
                    columnHelper.accessor('opened', { header: 'Opened', cell: info => `${info.getValue()} (${Math.round((info.getValue() / info.row.original.delivered) * 100)}%)`, size: 120 }),
                    columnHelper.accessor('clicked', { header: 'Clicked', cell: info => `${info.getValue()} (${Math.round((info.getValue() / info.row.original.delivered) * 100)}%)`, size: 120 }),
                    columnHelper.display({
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <BarChart2 className="h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Download className="h-4 w-4" />
                              Export Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={[
                    { id: '1', subject: 'Fall 2024 Registration Reminder', type: 'email', recipients: { count: 12450, type: 'students' }, sentAt: '2024-01-14T15:00:00Z', delivered: 12380, opened: 8945, clicked: 2134 },
                    { id: '2', subject: 'Waitlist Promotion Notification', type: 'email', recipients: { count: 23, type: 'students' }, sentAt: '2024-01-15T08:45:00Z', delivered: 23, opened: 19, clicked: 12 },
                    { id: '3', subject: 'CS 301-A Schedule Change', type: 'sms', recipients: { count: 38, type: 'students' }, sentAt: '2024-01-13T14:20:00Z', delivered: 38, opened: 35, clicked: 8 },
                  ]}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  showExport={true}
                  onExport={() => {}}
                  className="rounded-none"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Copy } from 'lucide-react';
import { BarChart2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';