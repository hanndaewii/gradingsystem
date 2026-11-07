# Design-Taste Section Recipes

## Software Page Sections

### hero-editorial
Landing page hero with CWPC branding, photo background, centered content.

```html
<section class="hero-editorial" style="min-height: 100vh;">
  <div class="wrap">
    <div class="hero-content">
      <h1 class="text-display-sm font-semibold">Electronic Grading System for Business Administration Faculty</h1>
      <p class="text-body text-gray-500 mt-4 max-w-2xl">Streamline grading workflows, manage enrollments, and generate official transcripts with the official CWPC BAD platform.</p>
      <p class="text-body font-medium text-primary mt-6">Serving 40+ faculty, 1,200+ students across 150+ sections annually.</p>
      <div class="hero-cta mt-8">
        <a href="/auth/login" class="btn-primary">Sign In</a>
        <a href="/auth/register" class="btn-secondary">Register as Professor</a>
      </div>
    </div>
  </div>
  <div class="hero-image" aria-hidden="true">
    <img src="/photos/cwpc-campus-hero.jpg" alt="CWPC Campus" loading="eager" fetchpriority="high">
  </div>
</section>
```

### hero-dashboard
Dashboard hero with user greeting, quick stats, primary CTA.

```html
<section class="hero-dashboard">
  <div class="wrap">
    <div class="dashboard-header">
      <div>
        <h1 class="text-display-sm font-semibold">Professor Dashboard</h1>
        <p class="text-body text-gray-500 mt-1">Welcome back, Dr. Reyes</p>
      </div>
      <div class="dashboard-actions">
        <button class="btn-primary">Enter Grades</button>
      </div>
    </div>
    <div class="dashboard-stats grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      <stat-card label="My Sections" value="4" />
      <stat-card label="Total Students" value="156" />
      <stat-card label="Pending Grades" value="23" trend="+5" />
      <stat-card label="Upcoming Deadlines" value="5" />
    </div>
  </div>
</section>
```

### class-cards
Grid of class cards for professor dashboard.

```html
<section class="class-cards">
  <div class="wrap">
    <div class="section-header">
      <h2 class="text-heading-md font-semibold">My Classes</h2>
    </div>
    <div class="cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <class-card
        course-code="BUSAD 301"
        title="Strategic Management"
        section="A"
        term="Fall 2024"
        students="38/40"
        avg-grade="2.15"
        on-enter-grades="navigate('/classes/busad-301-a/grades')"
      />
      <!-- Repeat for each class -->
    </div>
  </div>
</section>
```

### grade-spreadsheet
Full-screen virtualized gradebook with inline editing.

```html
<section class="grade-spreadsheet" style="height: calc(100vh - var(--header-height));">
  <div class="wrap h-full">
    <div class="gradebook-toolbar flex items-center justify-between mb-4">
      <div class="gradebook-tabs">
        <button class="tab active">Midterm Exam (30%)</button>
        <button class="tab">Final Project (40%)</button>
        <button class="tab">Quizzes (20%)</button>
        <button class="tab">Participation (10%)</button>
      </div>
      <div class="bulk-actions">
        <button class="btn-secondary">Import CSV</button>
        <button class="btn-secondary">Export CSV</button>
        <button class="btn-primary">Submit All</button>
      </div>
    </div>
    <div class="gradebook-table-container flex-1 overflow-auto">
      <data-table
        virtualized
        columns="student-name,student-id,midterm,final-project,quiz-1,quiz-2,participation,final-grade,status"
        keyboard-navigation
        auto-save-delay="300"
      />
    </div>
  </div>
</section>
```

### enrollment-table
Staff enrollment management with advanced filters.

```html
<section class="enrollment-table">
  <div class="wrap">
    <div class="section-header flex flex-col md:flex-row gap-4 mb-6">
      <h2 class="text-heading-md font-semibold">Enrollment Management</h2>
      <div class="toolbar flex gap-3 flex-wrap">
        <input type="search" placeholder="Search students..." class="input flex-1 min-w-[250px]" />
        <select class="select"><option>All Terms</option></select>
        <select class="select"><option>All Status</option></select>
        <button class="btn-secondary">Export</button>
        <button class="btn-secondary">Import CSV</button>
        <button class="btn-primary">Enroll Student</button>
      </div>
    </div>
    <data-table
      virtualized
      columns="student,student-id,course,section,term,status,professor,enrolled-date"
      row-actions="view,edit,drop,waitlist"
      pagination
      page-size="15"
      filterable
      sortable
    />
  </div>
</section>
```

