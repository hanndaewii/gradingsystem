-- 001_initial_schema.sql
-- CWPC BAD Electronic Grading System - Complete Schema
-- Run with: supabase db reset

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom enum types
CREATE TYPE user_role AS ENUM ('student', 'professor', 'staff', 'admin');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'dropped', 'completed', 'pending');
CREATE TYPE grade_status AS ENUM ('pending', 'graded', 'submitted', 'late', 'excused');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) UNIQUE,
    full_name TEXT NOT NULL,
    college_email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    department TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT profiles_employee_number_format CHECK (
        employee_number IS NULL OR employee_number ~ '^[A-Z0-9-]+$'
    ),
    CONSTRAINT profiles_college_email_format CHECK (
        college_email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
);

-- Indexes for profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_department ON public.profiles(department);
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX idx_profiles_employee_number ON public.profiles(employee_number);
CREATE INDEX idx_profiles_college_email ON public.profiles(college_email);

-- ============================================================================
-- TERMS TABLE
-- ============================================================================
CREATE TABLE public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    label TEXT NOT NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    grading_scale JSONB NOT NULL DEFAULT '[
        {"min": 97, "max": 100, "grade": "1.00", "description": "Excellent"},
        {"min": 94, "max": 96, "grade": "1.25", "description": "Excellent"},
        {"min": 91, "max": 93, "grade": "1.50", "description": "Very Good"},
        {"min": 88, "max": 90, "grade": "1.75", "description": "Very Good"},
        {"min": 85, "max": 87, "grade": "2.00", "description": "Good"},
        {"min": 82, "max": 84, "grade": "2.25", "description": "Good"},
        {"min": 79, "max": 81, "grade": "2.50", "description": "Satisfactory"},
        {"min": 76, "max": 78, "grade": "2.75", "description": "Satisfactory"},
        {"min": 75, "max": 75, "grade": "3.00", "description": "Passing"},
        {"min": 0, "max": 74, "grade": "5.00", "description": "Failed"}
    ]'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT terms_date_order CHECK (starts_at <= ends_at),
    CONSTRAINT terms_grading_scale_valid CHECK (
        grading_scale IS NULL OR jsonb_typeof(grading_scale) = 'array'
    )
);

-- Indexes for terms
CREATE INDEX idx_terms_is_active ON public.terms(is_active);
CREATE INDEX idx_terms_code ON public.terms(code);
CREATE INDEX idx_terms_dates ON public.terms(starts_at, ends_at);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    units INTEGER NOT NULL DEFAULT 3,
    department TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT courses_units_positive CHECK (units > 0),
    CONSTRAINT courses_code_format CHECK (code ~ '^[A-Z]{2,4}[0-9]{3}$')
);

-- Indexes for courses
CREATE INDEX idx_courses_department ON public.courses(department);
CREATE INDEX idx_courses_code ON public.courses(code);

-- ============================================================================
-- CLASSES TABLE
-- ============================================================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    section VARCHAR(10) NOT NULL,
    schedule JSONB NOT NULL DEFAULT '[]'::JSONB,
    max_students INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT classes_max_students_positive CHECK (max_students > 0),
    CONSTRAINT classes_schedule_valid CHECK (
        schedule IS NULL OR jsonb_typeof(schedule) = 'array'
    ),
    CONSTRAINT classes_unique_section_per_term UNIQUE (course_id, term_id, section)
);

-- Indexes for classes
CREATE INDEX idx_classes_course_id ON public.classes(course_id);
CREATE INDEX idx_classes_term_id ON public.classes(term_id);
CREATE INDEX idx_classes_professor_id ON public.classes(professor_id);
CREATE INDEX idx_classes_course_term_section ON public.classes(course_id, term_id, section);

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number VARCHAR(20) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    program TEXT NOT NULL,
    year_level INTEGER NOT NULL DEFAULT 1,
    college_email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT students_student_number_format CHECK (
        student_number ~ '^[0-9]{4}-[0-9]{5}$'
    ),
    CONSTRAINT students_year_level_range CHECK (year_level BETWEEN 1 AND 6),
    CONSTRAINT students_college_email_format CHECK (
        college_email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
);

-- Indexes for students
CREATE INDEX idx_students_student_number ON public.students(student_number);
CREATE INDEX idx_students_program ON public.students(program);
CREATE INDEX idx_students_year_level ON public.students(year_level);
CREATE INDEX idx_students_college_email ON public.students(college_email);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'pending',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dropped_at TIMESTAMPTZ,
    final_grade NUMERIC(4,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT enrollments_unique_student_class UNIQUE (student_id, class_id),
    CONSTRAINT enrollments_final_grade_range CHECK (
        final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 100)
    ),
    CONSTRAINT enrollments_dropped_at_logic CHECK (
        (status = 'dropped' AND dropped_at IS NOT NULL) OR
        (status != 'dropped' AND dropped_at IS NULL)
    )
);

