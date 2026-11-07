/**
 * React Hooks for Authentication and Authorization
 * Provides type-safe access to auth state, profile, permissions, and roles
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from './roles';
import { ROLES, type UserRole as UserRoleType } from './roles';
import type { Permission } from './permissions';
import { hasPermission, hasAnyPermission, hasAllPermissions, getPermissionsForRole, PERMISSIONS } from './permissions';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }

    return profile;
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const profile = await fetchProfile(user.id);
      setState({
        user: { id: user.id, email: user.email || '' },
        profile,
        loading: false,
        error: null,
      });
    } else {
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
          setState({
            user: { id: session.user.id, email: session.user.email || '' },
            profile,
            loading: false,
            error: null,
          });
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: { id: session.user.id, email: session.user.email || '' },
          profile,
          loading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
      return { error };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
      return { error };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      profile: null,
      loading: false,
      error: null,
    });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
    }
  };

  const value = useMemo(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    isAuthenticated: !!state.user,
  }), [state, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth();
  return { profile, loading, refreshProfile };
}

export function useRole() {
  const { profile, loading } = useAuth();
  const role = profile?.role as UserRole | null;
  return {
    role,
    loading,
    isAdmin: role === ROLES.ADMIN,
    isInstructor: role === ROLES.INSTRUCTOR,
    isReviewer: role === ROLES.REVIEWER,
    isStudent: role === ROLES.STUDENT,
    isInstructorOrAbove: role === ROLES.ADMIN || role === ROLES.INSTRUCTOR,
    isReviewerOrAbove: role === ROLES.ADMIN || role === ROLES.INSTRUCTOR || role === ROLES.REVIEWER,
  };
}

export function usePermissions() {
  const { role } = useRole();
  const permissions = useMemo(() => role ? getPermissionsForRole(role) : [], [role]);

  const can = useCallback((permission: Permission) => {
    if (!role) return false;
    return hasPermission(role, permission);
  }, [role]);

  const canAny = useCallback((permissionsToCheck: Permission[]) => {
    if (!role) return false;
    return hasAnyPermission(role, permissionsToCheck);
  }, [role]);

  const canAll = useCallback((permissionsToCheck: Permission[]) => {
    if (!role) return false;
    return hasAllPermissions(role, permissionsToCheck);
  }, [role]);

  return {
    permissions,
    can,
    canAny,
    canAll,
    role,
  };
}

/**
 * Hook for checking specific resource access
 */
export function useResourceAccess() {
  const { profile } = useAuth();
  const { can, canAny, canAll } = usePermissions();

  const canAccessProfile = useCallback((targetUserId: string) => {
    if (!profile) return false;
    // Users can access their own profile
    if (profile.id === targetUserId) return true;
    // Admins and instructors can access other profiles
    return can(PERMISSIONS.USER_PROFILE_READ);
  }, [profile, can]);

  const canAccessAssessment = useCallback((assessmentCreatorId: string) => {
    if (!profile) return false;
    // Creators can access their own assessments
    if (profile.id === assessmentCreatorId) return true;
    // Admins and instructors can access all
    return can(PERMISSIONS.ASSESSMENT_READ);
  }, [profile, can]);

  const canGradeSubmission = useCallback((submissionId: string) => {
    if (!profile) return false;
    return can(PERMISSIONS.GRADING_WRITE);
  }, [profile, can]);

  const canReviewGrade = useCallback(() => {
    if (!profile) return false;
    return can(PERMISSIONS.GRADING_REVIEW);
  }, [profile, can]);

  const canManageUser = useCallback((targetRole: UserRole) => {
    if (!profile) return false;
    const userRole = profile.role as UserRole;
    // Import canManageRole dynamically to avoid circular dependency
    return can(PERMISSIONS.USER_ROLE_WRITE);
  }, [profile, can]);

  return {
    canAccessProfile,
    canAccessAssessment,
    canGradeSubmission,
    canReviewGrade,
    canManageUser,
  };
}