### report-builder
Custom report builder with live preview.

```html
<section class="report-builder">
  <div class="wrap grid lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
      <card>
        <card-header><h3 class="text-heading-sm">Report Parameters</h3></card-header>
        <card-content class="space-y-6">
          <form-field label="Report Type">
            <select><option>Transcript</option><option>Grade Report</option>...</select>
          </form-field>
          <form-field label="Academic Term">
            <select><option>Fall 2024</option>...</select>
          </form-field>
          <form-field label="Department">
            <select><option>All Departments</option>...</select>
          </form-field>
          <form-field label="Format">
            <select><option>PDF</option><option>Excel</option><option>CSV</option></select>
          </form-field>
          <button class="btn-primary w-full">Generate Report</button>
        </card-content>
      </card>
    </div>
    <div class="lg:col-span-2">
      <card>
        <card-header><h3 class="text-heading-sm">Live Preview</h3></card-header>
        <card-content>
          <grade-distribution-chart />
          <gpa-trend-chart />
        </card-content>
      </card>
    </div>
  </div>
</section>
```

### user-management
Admin user management table.

```html
<section class="user-management">
  <div class="wrap">
    <div class="section-header flex flex-col md:flex-row gap-4 mb-6 justify-between">
      <div>
        <h2 class="text-heading-md font-semibold">User Management</h2>
        <p class="text-body text-gray-500">2,847 total users</p>
      </div>
      <div class="toolbar flex gap-3">
        <input type="search" placeholder="Search users..." class="input min-w-[250px]" />
        <select class="select"><option>All Roles</option></select>
        <select class="select"><option>All Status</option></select>
        <button class="btn-primary">Invite User</button>
      </div>
    </div>
    <data-table
      virtualized
      columns="name,email,role,status,last-login,mfa"
      row-actions="view,edit,suspend,reset-password,delete"
      pagination
      page-size="20"
    />
  </div>
</section>
```

## Reusable Components

### stat-card
```html
<article class="stat-card p-6">
  <div class="stat-icon bg-primary/10 text-primary">icon</div>
  <div class="stat-content">
    <p class="text-caption text-gray-500">Label</p>
    <p class="text-display-sm font-semibold text-gray-900">Value</p>
    <p class="text-caption text-success">+5% vs last term</p>
  </div>
</article>
```

### class-card
```html
<article class="class-card card-hover p-6">
  <div class="class-header flex justify-between">
    <span class="badge">BUSAD 301</span>
    <span class="text-caption text-gray-500">Fall 2024</span>
  </div>
  <h3 class="text-heading-sm font-semibold mt-4">Strategic Management</h3>
  <p class="text-body text-gray-500 mt-2">Section A • 38/40 students</p>
  <div class="class-stats flex gap-6 mt-4 text-sm">
    <span class="text-gray-500">Avg: <strong class="text-gray-900">2.15</strong></span>
    <span class="text-gray-500">Pending: <strong class="text-warning">12</strong></span>
  </div>
  <button class="btn-primary w-full mt-6">Enter Grades</button>
</article>
```

### data-table (TanStack Table v8)
```tsx
<DataTable
  columns={columns}
  data={data}
  virtualized
  searchable
  filterable
  sortable
  pagination
  pageSize={15}
  rowActions={[
    { label: 'View', onClick: handleView },
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' }
  ]}
/>
```

## Layout Utilities

### .wrap (Equal Edges)
```css
.wrap {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem; /* space-6 */
}
@media (min-width: 640px) { .wrap { padding: 0 2rem; } } /* space-8 */
@media (min-width: 1024px) { .wrap { padding: 0 2.5rem; } } /* space-10 */
```

### .section (One Section Per Screen)
```css
.section {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
}
.section > .wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

### Card Hover
```css
.card-hover {
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
```

### Photo Zoom
```css
.photo-zoom {
  transition: transform var(--duration-slow) var(--ease-out);
}
.photo-zoom:hover {
  transform: scale(1.02);
}
@media (min-width: 1024px) {
  .photo-zoom:hover {
    transform: scale(1.03);
  }
}
```