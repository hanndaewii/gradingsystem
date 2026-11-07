# CWPC BAD Electronic Grading System

A comprehensive, design-taste compliant electronic grading system for the Department of Business Administration at Cavite West Point College (Ternate, Cavite).

## Overview

This system provides a staff-only grading platform with role-based access control for professors, staff (registrar), and administrators. Built with modern technologies and following design-taste-frontend principles for professional, accessible UI.

## Features

### Professor Features
- **Dashboard**: Assigned classes overview with quick stats
- **Gradebook**: Virtualized spreadsheet for 500+ students × 50 assessments
- **Inline Grading**: Keyboard-navigable cells with auto-save drafts
- **Rubric Grading**: Criteria-based assessment with auto-calculation
- **Assessment Management**: Create/edit assessments with weight validation
- **Bulk Operations**: CSV import/export, fill down/right
- **Grade Submission**: Draft → Submitted → Finalized workflow

### Staff (Registrar) Features
- **Enrollment Management**: Advanced filtering, 10k+ row virtualized tables
- **Bulk Enrollment**: CSV validation with prerequisite checking
- **Waitlist Management**: Auto-promotion with notifications
- **Course/Section Management**: CRUD with professor assignment
- **Academic Terms**: Term configuration with grading scales
- **Reports**: Enrollment analytics, capacity utilization, demographics

### Admin Features
- **User Management**: Invite, approve, suspend, role assignment
- **System Monitoring**: API metrics, resource usage, Edge Function health
- **Audit Logs**: Comprehensive activity tracking
- **Feature Flags**: Gradual rollout of new features
- **Settings**: Institution config, email templates, grading scales

### Shared Features
- **PDF Generation**: Transcripts, grade reports, enrollment verification
- **Real-time Updates**: Supabase Realtime for live collaboration
- **Role-Based Access**: RLS-enforced data isolation
- **MFA Support**: TOTP for admin/staff accounts
- **Design-Taste Compliance**: Professional UI at figma.com/x.ai quality

## Tech Stack

- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Design-Taste Token System
- **UI Components**: Radix UI primitives + Custom design-taste components
- **State Management**: TanStack Query, React Hook Form, Zod
- **Tables**: TanStack Table v8 (virtualized, sortable, filterable)
- **Charts**: Chart.js / react-chartjs-2
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Database**: PostgreSQL with RLS, triggers, materialized views
- **PDF**: pdf-lib for server-side generation
- **Deployment**: Vercel (frontend) + Supabase Cloud (backend)

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 9+
- Supabase CLI
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd cwc-bad-grading-system

# Install dependencies
pnpm install

# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/lib/supabase/database.types.ts

# Start development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Design-Taste Compliance

This project follows the design-taste-frontend skill (tasteskill 2.5.0) for professional UI quality:

- **One section per screen height**
- **Equal left/right content edges**
- **Soft 10px radius**
- **Hover micro-animations** (lift 2px, zoom 1.02-1.03)
- **Real icons** (Lucide React)
- **Real photographs** (CWPC campus, faculty)
- **No violet/lavender** in design tokens
- **Reduced motion** support
- **WCAG 2.1 AA** accessibility

### Verification Commands

```bash
# Consistency check (equal edges, one section per screen)
node .taste-skill/scripts/consistency.mjs http://localhost:3000 --widths 1440,1024,768,390

# Layout stress test
node .taste-skill/assets/layout/check.mjs --url http://localhost:3000 --sizes 1440x900,1024x768,768x1024,390x844

# Performance audit
node .taste-skill/scripts/perf.mjs http://localhost:3000
```

## Database Schema

Key tables:
- `profiles` - Extended user profiles with roles
- `terms` - Academic terms with grading scales
- `courses` - Course catalog with prerequisites
- `classes` - Section offerings with schedules
- `students` - Student records
- `enrollments` - Student-section relationships
- `assessment_types` - Grading components per class
- `grade_components` - Individual grade entries
- `audit_logs` - Comprehensive activity tracking

All tables have Row Level Security (RLS) policies enforcing role-based access.

## Edge Functions

- `generate_transcript` - PDF transcript generation
- `bulk_enrollment_import` - CSV enrollment processing
- `grade_calculator` - Real-time grade computation
- `waitlist_processor` - Daily waitlist promotion
- `send_notification` - Email/push notifications
- `scheduled_reports` - Automated report generation

## Role Permissions

| Feature | Admin | Staff | Professor | Student |
|---------|-------|-------|-----------|---------|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Course/Term Management | ✅ | ✅ | ❌ | ❌ |
| Enrollment Management | ✅ | ✅ | ❌ | ❌ |
| Grade Entry | ✅ | ✅ | ✅ (own) | ❌ |
| Grade Reports | ✅ | ✅ | ✅ (own) | ✅ (own) |
| Transcripts | ✅ | ✅ | ❌ | ✅ (own) |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |

## Deployment

### Vercel (Frontend)
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy on push to main

### Supabase (Backend)
1. Link local project: `supabase link --project-ref <ref>`
2. Push migrations: `supabase db push --linked`
3. Deploy functions: `supabase functions deploy --linked`

## Testing

```bash
# Unit tests
pnpm run test:unit

# E2E tests
pnpm run test:e2e

# Visual regression
pnpm run test:visual

# Lint & Typecheck
pnpm run lint
pnpm run typecheck
```

## Project Structure

```
├── .github/workflows/          # CI/CD pipelines
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth routes
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── professor/     # Professor pages
│   │   │   ├── staff/         # Staff pages
│   │   │   └── admin/         # Admin pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Design-taste UI primitives
│   │   ├── professor/         # Professor components
│   │   ├── staff/             # Staff components
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Auth components
│   │   └── reports/           # Report components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   └── design-system/     # Design tokens
│   └── types/                 # TypeScript types
├── supabase/
│   ├── migrations/            # Database migrations
│   └── functions/             # Edge Functions
└── .taste-skill/              # Design-taste assets
```

## Contributing

1. Follow design-taste compliance (run checks before commit)
2. Write tests for new features
3. Update database types after migrations
4. Document API changes
5. Ensure accessibility (WCAG 2.1 AA)

## License

Proprietary - Cavite West Point College

## Support

For technical issues, contact the CWPC IT Department.
For academic policy questions, contact the BAD Department Head.