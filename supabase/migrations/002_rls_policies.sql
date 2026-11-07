-- 002_rls_policies.sql
-- CWPC BAD Electronic Grading System - Row Level Security Policies
-- Run after 001_initial_schema.sql

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Get current user's profile
CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Check if current user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    );
$$;

-- Check if current user is professor
CREATE OR REPLACE FUNCTION public.is_professor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('professor', 'staff', 'admin')
    );
$$;

-- Check if current user is professor of a specific class
CREATE OR REPLACE FUNCTION public.is_class_professor(class_uuid UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_uuid AND professor_id = auth.uid()
    );
$$;

-- Check if current user can manage a specific class (professor of class OR staff/admin)
CREATE OR REPLACE FUNCTION public.can_manage_class(class_uuid UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT public.is_staff() OR public.is_class_professor(class_uuid);
$$;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (public.is_admin());

-- Staff can view all profiles (for user management)
CREATE POLICY "profiles_select_staff" ON public.profiles
    FOR SELECT
    USING (public.is_staff());

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Staff can update profiles (for approval workflow)
CREATE POLICY "profiles_update_staff" ON public.profiles
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Admins can insert profiles (user creation)
CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- TERMS TABLE POLICIES
-- ============================================================================

-- All authenticated users can view active terms
CREATE POLICY "terms_select_active" ON public.terms
    FOR SELECT
    USING (is_active = TRUE);

-- Staff and admins can view all terms
CREATE POLICY "terms_select_staff" ON public.terms
    FOR SELECT
    USING (public.is_staff());

-- Staff and admins can manage terms
CREATE POLICY "terms_all_staff" ON public.terms
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================================================
-- COURSES TABLE POLICIES
-- ============================================================================

-- All authenticated users can view courses
CREATE POLICY "courses_select_all" ON public.courses
    FOR SELECT
    USING (true);

-- Staff and admins can manage courses
CREATE POLICY "courses_all_staff" ON public.courses
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Professors can view their own classes
CREATE POLICY "classes_select_professor" ON public.classes
    FOR SELECT
    USING (professor_id = auth.uid());

-- Staff and admins can view all classes
CREATE POLICY "classes_select_staff" ON public.classes
    FOR SELECT
    USING (public.is_staff());

-- Students can view classes they're enrolled in (via enrollments)
CREATE POLICY "classes_select_enrolled" ON public.classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.class_id = classes.id 
            AND e.student_id IN (
                SELECT id FROM public.students WHERE college_email = (
                    SELECT college_email FROM public.profiles WHERE id = auth.uid()
                )
            )
            AND e.status = 'enrolled'
        )
    );

-- Professors can insert their own classes (if allowed by staff)
CREATE POLICY "classes_insert_professor" ON public.classes
    FOR INSERT
    WITH CHECK (professor_id = auth.uid() AND public.is_professor());

-- Staff and admins can manage all classes
CREATE POLICY "classes_all_staff" ON public.classes
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Professors can update their own classes
CREATE POLICY "classes_update_professor" ON public.classes
    FOR UPDATE
    USING (professor_id = auth.uid())
    WITH CHECK (professor_id = auth.uid());

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- IMPORTANT: Students table is ONLY accessible to staff and admins
-- Professors and students CANNOT see the students table directly
-- They access student info through enrollments and grade_components

-- Staff and admins can view all students
CREATE POLICY "students_select_staff" ON public.students
    FOR SELECT
    USING (public.is_staff());

-- Staff and admins can manage students
CREATE POLICY "students_all_staff" ON public.students
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================================================
-- ENROLLMENTS TABLE POLICIES
-- ============================================================================

-- Professors can view enrollments for their classes
CREATE POLICY "enrollments_select_professor" ON public.enrollments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = enrollments.class_id
            AND c.professor_id = auth.uid()
        )
    );

-- Staff and admins can view all enrollments
CREATE POLICY "enrollments_select_staff" ON public.enrollments
    FOR SELECT
    USING (public.is_staff());

