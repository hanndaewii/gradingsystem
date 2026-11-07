-- 004_seed_data.sql
-- CWPC BAD Electronic Grading System - Seed Data
-- Run after 001_initial_schema.sql, 002_rls_policies.sql, 003_functions_triggers.sql

-- ============================================================================
-- SAMPLE GRADING SCALES (Philippine University Standards)
-- ============================================================================

-- Standard Philippine 1.00-5.00 Scale (Default)
-- Already set as default in terms table

-- Alternative: Percentage-based with Letter Grades
INSERT INTO public.terms (code, label, starts_at, ends_at, grading_scale, is_active)
VALUES (
    'SEM1-2024-ALT',
    'First Semester AY 2024-2025 (Letter Grades)',
    '2024-08-01',
    '2024-12-15',
    '[
        {"min": 97, "max": 100, "grade": "A+", "description": "Excellent", "grade_point": 1.00},
        {"min": 93, "max": 96, "grade": "A", "description": "Excellent", "grade_point": 1.25},
        {"min": 90, "max": 92, "grade": "A-", "description": "Very Good", "grade_point": 1.50},
        {"min": 87, "max": 89, "grade": "B+", "description": "Very Good", "grade_point": 1.75},
        {"min": 84, "max": 86, "grade": "B", "description": "Good", "grade_point": 2.00},
        {"min": 81, "max": 83, "grade": "B-", "description": "Good", "grade_point": 2.25},
        {"min": 78, "max": 80, "grade": "C+", "description": "Satisfactory", "grade_point": 2.50},
        {"min": 75, "max": 77, "grade": "C", "description": "Satisfactory", "grade_point": 2.75},
        {"min": 72, "max": 74, "grade": "C-", "description": "Passing", "grade_point": 3.00},
        {"min": 0, "max": 71, "grade": "F", "description": "Failed", "grade_point": 5.00}
    ]'::JSONB,
    FALSE
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SAMPLE TERMS
-- ============================================================================
INSERT INTO public.terms (code, label, starts_at, ends_at, is_active) VALUES
    ('SEM1-2024', 'First Semester AY 2024-2025', '2024-08-01', '2024-12-15', TRUE),
    ('SEM2-2024', 'Second Semester AY 2024-2025', '2025-01-15', '2025-05-30', FALSE),
    ('MID-2024', 'Midyear Term AY 2024-2025', '2025-06-15', '2025-07-30', FALSE),
    ('SEM1-2025', 'First Semester AY 2025-2026', '2025-08-01', '2025-12-15', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SAMPLE COURSES (BAD - Business Administration)
-- ============================================================================
INSERT INTO public.courses (code, title, description, units, department) VALUES
    ('BAD101', 'Introduction to Business Administration', 'Fundamental concepts of business management, organization, and environment', 3, 'Business Administration'),
    ('BAD102', 'Business Mathematics', 'Mathematical concepts and techniques applied to business problems', 3, 'Business Administration'),
    ('BAD103', 'Principles of Marketing', 'Basic marketing concepts, strategies, and the marketing mix', 3, 'Business Administration'),
    ('BAD104', 'Financial Accounting I', 'Introduction to accounting principles, cycle, and financial statements', 3, 'Accountancy'),
    ('BAD105', 'Business Communication', 'Effective written and oral communication in business settings', 3, 'Business Administration'),
    ('BAD201', 'Microeconomics', 'Principles of microeconomic theory and applications', 3, 'Economics'),
    ('BAD202', 'Macroeconomics', 'Principles of macroeconomic theory, policy, and applications', 3, 'Economics'),
    ('BAD203', 'Cost Accounting', 'Cost concepts, behavior, and accounting for manufacturing and service firms', 3, 'Accountancy'),
    ('BAD204', 'Business Law I', 'Legal environment of business, contracts, and commercial law', 3, 'Business Administration'),
    ('BAD205', 'Human Resource Management', 'Principles and practices of HRM in modern organizations', 3, 'Business Administration'),
    ('BAD301', 'Financial Management', 'Principles of financial analysis, planning, and control', 3, 'Finance'),
    ('BAD302', 'Operations Management', 'Design, planning, and control of production and service operations', 3, 'Business Administration'),
    ('BAD303', 'Strategic Management', 'Strategic planning, implementation, and evaluation', 3, 'Business Administration'),
    ('BAD304', 'Business Research Methods', 'Research design, data collection, and analysis for business decisions', 3, 'Business Administration'),
    ('BAD305', 'Entrepreneurship', 'New venture creation, business planning, and innovation', 3, 'Business Administration'),
    ('BAD401', 'International Business', 'Global business environment and multinational operations', 3, 'Business Administration'),
    ('BAD402', 'Business Ethics and Corporate Governance', 'Ethical decision-making and governance in business', 3, 'Business Administration'),
    ('BAD403', 'Thesis/Capstone Project I', 'Research project applying business knowledge', 3, 'Business Administration'),
    ('BAD404', 'Thesis/Capstone Project II', 'Completion and defense of research project', 3, 'Business Administration'),
    ('BAD405', 'Practicum/Internship', 'Supervised work experience in business organizations', 6, 'Business Administration')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DEMO USERS (Profiles)
-- Note: These profiles should be created AFTER auth.users are created
-- The following are templates - actual users created via Supabase Auth
-- ============================================================================

-- Demo Admin User (create via Supabase Auth first, then run this)
-- Email: admin@cwpc.edu.ph
-- Password: AdminPass123!
-- After creating in Auth, run:
/*
INSERT INTO public.profiles (id, employee_number, full_name, college_email, role, department, is_approved, approved_at)
SELECT 
    au.id,
    'EMP-0001',
    'System Administrator',
    'admin@cwpc.edu.ph',
    'admin'::user_role,
    'IT Administration',
    TRUE,
    NOW()
FROM auth.users au
WHERE au.email = 'admin@cwpc.edu.ph'
ON CONFLICT (id) DO UPDATE SET
    employee_number = EXCLUDED.employee_number,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    is_approved = EXCLUDED.is_approved,
    approved_at = EXCLUDED.approved_at;
*/

-- Demo Staff User
-- Email: staff@cwpc.edu.ph
/*
INSERT INTO public.profiles (id, employee_number, full_name, college_email, role, department, is_approved, approved_at)
SELECT 
    au.id,
    'EMP-0002',
    'Academic Staff',
    'staff@cwpc.edu.ph',
    'staff'::user_role,
    'Registrar Office',
    TRUE,
    NOW()
FROM auth.users au
WHERE au.email = 'staff@cwpc.edu.ph'
ON CONFLICT (id) DO NOTHING;
*/

-- Demo Professors
-- Email: prof1@cwpc.edu.ph, prof2@cwpc.edu.ph, prof3@cwpc.edu.ph
/*
INSERT INTO public.profiles (id, employee_number, full_name, college_email, role, department, is_approved, approved_at)
SELECT 
    au.id,
    'EMP-1001',
    'Dr. Juan Dela Cruz',
    'prof1@cwpc.edu.ph',
    'professor'::user_role,
    'Business Administration',
    TRUE,
    NOW()
FROM auth.users au
WHERE au.email = 'prof1@cwpc.edu.ph'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, employee_number, full_name, college_email, role, department, is_approved, approved_at)
SELECT 
    au.id,
    'EMP-1002',
    'Prof. Maria Santos',
    'prof2@cwpc.edu.ph',
    'professor'::user_role,
    'Accountancy',
    TRUE,
    NOW()
FROM auth.users au
WHERE au.email = 'prof2@cwpc.edu.ph'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, employee_number, full_name, college_email, role, department, is_approved, approved_at)
SELECT 
    au.id,
    'EMP-1003',
    'Dr. Roberto Reyes',
    'prof3@cwpc.edu.ph',
    'professor'::user_role,
    'Economics',
    TRUE,
    NOW()
FROM auth.users au
WHERE au.email = 'prof3@cwpc.edu.ph'
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- SAMPLE CLASSES (requires professors to exist first)
-- Run after creating professor profiles
-- ============================================================================

/*
-- Get professor IDs
DO $$
DECLARE
    v_prof1 UUID;
    v_prof2 UUID;
    v_prof3 UUID;
    v_term_id UUID;
    v_course_bad101 UUID;
    v_course_bad103 UUID;
    v_course_bad104 UUID;
    v_course_bad201 UUID;
    v_course_bad203 UUID;
    v_course_bad301 UUID;
BEGIN
    -- Get term
    SELECT id INTO v_term_id FROM public.terms WHERE code = 'SEM1-2024';
    
    -- Get courses
    SELECT id INTO v_course_bad101 FROM public.courses WHERE code = 'BAD101';
    SELECT id INTO v_course_bad103 FROM public.courses WHERE code = 'BAD103';
    SELECT id INTO v_course_bad104 FROM public.courses WHERE code = 'BAD104';
    SELECT id INTO v_course_bad201 FROM public.courses WHERE code = 'BAD201';
    SELECT id INTO v_course_bad203 FROM public.courses WHERE code = 'BAD203';
    SELECT id INTO v_course_bad301 FROM public.courses WHERE code = 'BAD301';
    
    -- Get professors
    SELECT id INTO v_prof1 FROM public.profiles WHERE college_email = 'prof1@cwpc.edu.ph';
    SELECT id INTO v_prof2 FROM public.profiles WHERE college_email = 'prof2@cwpc.edu.ph';
    SELECT id INTO v_prof3 FROM public.profiles WHERE college_email = 'prof3@cwpc.edu.ph';
    
    -- Insert classes
    INSERT INTO public.classes (course_id, term_id, professor_id, section, schedule, max_students) VALUES
        (v_course_bad101, v_term_id, v_prof1, 'A', '[{"day": "MWF", "time_start": "07:30", "time_end": "08:30", "room": "BA-101"}]'::jsonb, 45),
        (v_course_bad101, v_term_id, v_prof1, 'B', '[{"day": "MWF", "time_start": "08:30", "time_end": "09:30", "room": "BA-102"}]'::jsonb, 45),
        (v_course_bad103, v_term_id, v_prof1, 'A', '[{"day": "TTH", "time_start": "09:00", "time_end": "10:30", "room": "BA-201"}]'::jsonb, 40),
        (v_course_bad104, v_term_id, v_prof2, 'A', '[{"day": "MWF", "time_start": "10:30", "time_end": "11:30", "room": "BA-301"}]'::jsonb, 35),
        (v_course_bad104, v_term_id, v_prof2, 'B', '[{"day": "TTH", "time_start": "13:00", "time_end": "14:30", "room": "BA-302"}]'::jsonb, 35),
        (v_course_bad201, v_term_id, v_prof3, 'A', '[{"day": "MWF", "time_start": "07:30", "time_end": "08:30", "room": "ECO-101"}]'::jsonb, 50),
        (v_course_bad203, v_term_id, v_prof2, 'A', '[{"day": "TTH", "time_start": "10:30", "time_end": "12:00", "room": "ACC-201"}]'::jsonb, 30),
        (v_course_bad301, v_term_id, v_prof1, 'A', '[{"day": "MWF", "time_start": "13:00", "time_end": "14:00", "room": "BA-401"}]'::jsonb, 40)
    ON CONFLICT (course_id, term_id, section) DO NOTHING;
END $$;
*/

-- ============================================================================
-- SAMPLE STUDENTS
-- ============================================================================
INSERT INTO public.students (student_number, full_name, program, year_level, college_email) VALUES
    ('2024-00001', 'Ana Marie Santos', 'BS Business Administration', 1, '2024-00001@cwpc.edu.ph'),
    ('2024-00002', 'Carlos Miguel Reyes', 'BS Business Administration', 1, '2024-00002@cwpc.edu.ph'),
    ('2024-00003', 'Beatriz Elena Cruz', 'BS Business Administration', 1, '2024-00003@cwpc.edu.ph'),
    ('2024-00004', 'Daniel Jose Garcia', 'BS Business Administration', 1, '2024-00004@cwpc.edu.ph'),
    ('2024-00005', 'Francesca Louise Lim', 'BS Business Administration', 1, '2024-00005@cwpc.edu.ph'),
    ('2023-00001', 'Gabriel Andrew Tan', 'BS Business Administration', 2, '2023-00001@cwpc.edu.ph'),
    ('2023-00002', 'Hannah Grace Yu', 'BS Business Administration', 2, '2023-00002@cwpc.edu.ph'),
    ('2023-00003', 'Ian Christopher Co', 'BS Business Administration', 2, '2023-00003@cwpc.edu.ph'),
    ('2023-00004', 'Janine Patricia Dy', 'BS Business Administration', 2, '2023-00004@cwpc.edu.ph'),
    ('2023-00005', 'Kevin Michael Ong', 'BS Business Administration', 2, '2023-00005@cwpc.edu.ph'),
    ('2022-00001', 'Louise Alexandra Sy', 'BS Business Administration', 3, '2022-00001@cwpc.edu.ph'),
    ('2022-00002', 'Manuel Luis Go', 'BS Business Administration', 3, '2022-00002@cwpc.edu.ph'),
    ('2022-00003', 'Nicole Anne Chu', 'BS Business Administration', 3, '2022-00003@cwpc.edu.ph'),
    ('2022-00004', 'Patrick Henry Lim', 'BS Business Administration', 3, '2022-00004@cwpc.edu.ph'),
    ('2022-00005', 'Queen Elizabeth Tan', 'BS Business Administration', 3, '2022-00005@cwpc.edu.ph'),
    ('2021-00001', 'Ralph Lauren Yu', 'BS Business Administration', 4, '2021-00001@cwpc.edu.ph'),
    ('2021-00002', 'Stephanie Joy Co', 'BS Business Administration', 4, '2021-00002@cwpc.edu.ph'),
    ('2021-00003', 'Timothy John Dy', 'BS Business Administration', 4, '2021-00003@cwpc.edu.ph'),
    ('2021-00004', 'Vanessa Kate Ong', 'BS Business Administration', 4, '2021-00004@cwpc.edu.ph'),
    ('2021-00005', 'William Robert Sy', 'BS Business Administration', 4, '2021-00005@cwpc.edu.ph')
ON CONFLICT (student_number) DO NOTHING;

-- ============================================================================
-- SAMPLE ASSESSMENT TYPES (run after classes are created)
-- ============================================================================

/*
DO $$
DECLARE
    v_class_bad101_a UUID;
    v_class_bad101_b UUID;
    v_class_bad103_a UUID;
    v_class_bad104_a UUID;
BEGIN
    -- Get class IDs
    SELECT id INTO v_class_bad101_a FROM public.classes 
    WHERE course_id = (SELECT id FROM public.courses WHERE code = 'BAD101') 
    AND term_id = (SELECT id FROM public.terms WHERE code = 'SEM1-2024')
    AND section = 'A';
    
    SELECT id INTO v_class_bad101_b FROM public.classes 
    WHERE course_id = (SELECT id FROM public.courses WHERE code = 'BAD101') 
    AND term_id = (SELECT id FROM public.terms WHERE code = 'SEM1-2024')
    AND section = 'B';
    
    SELECT id INTO v_class_bad103_a FROM public.classes 
    WHERE course_id = (SELECT id FROM public.courses WHERE code = 'BAD103') 
    AND term_id = (SELECT id FROM public.terms WHERE code = 'SEM1-2024')
    AND section = 'A';
    
    SELECT id INTO v_class_bad104_a FROM public.classes 
    WHERE course_id = (SELECT id FROM public.courses WHERE code = 'BAD104') 
    AND term_id = (SELECT id FROM public.terms WHERE code = 'SEM1-2024')
    AND section = 'A';
    
    -- BAD101 Section A - Intro to Business Admin
    INSERT INTO public.assessment_types (class_id, name, weight, max_score, due_date) VALUES
        (v_class_bad101_a, 'Quiz 1', 10, 100, '2024-09-15 23:59:00+08'),
        (v_class_bad101_a, 'Quiz 2', 10, 100, '2024-10-15 23:59:00+08'),
        (v_class_bad101_a, 'Midterm Exam', 25, 100, '2024-10-30 23:59:00+08'),
        (v_class_bad101_a, 'Case Study Analysis', 15, 100, '2024-11-15 23:59:00+08'),
        (v_class_bad101_a, 'Group Project', 15, 100, '2024-11-30 23:59:00+08'),
        (v_class_bad101_a, 'Final Exam', 25, 100, '2024-12-10 23:59:00+08')
    ON CONFLICT DO NOTHING;
    
    -- BAD101 Section B (same assessments)
    INSERT INTO public.assessment_types (class_id, name, weight, max_score, due_date) VALUES
        (v_class_bad101_b, 'Quiz 1', 10, 100, '2024-09-15 23:59:00+08'),
        (v_class_bad101_b, 'Quiz 2', 10, 100, '2024-10-15 23:59:00+08'),
        (v_class_bad101_b, 'Midterm Exam', 25, 100, '2024-10-30 23:59:00+08'),
        (v_class_bad101_b, 'Case Study Analysis', 15, 100, '2024-11-15 23:59:00+08'),
        (v_class_bad101_b, 'Group Project', 15, 100, '2024-11-30 23:59:00+08'),
        (v_class_bad101_b, 'Final Exam', 25, 100, '2024-12-10 23:59:00+08')
    ON CONFLICT DO NOTHING;
    
    -- BAD103 Section A - Principles of Marketing
    INSERT INTO public.assessment_types (class_id, name, weight, max_score, due_date) VALUES
        (v_class_bad103_a, 'Quiz 1', 10, 100, '2024-09-10 23:59:00+08'),
        (v_class_bad103_a, 'Marketing Plan Part 1', 15, 100, '2024-10-01 23:59:00+08'),
        (v_class_bad103_a, 'Midterm Exam', 25, 100, '2024-10-25 23:59:00+08'),
        (v_class_bad103_a, 'Marketing Plan Part 2', 20, 100, '2024-11-20 23:59:00+08'),
        (v_class_bad103_a, 'Final Exam', 30, 100, '2024-12-08 23:59:00+08')
    ON CONFLICT DO NOTHING;
    
    -- BAD104 Section A - Financial Accounting I
    INSERT INTO public.assessment_types (class_id, name, weight, max_score, due_date) VALUES
        (v_class_bad104_a, 'Homework 1', 5, 100, '2024-09-05 23:59:00+08'),
        (v_class_bad104_a, 'Homework 2', 5, 100, '2024-09-19 23:59:00+08'),
        (v_class_bad104_a, 'Quiz 1', 10, 100, '2024-09-26 23:59:00+08'),
        (v_class_bad104_a, 'Midterm Exam', 25, 100, '2024-10-28 23:59:00+08'),
        (v_class_bad104_a, 'Quiz 2', 10, 100, '2024-11-11 23:59:00+08'),
        (v_class_bad104_a, 'Comprehensive Problem', 15, 100, '2024-11-25 23:59:00+08'),
        (v_class_bad104_a, 'Final Exam', 30, 100, '2024-12-12 23:59:00+08')
    ON CONFLICT DO NOTHING;
END $$;
*/

-- ============================================================================
-- SAMPLE ENROLLMENTS (run after classes and students exist)
-- ============================================================================

/*
-- Enroll first year students in BAD101 Section A
INSERT INTO public.enrollments (student_id, class_id, status)
SELECT s.id, c.id, 'enrolled'::enrollment_status
FROM public.students s
CROSS JOIN public.classes c
JOIN public.courses cr ON cr.id = c.course_id
JOIN public.terms t ON t.id = c.term_id
WHERE s.year_level = 1
AND cr.code = 'BAD101'
AND t.code = 'SEM1-2024'
AND c.section = 'A'
AND s.student_number IN ('2024-00001', '2024-00002', '2024-00003', '2024-00004', '2024-00005')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Enroll second year students in BAD201 Section A
INSERT INTO public.enrollments (student_id, class_id, status)
SELECT s.id, c.id, 'enrolled'::enrollment_status
FROM public.students s
CROSS JOIN public.classes c
JOIN public.courses cr ON cr.id = c.course_id
JOIN public.terms t ON t.id = c.term_id
WHERE s.year_level = 2
AND cr.code = 'BAD201'
AND t.code = 'SEM1-2024'
AND c.section = 'A'
ON CONFLICT (student_id, class_id) DO NOTHING;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify seed data:
/*
-- Check terms
SELECT code, label, starts_at, ends_at, is_active FROM public.terms ORDER BY starts_at;

-- Check courses
SELECT code, title, units, department FROM public.courses ORDER BY code;

-- Check classes with professor names
SELECT 
    cl.section,
    c.code AS course_code,
    c.title AS course_title,
    t.label AS term,
    p.full_name AS professor,
    cl.max_students
FROM public.classes cl
JOIN public.courses c ON c.id = cl.course_id
JOIN public.terms t ON t.id = cl.term_id
JOIN public.profiles p ON p.id = cl.professor_id
ORDER BY t.starts_at, c.code, cl.section;

-- Check assessment weight totals per class
SELECT * FROM public.class_assessment_weights ORDER BY class_id;

-- Check students
SELECT student_number, full_name, program, year_level FROM public.students ORDER BY year_level, student_number;

-- Check enrollments
SELECT 
    e.id,
    s.student_number,
    s.full_name,
    c.code AS course,
    cl.section,
    e.status,
    e.final_grade
FROM public.enrollments e
JOIN public.students s ON s.id = e.student_id
JOIN public.classes cl ON cl.id = e.class_id
JOIN public.courses c ON c.id = cl.course_id
ORDER BY s.year_level, s.student_number, c.code;
*/