// Database types generated from Supabase schema
// Run: supabase gen types typescript --local > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          employee_number: string
          full_name: string
          college_email: string
          role: 'admin' | 'staff' | 'professor' | 'student'
          department: string
          is_approved: boolean
          approved_by: string | null
          approved_at: string | null
          mfa_secret: string | null
          mfa_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          employee_number: string
          full_name: string
          college_email: string
          role?: 'admin' | 'staff' | 'professor' | 'student'
          department?: string
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          mfa_secret?: string | null
          mfa_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_number?: string
          full_name?: string
          college_email?: string
          role?: 'admin' | 'staff' | 'professor' | 'student'
          department?: string
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          mfa_secret?: string | null
          mfa_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      terms: {
        Row: {
          id: string
          code: string
          label: string
          starts_at: string
          ends_at: string
          grading_scale: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          label: string
          starts_at: string
          ends_at: string
          grading_scale: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          label?: string
          starts_at?: string
          ends_at?: string
          grading_scale?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          code: string
          title: string
          description: string | null
          units: number
          department: string
          prerequisites: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          title: string
          description?: string | null
          units?: number
          department?: string
          prerequisites?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string | null
          units?: number
          department?: string
          prerequisites?: string[] | null
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          course_id: string
          term_id: string
          professor_id: string
          section: string
          schedule: Json | null
          max_students: number
          status: 'active' | 'cancelled' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          term_id: string
          professor_id: string
          section: string
          schedule?: Json | null
          max_students?: number
          status?: 'active' | 'cancelled' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          term_id?: string
          professor_id?: string
          section?: string
          schedule?: Json | null
          max_students?: number
          status?: 'active' | 'cancelled' | 'completed'
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          student_number: string
          full_name: string
          program: string
          year_level: number
          college_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_number: string
          full_name: string
          program: string
          year_level: number
          college_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_number?: string
          full_name?: string
          program?: string
          year_level?: number
          college_email?: string | null
          created_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          class_id: string
          status: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
          enrolled_at: string
          dropped_at: string | null
          final_grade: number | null
        }
        Insert: {
          id?: string
          student_id: string
          class_id: string
          status?: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
          enrolled_at?: string
          dropped_at?: string | null
          final_grade?: number | null
        }
        Update: {
          id?: string
          student_id?: string
          class_id?: string
          status?: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
          enrolled_at?: string
          dropped_at?: string | null
          final_grade?: number | null
        }
      }
      assessment_types: {
        Row: {
          id: string
          class_id: string
          name: string
          weight: number
          max_score: number
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          name: string
          weight: number
          max_score?: number
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          name?: string
          weight?: number
          max_score?: number
          due_date?: string | null
          created_at?: string
        }
      }
      grade_components: {
        Row: {
          id: string
          enrollment_id: string
          assessment_type_id: string
          raw_score: number | null
          weighted_score: number | null
          graded_at: string | null
          graded_by: string | null
          status: 'draft' | 'submitted' | 'finalized'
        }
        Insert: {
          id?: string
          enrollment_id: string
          assessment_type_id: string
          raw_score?: number | null
          weighted_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          status?: 'draft' | 'submitted' | 'finalized'
        }
        Update: {
          id?: string
          enrollment_id?: string
          assessment_type_id?: string
          raw_score?: number | null
          weighted_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          status?: 'draft' | 'submitted' | 'finalized'
        }
      }
      audit_logs: {
        Row: {
          id: number
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          subject: string
          body: string
          data: Json | null
          sent: boolean
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          subject: string
          body: string
          data?: Json | null
          sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          subject?: string
          body?: string
          data?: Json | null
          sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
      }
      scheduled_reports: {
        Row: {
          id: string
          name: string
          template: string
          frequency: 'daily' | 'weekly' | 'monthly' | 'term-end'
          recipients: string[]
          filters: Json
          format: 'pdf' | 'excel' | 'csv'
          enabled: boolean
          last_run: string | null
          next_run: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          template: string
          frequency: 'daily' | 'weekly' | 'monthly' | 'term-end'
          recipients: string[]
          filters: Json
          format: 'pdf' | 'excel' | 'csv'
          enabled?: boolean
          last_run?: string | null
          next_run?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          template?: string
          frequency?: 'daily' | 'weekly' | 'monthly' | 'term-end'
          recipients?: string[]
          filters?: Json
          format?: 'pdf' | 'excel' | 'csv'
          enabled?: boolean
          last_run?: string | null
          next_run?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      class_assessment_weights: {
        Row: {
          class_id: string
          total_weight: number
          assessment_count: number
        }
      }
      student_current_grades: {
        Row: {
          student_id: string
          enrollment_id: string
          class_id: string
          course_code: string
          course_title: string
          section: string
          term_code: string
          term_label: string
          final_grade: number | null
          professor_name: string
        }
      }
    }
    Functions: {
      compute_final_grade: {
        Args: { p_enrollment_id: string }
        Returns: number
      }
      get_letter_grade: {
        Args: { p_numeric_grade: number; p_grading_scale: Json }
        Returns: string
      }
      get_student_grades: {
        Args: { p_student_id: string; p_term_id?: string }
        Returns: Json
      }
      get_class_roster: {
        Args: { p_class_id: string }
        Returns: Json
      }
    }
    Enums: {
      user_role: 'admin' | 'staff' | 'professor' | 'student'
      enrollment_status: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
      grade_status: 'draft' | 'submitted' | 'finalized'
    }
  }
}