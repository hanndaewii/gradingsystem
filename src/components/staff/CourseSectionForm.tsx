'use client';

import * as React from 'react';
import { X, Calendar, Clock, MapPin, User, Users, BookOpen, Plus, Minus, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, MoreHorizontal, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';

interface CourseSectionFormProps {
  mode: 'create' | 'edit';
  type: 'course' | 'section';
  courseId?: string;
  initialData?: any;
  onClose: () => void;
  onSubmit: () => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
).concat(Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:30`
)).sort();

const buildings = [
  'Engineering Hall',
  'Science Building',
  'Main Lecture Hall',
  'Math Building',
  'Physics Building',
  'Library',
  'Student Center',
  'Business Building',
];

const rooms = [
  '101', '102', '103', '104', '105',
  '201', '202', '203', '204', '205',
  '301', '302', '303', '304', '305',
  'A', 'B', 'C', 'D',
];

const professors = [
  { id: 'prof-1', name: 'Dr. Sarah Chen', department: 'Computer Science', email: 'sarah.chen@university.edu' },
  { id: 'prof-2', name: 'Dr. Michael Torres', department: 'Computer Science', email: 'michael.torres@university.edu' },
  { id: 'prof-3', name: 'Dr. Lisa Park', department: 'Computer Science', email: 'lisa.park@university.edu' },
  { id: 'prof-4', name: 'Dr. James Wilson', department: 'Computer Science', email: 'james.wilson@university.edu' },
  { id: 'prof-5', name: 'Dr. Emily Rodriguez', department: 'Computer Science', email: 'emily.rodriguez@university.edu' },
  { id: 'prof-6', name: 'Dr. Robert Kim', department: 'Mathematics', email: 'robert.kim@university.edu' },
  { id: 'prof-7', name: 'Dr. Amanda Foster', department: 'Physics', email: 'amanda.foster@university.edu' },
  { id: 'prof-8', name: 'Dr. David Chang', department: 'English', email: 'david.chang@university.edu' },
];

const departments = ['Computer Science', 'Mathematics', 'Physics', 'English', 'Biology', 'Chemistry', 'History', 'Business', 'Psychology', 'Economics'];

const gradingScales = [
  'Standard Letter Grade (A-F)',
  'Pass/Fail',
  'Honors/Pass/Fail',
  'Percentage (0-100)',
  'GPA Scale (4.0)',
];

export function CourseSectionForm({ mode, type, courseId, initialData, onClose, onSubmit }: CourseSectionFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Course form state
  const [courseCode, setCourseCode] = React.useState(initialData?.code || '');
  const [courseName, setCourseName] = React.useState(initialData?.name || '');
  const [courseDepartment, setCourseDepartment] = React.useState(initialData?.department || '');
  const [courseCredits, setCourseCredits] = React.useState(initialData?.credits || 3);
  const [courseDescription, setCourseDescription] = React.useState(initialData?.description || '');
  const [coursePrerequisites, setCoursePrerequisites] = React.useState<string[]>(initialData?.prerequisites || []);
  const [courseCorequisites, setCourseCorequisites] = React.useState<string[]>(initialData?.corequisites || []);
  const [courseLearningOutcomes, setCourseLearningOutcomes] = React.useState<string[]>(initialData?.learningOutcomes || ['']);
  const [courseGradingScale, setCourseGradingScale] = React.useState(initialData?.gradingScale || 'Standard Letter Grade (A-F)');
  const [courseStatus, setCourseStatus] = React.useState(initialData?.status || 'active');
  const [prereqInput, setPrereqInput] = React.useState('');
  const [coreqInput, setCoreqInput] = React.useState('');
  const [outcomeInput, setOutcomeInput] = React.useState('');

  // Section form state
  const [sectionCode, setSectionCode] = React.useState(initialData?.code || '');
  const [sectionCourseId, setSectionCourseId] = React.useState(initialData?.courseId || courseId || '');
  const [sectionTerm, setSectionTerm] = React.useState(initialData?.term || 'Fall 2024');
  const [sectionProfessorId, setSectionProfessorId] = React.useState(initialData?.professorId || '');
  const [sectionSchedule, setSectionSchedule] = React.useState<{ day: string; startTime: string; endTime: string }[]>(initialData?.schedule || [{ day: 'Monday', startTime: '10:00', endTime: '11:15' }]);
  const [sectionBuilding, setSectionBuilding] = React.useState(initialData?.building || '');
  const [sectionRoom, setSectionRoom] = React.useState(initialData?.room || '');
  const [sectionCapacity, setSectionCapacity] = React.useState(initialData?.capacity || 40);
  const [sectionWaitlistLimit, setSectionWaitlistLimit] = React.useState(initialData?.waitlistLimit || 10);
  const [sectionAutoEnrollWaitlist, setSectionAutoEnrollWaitlist] = React.useState(initialData?.autoEnrollWaitlist ?? true);
  const [sectionStatus, setSectionStatus] = React.useState(initialData?.status || 'draft');
  const [sectionNotes, setSectionNotes] = React.useState(initialData?.notes || '');

  const terms = ['Fall 2024', 'Spring 2025', 'Summer 2024', 'Fall 2023', 'Spring 2024'];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    onSubmit();
  };

  const addScheduleRow = () => {
    setSectionSchedule([...sectionSchedule, { day: 'Monday', startTime: '10:00', endTime: '11:15' }]);
  };

  const removeScheduleRow = (index: number) => {
    setSectionSchedule(sectionSchedule.filter((_, i) => i !== index));
  };

  const addPrereq = () => {
    if (prereqInput.trim() && !coursePrerequisites.includes(prereqInput.trim())) {
      setCoursePrerequisites([...coursePrerequisites, prereqInput.trim()]);
      setPrereqInput('');
    }
  };

  const removePrereq = (prereq: string) => {
    setCoursePrerequisites(coursePrerequisites.filter(p => p !== prereq));
  };

  const addCoreq = () => {
    if (coreqInput.trim() && !courseCorequisites.includes(coreqInput.trim())) {
      setCourseCorequisites([...courseCorequisites, coreqInput.trim()]);
      setCoreqInput('');
    }
  };

  const removeCoreq = (coreq: string) => {
    setCourseCorequisites(courseCorequisites.filter(c => c !== coreq));
  };

  const addOutcome = () => {
    if (outcomeInput.trim()) {
      setCourseLearningOutcomes([...courseLearningOutcomes, outcomeInput.trim()]);
      setOutcomeInput('');
    }
  };

  const removeOutcome = (index: number) => {
    setCourseLearningOutcomes(courseLearningOutcomes.filter((_, i) => i !== index));
  };

  const updateOutcome = (index: number, value: string) => {
    setCourseLearningOutcomes(courseLearningOutcomes.map((o, i) => i === index ? value : o));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] bg-semantic-bg-primary rounded-xl border border-semantic-border-primary shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-lg flex-center',
              type === 'course' ? 'bg-semantic-brand-primary/10' : 'bg-semantic-status-info/10'
            )}>
              {type === 'course' ? (
                <BookOpen className="h-5 w-5 text-semantic-brand-primary" />
              ) : (
                <Calendar className="h-5 w-5 text-semantic-status-info" />
              )}
            </div>
            <div>
              <h2 className="text-heading-md font-semibold text-semantic-text-primary">
                {mode === 'create' ? 'Create' : 'Edit'} {type === 'course' ? 'Course' : 'Section'}
              </h2>
              <p className="text-body-sm text-semantic-text-secondary">
                {type === 'course' ? 'Define course details, prerequisites, and learning outcomes' : 'Configure section schedule, capacity, and instructor assignment'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === 'course' && (
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="courseCode">Course Code *</Label>
                      <Input
                        id="courseCode"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                        placeholder="e.g., CS 301"
                        required
                        disabled={mode === 'edit'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="courseCredits">Credits *</Label>
                      <Select
                        value={String(courseCredits)}
                        onValueChange={(v) => setCourseCredits(Number(v))}
                        options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }]}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="courseName">Course Name *</Label>
                    <Input
                      id="courseName"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="e.g., Database Systems"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseDepartment">Department *</Label>
                    <Select
                      value={courseDepartment}
                      onValueChange={setCourseDepartment}
                      options={departments.map(d => ({ value: d, label: d }))}
                      placeholder="Select department"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseDescription">Description</Label>
                    <Textarea
                      id="courseDescription"
                      value={courseDescription}
                      onChange={(e) => setCourseDescription(e.target.value)}
                      placeholder="Course description for catalog..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseGradingScale">Grading Scale</Label>
                    <Select
                      value={courseGradingScale}
                      onValueChange={setCourseGradingScale}
                      options={gradingScales.map(g => ({ value: g, label: g }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseStatus">Status</Label>
                    <Select
                      value={courseStatus}
                      onValueChange={setCourseStatus}
                      options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Prerequisites */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Prerequisites & Corequisites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Prerequisites</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={prereqInput}
                        onChange={(e) => setPrereqInput(e.target.value)}
                        placeholder="Add prerequisite (e.g., CS 201)"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPrereq())}
                      />
                      <Button type="button" variant="outline" onClick={addPrereq} className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coursePrerequisites.map((prereq) => (
                        <Badge key={prereq} variant="default" className="gap-1">
                          {prereq}
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => removePrereq(prereq)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-caption text-semantic-text-tertiary mt-1">Courses that must be completed before taking this course</p>
                  </div>
                  <div>
                    <Label>Corequisites</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={coreqInput}
                        onChange={(e) => setCoreqInput(e.target.value)}
                        placeholder="Add corequisite (e.g., MATH 201)"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCoreq())}
                      />
                      <Button type="button" variant="outline" onClick={addCoreq} className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {courseCorequisites.map((coreq) => (
                        <Badge key={coreq} variant="info" className="gap-1">
                          {coreq}
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => removeCoreq(coreq)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-caption text-semantic-text-tertiary mt-1">Courses that must be taken concurrently</p>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Outcomes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Learning Outcomes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={outcomeInput}
                      onChange={(e) => setOutcomeInput(e.target.value)}
                      placeholder="Add learning outcome"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                    />
                    <Button type="button" variant="outline" onClick={addOutcome} className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {courseLearningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={outcome}
                          onChange={(e) => updateOutcome(index, e.target.value)}
                          placeholder="Learning outcome"
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => removeOutcome(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Footer Actions */}
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-semantic-border-primary">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'create' ? 'Create Course' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          )}

          {type === 'section' && (
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Section Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sectionCode">Section Code *</Label>
                      <Input
                        id="sectionCode"
                        value={sectionCode}
                        onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                        placeholder="e.g., CS 301-A"
                        required
                        disabled={mode === 'edit'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectionTerm">Term *</Label>
                      <Select
                        value={sectionTerm}
                        onValueChange={setSectionTerm}
                        options={terms.map(t => ({ value: t, label: t }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sectionCourseId">Course *</Label>
                    <Select
                      value={sectionCourseId}
                      onValueChange={setSectionCourseId}
                      options={[
                        { value: '1', label: 'CS 301 - Database Systems' },
                        { value: '2', label: 'CS 101 - Introduction to Computer Science' },
                        { value: '3', label: 'CS 201 - Data Structures & Algorithms' },
                        { value: '4', label: 'MATH 101 - Calculus I' },
                      ]}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sectionProfessorId">Instructor</Label>
                    <Select
                      value={sectionProfessorId}
                      onValueChange={setSectionProfessorId}
                      options={[{ value: '', label: 'TBA' }, ...professors.map(p => ({ value: p.id, label: `${p.name} (${p.department})` }))]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sectionStatus">Status</Label>
                    <Select
                      value={sectionStatus}
                      onValueChange={setSectionStatus}
                      options={[{ value: 'draft', label: 'Draft' }, { value: 'open', label: 'Open for Enrollment' }, { value: 'closed', label: 'Closed/Full' }, { value: 'cancelled', label: 'Cancelled' }]}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Schedule Builder */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-heading-md">Schedule</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addScheduleRow} className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add Meeting Time
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sectionSchedule.map((slot, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
                        <div className="flex-1">
                          <Label>Day</Label>
                          <Select
                            value={slot.day}
                            onValueChange={(v) => setSectionSchedule(sectionSchedule.map((s, i) => i === index ? { ...s, day: v } : s))}
                            options={days.map(d => ({ value: d, label: d }))}
                          />
                        </div>
                        <div className="flex-1">
                          <Label>Start Time</Label>
                          <Select
                            value={slot.startTime}
                            onValueChange={(v) => setSectionSchedule(sectionSchedule.map((s, i) => i === index ? { ...s, startTime: v } : s))}
                            options={timeSlots.slice(0, -1).map(t => ({ value: t, label: t }))}
                          />
                        </div>
                        <div className="flex-1">
                          <Label>End Time</Label>
                          <Select
                            value={slot.endTime}
                            onValueChange={(v) => setSectionSchedule(sectionSchedule.map((s, i) => i === index ? { ...s, endTime: v } : s))}
                            options={timeSlots.slice(1).map(t => ({ value: t, label: t }))}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-semantic-status-error" onClick={() => removeScheduleRow(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sectionBuilding">Building</Label>
                      <Select
                        value={sectionBuilding}
                        onValueChange={setSectionBuilding}
                        options={buildings.map(b => ({ value: b, label: b }))}
                        placeholder="Select building"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectionRoom">Room</Label>
                      <Select
                        value={sectionRoom}
                        onValueChange={setSectionRoom}
                        options={rooms.map(r => ({ value: r, label: r }))}
                        placeholder="Select room"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Capacity Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Capacity & Waitlist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sectionCapacity">Section Capacity *</Label>
                      <Input
                        id="sectionCapacity"
                        type="number"
                        value={sectionCapacity}
                        onChange={(e) => setSectionCapacity(Number(e.target.value) || 0)}
                        min={1}
                        max={500}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectionWaitlistLimit">Waitlist Limit</Label>
                      <Input
                        id="sectionWaitlistLimit"
                        type="number"
                        value={sectionWaitlistLimit}
                        onChange={(e) => setSectionWaitlistLimit(Number(e.target.value) || 0)}
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-enroll from waitlist when seats open</Label>
                      <p className="text-caption text-semantic-text-tertiary">Automatically promote students when capacity becomes available</p>
                    </div>
                    <Switch
                      checked={sectionAutoEnrollWaitlist}
                      onCheckedChange={setSectionAutoEnrollWaitlist}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={sectionNotes}
                    onChange={(e) => setSectionNotes(e.target.value)}
                    placeholder="Internal notes about this section..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Footer Actions */}
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-semantic-border-primary">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'create' ? 'Create Section' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}