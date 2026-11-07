-- 003_functions_triggers.sql
-- CWPC BAD Electronic Grading System - Database Functions and Triggers
-- Run after 001_initial_schema.sql and 002_rls_policies.sql

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_terms_updated_at
    BEFORE UPDATE ON public.terms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_assessment_types_updated_at
    BEFORE UPDATE ON public.assessment_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_grade_components_updated_at
    BEFORE UPDATE ON public.grade_components
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMPUTE FINAL GRADE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_final_grade(enrollment_uuid UUID)
RETURNS NUMERIC(4,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_weighted NUMERIC(6,2);
    total_weight NUMERIC(5,2);
    final_grade NUMERIC(4,2);
BEGIN
    -- Sum all weighted scores for this enrollment
    SELECT COALESCE(SUM(gc.weighted_score), 0)
    INTO total_weighted
    FROM public.grade_components gc
    WHERE gc.enrollment_id = enrollment_uuid
    AND gc.status = 'graded';

    -- Get total weight of all assessments for the class
    SELECT COALESCE(SUM(at.weight), 0)
    INTO total_weight
    FROM public.assessment_types at
    JOIN public.enrollments e ON e.class_id = at.class_id
    WHERE e.id = enrollment_uuid;

    -- Calculate final grade as percentage
    IF total_weight > 0 THEN
        final_grade := ROUND((total_weighted / total_weight) * 100, 2);
    ELSE
        final_grade := NULL;
    END IF;

    RETURN final_grade;
END;
$$;

-- Function to update enrollment final_grade
CREATE OR REPLACE FUNCTION public.update_enrollment_final_grade(enrollment_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_grade NUMERIC(4,2);
BEGIN
    new_grade := public.compute_final_grade(enrollment_uuid);
    
    UPDATE public.enrollments
    SET final_grade = new_grade,
        updated_at = NOW()
    WHERE id = enrollment_uuid;
END;
$$;

-- ============================================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
    v_entity_type TEXT := TG_TABLE_NAME;
    v_entity_id UUID;
BEGIN
    -- Get current user ID (actor)
    v_actor_id := auth.uid();
    
    -- Determine entity ID based on table
    CASE TG_TABLE_NAME
        WHEN 'profiles' THEN v_entity_id := NEW.id;
        WHEN 'terms' THEN v_entity_id := NEW.id;
        WHEN 'courses' THEN v_entity_id := NEW.id;
        WHEN 'classes' THEN v_entity_id := NEW.id;
        WHEN 'students' THEN v_entity_id := NEW.id;
        WHEN 'enrollments' THEN v_entity_id := NEW.id;
        WHEN 'assessment_types' THEN v_entity_id := NEW.id;
        WHEN 'grade_components' THEN v_entity_id := NEW.id;
        ELSE v_entity_id := gen_random_uuid();
    END CASE;

    -- Prepare old and new data
    IF TG_OP = 'INSERT' THEN
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
        v_entity_id := OLD.id;
    END IF;

    -- Remove sensitive fields from audit log
    IF v_new_data IS NOT NULL THEN
        v_new_data := v_new_data - 'password_hash' - 'password' - 'secret' - 'token';
    END IF;
    IF v_old_data IS NOT NULL THEN
        v_old_data := v_old_data - 'password_hash' - 'password' - 'secret' - 'token';
    END IF;

    -- Insert audit log
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (v_actor_id, TG_OP, v_entity_type, v_entity_id, v_old_data, v_new_data);

    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

-- Apply audit triggers to all tables
CREATE TRIGGER trigger_audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_terms
    AFTER INSERT OR UPDATE OR DELETE ON public.terms
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_courses
    AFTER INSERT OR UPDATE OR DELETE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_classes
    AFTER INSERT OR UPDATE OR DELETE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_students
    AFTER INSERT OR UPDATE OR DELETE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_enrollments
    AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_assessment_types
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_types
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER trigger_audit_grade_components
    AFTER INSERT OR UPDATE OR DELETE ON public.grade_components
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- GRADING SCALE VALIDATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_grading_scale(scale JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_min NUMERIC;
    v_max NUMERIC;
    v_prev_max NUMERIC := -1;
    v_has_passing BOOLEAN := FALSE;
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(scale) != 'array' THEN
        RAISE EXCEPTION 'Grading scale must be a JSON array';
    END IF;

    -- Validate each grade entry
    FOR v_item IN SELECT * FROM jsonb_array_elements(scale)
    LOOP
        -- Check required fields
        IF NOT (v_item ? 'min' AND v_item ? 'max' AND v_item ? 'grade') THEN
            RAISE EXCEPTION 'Each grading scale entry must have min, max, and grade fields';
        END IF;

        v_min := (v_item->>'min')::NUMERIC;
        v_max := (v_item->>'max')::NUMERIC;

        -- Check min <= max
        IF v_min > v_max THEN
            RAISE EXCEPTION 'Invalid range: min (%) cannot be greater than max (%)';
        END IF;

        -- Check ranges don't overlap and are contiguous (optional but recommended)
        IF v_min <= v_prev_max THEN
            RAISE EXCEPTION 'Grading scale ranges must not overlap and should be in descending order';
        END IF;

        v_prev_max := v_max;

        -- Check for passing grade (3.00 or better in Philippine system)
        IF (v_item->>'grade') IN ('1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00') THEN
            v_has_passing := TRUE;
        END IF;
    END LOOP;

    -- Ensure we have at least a passing and failing grade
    IF NOT v_has_passing THEN
        RAISE EXCEPTION 'Grading scale must include at least one passing grade';
    END IF;

    RETURN TRUE;
END;
$$;

-- Trigger to validate grading_scale on terms insert/update
CREATE OR REPLACE FUNCTION public.validate_terms_grading_scale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.grading_scale IS NOT NULL THEN
        PERFORM public.validate_grading_scale(NEW.grading_scale);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_terms_grading_scale
    BEFORE INSERT OR UPDATE ON public.terms
    FOR EACH ROW EXECUTE FUNCTION public.validate_terms_grading_scale();

-- ============================================================================
-- ASSESSMENT WEIGHT SUM CHECK FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_assessment_weights(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_weight NUMERIC(5,2);
BEGIN
    SELECT COALESCE(SUM(weight), 0)
    INTO v_total_weight
    FROM public.assessment_types
    WHERE class_id = class_uuid;

    IF v_total_weight > 100 THEN
        RAISE EXCEPTION 'Total assessment weight for class % exceeds 100%% (current: %%%)', 
            class_uuid, v_total_weight;
    END IF;

    RETURN TRUE;
END;
$$;

-- Trigger to check assessment weights on insert/update
CREATE OR REPLACE FUNCTION public.validate_assessment_weights()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_assessment_weights(NEW.class_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_assessment_weights
    BEFORE INSERT OR UPDATE ON public.assessment_types
    FOR EACH ROW EXECUTE FUNCTION public.validate_assessment_weights();

-- ============================================================================
-- GRADE COMPONENT TRIGGERS (auto-update enrollment final_grade)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_final_grade_on_grade_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the enrollment's final_grade when grade_components change
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        PERFORM public.update_enrollment_final_grade(NEW.enrollment_id);
    END IF;
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

CREATE TRIGGER trigger_update_final_grade
    AFTER INSERT OR UPDATE OR DELETE ON public.grade_components
    FOR EACH ROW EXECUTE FUNCTION public.update_final_grade_on_grade_change();

-- ============================================================================
-- ENROLLMENT STATUS TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_enrollment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure dropped_at is set when status changes to dropped
    IF NEW.status = 'dropped' AND OLD.status != 'dropped' THEN
        NEW.dropped_at := NOW();
    ELSIF NEW.status != 'dropped' AND OLD.status = 'dropped' THEN
        NEW.dropped_at := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_enrollment_status
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.validate_enrollment_status();

-- ============================================================================
-- CLASS CAPACITY CHECK
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_class_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_max_students INTEGER;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.enrollments
        WHERE class_id = NEW.class_id AND status = 'enrolled';

        SELECT max_students INTO v_max_students
        FROM public.classes
        WHERE id = NEW.class_id;

        IF v_current_count >= v_max_students THEN
            RAISE EXCEPTION 'Class is full (max % students)', v_max_students;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_class_capacity
    BEFORE INSERT ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.check_class_capacity();

-- ============================================================================
-- PROFILE APPROVAL TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_profile_approval_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set approved_at when is_approved changes to TRUE
    IF NEW.is_approved = TRUE AND OLD.is_approved = FALSE THEN
        NEW.approved_at := NOW();
        NEW.approved_by := auth.uid();
    ELSIF NEW.is_approved = FALSE AND OLD.is_approved = TRUE THEN
        NEW.approved_at := NULL;
        NEW.approved_by := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_profile_approval
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_profile_approval_timestamp();

-- ============================================================================
-- GET LETTER GRADE FROM NUMERIC (Philippine System)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_letter_grade(numeric_grade NUMERIC, term_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scale JSONB;
    v_item JSONB;
    v_grade TEXT := '5.00'; -- Default to failed
BEGIN
    -- Get grading scale for term
    SELECT grading_scale INTO v_scale
    FROM public.terms
    WHERE id = term_uuid;

    IF v_scale IS NULL THEN
        RETURN '5.00';
    END IF;

    -- Find matching grade
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_scale)
    LOOP
        IF numeric_grade >= (v_item->>'min')::NUMERIC 
           AND numeric_grade <= (v_item->>'max')::NUMERIC THEN
            v_grade := v_item->>'grade';
            EXIT;
        END IF;
    END LOOP;

    RETURN v_grade;
END;
$$;

-- ============================================================================
-- HELPER: GET STUDENT ENROLLMENTS WITH GRADES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_grades(student_uuid UUID, term_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    enrollment_id UUID,
    class_id UUID,
    course_code TEXT,
    course_title TEXT,
    class_section TEXT,
    term_code TEXT,
    term_label TEXT,
    current_grade NUMERIC(4,2),
    final_grade NUMERIC(4,2),
    letter_grade TEXT,
    enrollment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        scg.enrollment_id,
        scg.class_id,
        scg.course_code,
        scg.course_title,
        scg.section AS class_section,
        scg.term_code,
        scg.term_label,
        scg.current_grade,
        scg.final_grade,
        public.get_letter_grade(
            COALESCE(scg.final_grade, scg.current_grade), 
            (SELECT id FROM public.terms WHERE code = scg.term_code LIMIT 1)
        ) AS letter_grade,
        scg.enrollment_status
    FROM public.student_current_grades scg
    WHERE scg.student_id = student_uuid
    AND (term_uuid IS NULL OR scg.term_code = (SELECT code FROM public.terms WHERE id = term_uuid))
    ORDER BY scg.term_code DESC, scg.course_code;
END;
$$;

-- ============================================================================
-- HELPER: GET PROFESSOR CLASS ROSTER WITH GRADES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_class_roster(class_uuid UUID)
RETURNS TABLE (
    enrollment_id UUID,
    student_id UUID,
    student_number TEXT,
    student_name TEXT,
    program TEXT,
    year_level INTEGER,
    current_grade NUMERIC(4,2),
    final_grade NUMERIC(4,2),
    letter_grade TEXT,
    enrollment_status TEXT,
    graded_count INTEGER,
    total_assessments INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        scg.enrollment_id,
        scg.student_id,
        scg.student_number,
        scg.student_name,
        s.program,
        s.year_level,
        scg.current_grade,
        scg.final_grade,
        public.get_letter_grade(
            COALESCE(scg.final_grade, scg.current_grade), 
            (SELECT term_id FROM public.classes WHERE id = class_uuid)
        ) AS letter_grade,
        scg.enrollment_status,
        scg.graded_count,
        scg.total_assessments
    FROM public.student_current_grades scg
    JOIN public.students s ON s.id = scg.student_id
    WHERE scg.class_id = class_uuid
    ORDER BY scg.student_name;
END;
$$;