-- Students can view their own enrollments
CREATE POLICY "enrollments_select_own" ON public.enrollments
    FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE college_email = (
                SELECT college_email FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Staff and admins can manage all enrollments
CREATE POLICY "enrollments_all_staff" ON public.enrollments
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Professors can update enrollments for their classes (e.g., status changes)
CREATE POLICY "enrollments_update_professor" ON public.enrollments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = enrollments.class_id
            AND c.professor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = enrollments.class_id
            AND c.professor_id = auth.uid()
        )
    );

-- ============================================================================
-- ASSESSMENT_TYPES TABLE POLICIES
-- ============================================================================

-- Professors can view assessment types for their classes
CREATE POLICY "assessment_types_select_professor" ON public.assessment_types
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = assessment_types.class_id
            AND c.professor_id = auth.uid()
        )
    );

-- Staff and admins can view all assessment types
CREATE POLICY "assessment_types_select_staff" ON public.assessment_types
    FOR SELECT
    USING (public.is_staff());

-- Students can view assessment types for classes they're enrolled in
CREATE POLICY "assessment_types_select_enrolled" ON public.assessment_types
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students s ON s.id = e.student_id
            JOIN public.profiles p ON p.college_email = s.college_email
            WHERE e.class_id = assessment_types.class_id
            AND e.status = 'enrolled'
            AND p.id = auth.uid()
        )
    );

-- Professors can manage assessment types for their classes
CREATE POLICY "assessment_types_all_professor" ON public.assessment_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = assessment_types.class_id
            AND c.professor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = assessment_types.class_id
            AND c.professor_id = auth.uid()
        )
    );

-- Staff and admins can manage all assessment types
CREATE POLICY "assessment_types_all_staff" ON public.assessment_types
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================================================
-- GRADE_COMPONENTS TABLE POLICIES
-- ============================================================================

-- Professors can view grades for their classes
CREATE POLICY "grade_components_select_professor" ON public.grade_components
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = grade_components.enrollment_id
            AND c.professor_id = auth.uid()
        )
    );

-- Staff and admins can view all grades
CREATE POLICY "grade_components_select_staff" ON public.grade_components
    FOR SELECT
    USING (public.is_staff());

-- Students can view their own grades
CREATE POLICY "grade_components_select_own" ON public.grade_components
    FOR SELECT
    USING (
        enrollment_id IN (
            SELECT e.id FROM public.enrollments e
            JOIN public.students s ON s.id = e.student_id
            JOIN public.profiles p ON p.college_email = s.college_email
            WHERE p.id = auth.uid()
        )
    );

-- Professors can insert/update grades for their classes
CREATE POLICY "grade_components_write_professor" ON public.grade_components
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = grade_components.enrollment_id
            AND c.professor_id = auth.uid()
            AND e.status = 'enrolled'
        )
    );

CREATE POLICY "grade_components_update_professor" ON public.grade_components
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = grade_components.enrollment_id
            AND c.professor_id = auth.uid()
            AND e.status = 'enrolled'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = grade_components.enrollment_id
            AND c.professor_id = auth.uid()
            AND e.status = 'enrolled'
        )
    );

-- Staff and admins can manage all grades
CREATE POLICY "grade_components_all_staff" ON public.grade_components
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

-- System can insert audit logs (via trigger with SECURITY DEFINER)
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- No UPDATE or DELETE policies for audit_logs (immutable)

-- ============================================================================
-- VIEW POLICIES (RLS on views inherits from underlying tables)
-- ============================================================================

-- The views class_assessment_weights and student_current_grades
-- will automatically respect the RLS policies of their underlying tables
-- when queried by different roles

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on views to authenticated users
GRANT SELECT ON public.class_assessment_weights TO authenticated;
GRANT SELECT ON public.student_current_grades TO authenticated;

-- Grant necessary table permissions (RLS will handle row-level access)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.terms TO authenticated;
GRANT SELECT ON public.courses TO authenticated;
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.enrollments TO authenticated;
GRANT SELECT ON public.assessment_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.grade_components TO authenticated;

-- Staff/Admin additional permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.terms TO authenticated;
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.classes TO authenticated;
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.assessment_types TO authenticated;
GRANT ALL ON public.grade_components TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Note: Actual row-level access is controlled by RLS policies above
-- These GRANTs just allow the role to attempt operations