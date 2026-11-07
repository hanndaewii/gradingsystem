# Electronic Grading System for Business Administration Faculty

## Hero Section
**H1:** Electronic Grading System for Business Administration Faculty  
**Subheadline:** Streamline grading workflows, manage enrollments, and generate official transcripts with the official CWPC BAD platform.  
**Hard Fact:** Serving 40+ faculty, 1,200+ students across 150+ sections annually.

## Navigation
- **Sign In** → "Sign In"
- **Register** → "Register as Professor"
- **Admin** → "Admin Dashboard"

## Authentication Pages

### Sign In
**Title:** Welcome Back  
**Description:** Sign in to access your grading dashboard  
**Email Label:** College Email  
**Email Placeholder:** professor@cwc.edu.ph  
**Password Label:** Password  
**Password Placeholder:** Enter your password  
**Remember Me:** Remember me  
**Forgot Password:** Forgot password?  
**Submit Button:** Sign In  
**No Account:** Don't have an account?  
**Register Link:** Register as Professor

### Register (Professor)
**Title:** Professor Registration  
**Description:** Create your faculty account using your CWPC credentials  
**Full Name Label:** Full Name  
**Full Name Placeholder:** Dr. Juan Reyes  
**Employee Number Label:** Employee Number  
**Employee Number Placeholder:** EMP-2024-001  
**College Email Label:** College Email (@cwc.edu.ph)  
**College Email Placeholder:** reyes@cwc.edu.ph  
**Password Label:** Password  
**Password Placeholder:** Create a strong password  
**Confirm Password Label:** Confirm Password  
**Password Requirements:**  
- At least 8 characters  
- One uppercase letter  
- One lowercase letter  
- One number  
- One special character  
**Terms Checkbox:** I agree to the Terms of Service and Privacy Policy  
**Submit Button:** Create Account  
**Success Message:** Registration submitted! Your account is pending admin approval. You'll receive an email once approved.

### Pending Approval
**Title:** Account Pending Approval  
**Description:** Your registration has been submitted and is awaiting review by the Department Head.  
**Status:** Pending Review  
**Estimated Time:** Typically reviewed within 24-48 hours  
**Resend Email:** Didn't receive the confirmation email?  
**Resend Button:** Resend Confirmation Email  
**Contact Support:** Need help? Contact the BAD Department Office.

### MFA Setup
**Title:** Set Up Two-Factor Authentication  
**Description:** Add an extra layer of security to your account  
**Step 1:** Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password)  
**Step 2:** Enter the 6-digit code from your app  
**Manual Entry:** Can't scan? Enter this key manually:  
**Verify Button:** Verify & Enable  
**Backup Codes:** Save these backup codes in a safe place  
**Complete Button:** Done

## Professor Dashboard

### Dashboard
**Title:** Professor Dashboard  
**Welcome:** Welcome back, Dr. Reyes  
**Stats Cards:**  
- My Sections: 4  
- Total Students: 156  
- Pending Grades: 23  
- Upcoming Deadlines: 5  

**Quick Actions:**  
- Enter Grades → "Enter Grades"  
- Manage Assessments → "Assessments"  
- View Reports → "Reports"  

**Recent Activity:**  
- Submitted grades for BUSAD 301-A (2 hours ago)  
- Created Midterm Exam for ECON 201-B (1 day ago)  
- 5 students waitlisted for MKTG 301-A (2 days ago)

### Class Card
**Course Code:** BUSAD 301  
**Course Title:** Strategic Management  
**Section:** A  
**Term:** Fall 2024  
**Students:** 38/40  
**Average Grade:** 2.15  
**CTA:** Enter Grades

### Gradebook
**Title:** Gradebook - BUSAD 301 Section A  
**Tabs:** Midterm Exam, Final Project, Quizzes, Participation  
**Columns:** Student Name, Student ID, Midterm (30%), Final Project (40%), Quiz 1 (10%), Quiz 2 (10%), Participation (10%), Final Grade, Status  
**Bulk Actions:** Fill Down, Fill Right, Import CSV, Export CSV, Submit All  
**Cell States:** Draft (yellow), Submitted (blue), Finalized (green)  
**Keyboard Shortcuts:** Tab/Enter/Arrows to navigate, Cmd+S to save, Cmd+Enter to submit

### Rubric Sidebar
**Title:** Rubric Grading - Final Project  
**Criteria:**  
1. Content Knowledge (25%) - Levels: Exemplary, Proficient, Developing, Beginning  
2. Critical Analysis (25%) - Levels: Exemplary, Proficient, Developing, Beginning  
3. Presentation (20%) - Levels: Exemplary, Proficient, Developing, Beginning  
4. References (15%) - Levels: Exemplary, Proficient, Developing, Beginning  
5. Timeliness (15%) - Levels: On Time, Late (1 day), Late (2+ days)  
**Auto-calculated Total:** 92/100  
**Comments:** Per-criterion comment fields  
**Actions:** Save as Draft, Submit for Review

### Assessment Wizard
**Step 1 - Basic Info:** Name, Type, Weight, Max Score, Due Date  
**Step 2 - Rubric Builder:** Add Criteria, Define Levels, Set Points  
**Step 3 - Settings:** Visibility, Late Penalty, Attempts  
**Step 4 - Review:** Summary, Confirm  
**Validation:** Weights must sum to 100%

## Staff Dashboard