-- Indexes for enrollments
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);
CREATE INDEX idx_enrollments_final_grade ON public.enrollments(final_grade);

-- ============================================================================
-- ASSESSMENT_TYPES TABLE
-- ============================================================================
CREATE TABLE public.assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT assessment_types_weight_positive CHECK (weight > 0),
    CONSTRAINT assessment_types_weight_max CHECK (weight <= 100),
    CONSTRAINT assessment_types_max_score_positive CHECK (max_score > 0)
);

-- Indexes for assessment_types
CREATE INDEX idx_assessment_types_class_id ON public.assessment_types(class_id);
CREATE INDEX idx_assessment_types_due_date ON public.assessment_types(due_date);

-- ============================================================================
-- GRADE_COMPONENTS TABLE
-- ============================================================================
CREATE TABLE public.grade_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE CASCADE,
    raw_score NUMERIC(6,2),
    weighted_score NUMERIC(6,2) GENERATED ALWAYS AS (
        CASE 
            WHEN raw_score IS NOT NULL AND assessment_type_id IS NOT NULL THEN
                ROUND(
                    (raw_score / (
                        SELECT max_score FROM public.assessment_types 
                        WHERE id = grade_components.assessment_type_id
                    )) * (
                        SELECT weight FROM public.assessment_types 
                        WHERE id = grade_components.assessment_type_id
                    ), 2
                )
            ELSE NULL
        END
    ) STORED,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES public.profiles(id),
    status grade_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT grade_components_unique_enrollment_assessment UNIQUE (enrollment_id, assessment_type_id),
    CONSTRAINT grade_components_raw_score_range CHECK (
        raw_score IS NULL OR (raw_score >= 0)
    ),
    CONSTRAINT grade_components_raw_score_max CHECK (
        raw_score IS NULL OR (
            SELECT max_score FROM public.assessment_types 
            WHERE id = grade_components.assessment_type_id
        ) IS NULL OR
        raw_score <= (
            SELECT max_score FROM public.assessment_types 
            WHERE id = grade_components.assessment_type_id
        )
    )
);

-- Indexes for grade_components
CREATE INDEX idx_grade_components_enrollment_id ON public.grade_components(enrollment_id);
CREATE INDEX idx_grade_components_assessment_type_id ON public.grade_components(assessment_type_id);
CREATE INDEX idx_grade_components_status ON public.grade_components(status);
CREATE INDEX idx_grade_components_graded_by ON public.grade_components(graded_by);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT audit_logs_entity_type_not_empty CHECK (entity_type != '')
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_type_entity_id ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================================
-- VIEW: Class Assessment Weight Summary
-- ============================================================================
CREATE VIEW public.class_assessment_weights AS
SELECT 
    c.id AS class_id,
    c.course_id,
    c.term_id,
    c.professor_id,
    c.section,
    COALESCE(SUM(at.weight), 0) AS total_weight,
    COUNT(at.id) AS assessment_count,
    CASE 
        WHEN COALESCE(SUM(at.weight), 0) = 100 THEN 'valid'
        WHEN COALESCE(SUM(at.weight), 0) > 100 THEN 'overweight'
        ELSE 'underweight'
    END AS weight_status
FROM public.classes c
LEFT JOIN public.assessment_types at ON at.class_id = c.id
GROUP BY c.id, c.course_id, c.term_id, c.professor_id, c.section;

-- ============================================================================
-- VIEW: Student Current Grades
-- ============================================================================
CREATE VIEW public.student_current_grades AS
SELECT 
    e.id AS enrollment_id,
    e.student_id,
    e.class_id,
    s.student_number,
    s.full_name AS student_name,
    c.code AS course_code,
    c.title AS course_title,
    cl.section,
    t.code AS term_code,
    t.label AS term_label,
    COALESCE(SUM(gc.weighted_score), 0) AS current_grade,
    COUNT(gc.id) FILTER (WHERE gc.status = 'graded') AS graded_count,
    COUNT(at.id) AS total_assessments,
    e.final_grade,
    e.status AS enrollment_status
FROM public.enrollments e
JOIN public.students s ON s.id = e.student_id
JOIN public.classes cl ON cl.id = e.class_id
JOIN public.courses c ON c.id = cl.course_id
JOIN public.terms t ON t.id = cl.term_id
LEFT JOIN public.assessment_types at ON at.class_id = cl.id
LEFT JOIN public.grade_components gc ON gc.enrollment_id = e.id AND gc.assessment_type_id = at.id
WHERE e.status IN ('enrolled', 'completed')
GROUP BY e.id, e.student_id, e.class_id, s.student_number, s.full_name, 
         c.code, c.title, cl.section, t.code, t.label, e.final_grade, e.status;