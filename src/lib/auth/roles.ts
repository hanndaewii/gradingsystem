/**
 * Role-Based Access Control System for CWPC BAD Grading System
 * Defines roles, permissions matrix, and helper functions
 */

import type { Database } from '@/lib/supabase/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  INSTRUCTOR: 'instructor' as UserRole,
  REVIEWER: 'reviewer' as UserRole,
  STUDENT: 'student' as UserRole,
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  instructor: 'Instructor',
  reviewer: 'Reviewer',
  student: 'Student',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system access including user management, institution settings, and all grading operations',
  instructor: 'Create and manage assessments, grade submissions, view analytics for assigned courses',
  reviewer: 'Review and validate grades, provide feedback on submissions, access assigned assessments',
  student: 'Submit work, view grades and feedback, access published assessments',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  instructor: 3,
  reviewer: 2,
  student: 1,
};

export const ALL_ROLES: UserRole[] = [
  ROLES.ADMIN,
  ROLES.INSTRUCTOR,
  ROLES.REVIEWER,
  ROLES.STUDENT,
];

export function isValidRole(role: string): role is UserRole {
  return ALL_ROLES.includes(role as UserRole);
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role];
}

export function getHigherRoles(role: UserRole): UserRole[] {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level);
}

export function getLowerRoles(role: UserRole): UserRole[] {
  const level = ROLE_HIERARCHY[role];
  return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] < level);
}

export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  // Admin can manage all roles
  if (managerRole === ROLES.ADMIN) return true;
  // Instructor can manage reviewers and students
  if (managerRole === ROLES.INSTRUCTOR) {
    return targetRole === ROLES.REVIEWER || targetRole === ROLES.STUDENT;
  }
  // Reviewer can manage students
  if (managerRole === ROLES.REVIEWER) {
    return targetRole === ROLES.STUDENT;
  }
  return false;
}

export function getDefaultRedirectPath(role: UserRole): string {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.INSTRUCTOR:
      return '/dashboard';
    case ROLES.REVIEWER:
      return '/review';
    case ROLES.STUDENT:
      return '/assignments';
    default:
      return '/dashboard';
  }
}