### Dashboard
**Title:** Staff Dashboard  
**Stats:**  
- Total Enrollments: 12,847  
- Active Students: 8,234  
- Waitlisted: 342  
- Pending Actions: 87  
- Sections at Capacity: 23/156  

**Quick Actions:** Bulk Enrollment, Manage Courses, Section Management, Waitlist Manager, Academic Terms, Generate Reports

### Enrollment Management
**Title:** Enrollment Management  
**Filters:** Search, Term, Status, Course, Department  
**Bulk Actions:** Import CSV, Export CSV/PDF, Enroll Student  
**Table:** Student, Student ID, Course, Section, Term, Status, Professor, Enrolled Date  
**Row Actions:** View, Edit, Drop, Move to Waitlist

### Bulk Enrollment Wizard
**Step 1:** Upload CSV (Download Template)  
**Step 2:** Validate (Shows Valid/Invalid counts with errors)  
**Step 3:** Confirm Enrollment  
**Step 4:** Processing (Progress bar)  
**Step 5:** Complete (Success/Error counts)

### Course Management
**Title:** Course Management  
**Table:** Course Code, Title, Units, Department, Prerequisites, Status, Sections, Enrollment  
**Actions:** View, Edit, Clone, Archive/Restore, Delete

### Section Management
**Title:** Section Management  
**Table:** Course, Section, Term, Professor, Schedule, Room, Capacity (Enrolled/Max + Waitlist), Status  
**Actions:** View Roster, Edit, Assign Professor, Cancel/Restore

### Term Management
**Title:** Academic Terms  
**Table:** Code, Label, Start Date, End Date, Reg Opens, Reg Closes, Grading Scale, Status  
**Actions:** View, Edit, Edit Grading Scale, Set Active, Delete

### Reports
**Title:** Reports & Analytics  
**Templates:** Enrollment by Course, Enrollment by Professor, Enrollment by Term, Capacity Utilization, Grade Distribution, Student Demographics, At-Risk Students, Completion Rates  
**Custom Builder:** Report Type, Term, Department, Format, Group By  
**Scheduled Reports:** Weekly Enrollment Summary, Monthly Grade Distribution, Term-End Capacity Report, Daily At-Risk Alert

## Admin Dashboard

### Overview
**Title:** Admin Dashboard  
**System Metrics:** Total Users, Active Sessions, DB Size, API Requests/hr, Error Rate, Uptime  
**Resource Usage:** CPU, Memory, Disk, Bandwidth  
**API Performance Chart:** 24-hour request/error trend  
**Recent Audit Logs:** Timestamp, Actor, Action, Entity, Details

### User Management
**Title:** User Management  
**Filters:** Search, Role, Status  
**Table:** Name, Email, Role, Status, Last Login, MFA  
**Actions:** View, Edit, Suspend/Activate, Reset Password, Delete  
**Bulk Actions:** Invite Users, Export

### Audit Logs
**Title:** Audit Logs  
**Filters:** Search, Action Type, Entity Type, Date Range  
**Table:** Timestamp, Actor, Action, Entity, Entity ID, Details

### System Monitoring
**Title:** System Health  
**Services:** Database, Auth, Storage, Realtime, Edge Functions, Backups  
**Edge Functions:** Name, Status, Invocations, Avg Duration, Errors  
**API Performance:** 24-hour chart

### Settings
**General:** Institution Name, Department, Default Grading Scale, Timezone, Maintenance Mode  
**Email:** SMTP Host, Port, Security, From Email, From Name, Enable Notifications  
**Feature Flags:** Grading v2, Real-time Collaboration, New Report Builder, Student Portal, Mobile App API, AI Grading Assistant

## Reports & Transcripts

### Report Templates
1. **Official Transcript** - Complete academic record with GPA
2. **Grade Report** - Term grades for student/section
3. **Class Roster** - Student list with contact info
4. **Enrollment Verification** - Official enrollment proof
5. **Grade Distribution** - Statistical analysis
6. **Completion Report** - Drop/withdrawal rates

### Report Builder
**Parameters:** Report Type, Term, Course, Section, Student, Format  
**Preview:** Live charts (Grade Distribution, GPA Trend)  
**Output:** PDF, Excel, CSV

### Generated Reports
**Table:** Report Name, Template, Generated, Generated By, Status, Format, Size, Actions

## Error Messages
- **Auth Failed:** Invalid credentials. Please check your email and password.
- **Account Not Approved:** Your account is pending admin approval.
- **MFA Required:** Two-factor authentication is required for this account.
- **Permission Denied:** You don't have permission to access this resource.
- **Validation Error:** Please check the highlighted fields.
- **Server Error:** Something went wrong. Please try again later.
- **Network Error:** Unable to connect. Check your internet connection.

## Success Messages
- **Grades Saved:** Grade saved as draft
- **Grades Submitted:** Grades submitted for review
- **Enrollment Created:** Student enrolled successfully
- **Report Generated:** Report ready for download
- **Settings Saved:** Changes saved successfully
- **User Invited:** Invitation sent to user's email

## Empty States
- **No Sections:** No assigned sections for this term
- **No Enrollments:** No students enrolled yet
- **No Grades:** No grades entered for this assessment
- **No Reports:** No reports generated yet
- **No Audit Logs:** No activity recorded

## Footer
**Address:** Cavite West Point College, Ternate, Cavite, Philippines  
**Contact:** bad@cwc.edu.ph (example domain)  
**Copyright:** © 2024 Cavite West Point College. All rights reserved.