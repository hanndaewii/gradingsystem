/**
 * Permission Definitions and Role-Permission Mapping
 * Centralized permission system for CWPC BAD Grading System
 */

import type { UserRole } from './roles';
import { ROLES } from './roles';

/**
 * Permission Categories
 */
export const PERMISSION_CATEGORIES = {
  SYSTEM: 'system',
  INSTITUTION: 'institution',
  USER_MANAGEMENT: 'user_management',
  ASSESSMENT: 'assessment',
  RUBRIC: 'rubric',
  SUBMISSION: 'submission',
  GRADING: 'grading',
  REPORTING: 'reporting',
  AUDIT: 'audit',
} as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];

/**
 * Individual Permissions
 * Format: {category}:{action}:{resource}
 */
export const PERMISSIONS = {
  // System permissions
  SYSTEM_CONFIG_READ: 'system:read:config',
  SYSTEM_CONFIG_WRITE: 'system:write:config',
  SYSTEM_HEALTH_READ: 'system:read:health',
  SYSTEM_LOGS_READ: 'system:read:logs',

  // Institution permissions
  INSTITUTION_READ: 'institution:read',
  INSTITUTION_WRITE: 'institution:write',
  INSTITUTION_DELETE: 'institution:delete',
  INSTITUTION_SETTINGS_READ: 'institution:read:settings',
  INSTITUTION_SETTINGS_WRITE: 'institution:write:settings',
  INSTITUTION_MEMBERS_READ: 'institution:read:members',
  INSTITUTION_MEMBERS_WRITE: 'institution:write:members',
  INSTITUTION_INVITE: 'institution:invite',

  // User management permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_ROLE_READ: 'user:read:role',
  USER_ROLE_WRITE: 'user:write:role',
  USER_APPROVE: 'user:approve',
  USER_SUSPEND: 'user:suspend',
  USER_PROFILE_READ: 'user:read:profile',
  USER_PROFILE_WRITE: 'user:write:profile',
  USER_MFA_READ: 'user:read:mfa',
  USER_MFA_WRITE: 'user:write:mfa',

  // Assessment permissions
  ASSESSMENT_READ: 'assessment:read',
  ASSESSMENT_WRITE: 'assessment:write',
  ASSESSMENT_DELETE: 'assessment:delete',
  ASSESSMENT_PUBLISH: 'assessment:publish',
  ASSESSMENT_ARCHIVE: 'assessment:archive',
  ASSESSMENT_DUPLICATE: 'assessment:duplicate',
  ASSESSMENT_SETTINGS_READ: 'assessment:read:settings',
  ASSESSMENT_SETTINGS_WRITE: 'assessment:write:settings',

  // Rubric permissions
  RUBRIC_READ: 'rubric:read',
  RUBRIC_WRITE: 'rubric:write',
  RUBRIC_DELETE: 'rubric:delete',
  RUBRIC_TEMPLATE_READ: 'rubric:read:template',
  RUBRIC_TEMPLATE_WRITE: 'rubric:write:template',
  RUBRIC_VERSION_READ: 'rubric:read:version',
  RUBRIC_VERSION_WRITE: 'rubric:write:version',

  // Submission permissions
  SUBMISSION_READ: 'submission:read',
  SUBMISSION_WRITE: 'submission:write',
  SUBMISSION_DELETE: 'submission:delete',
  SUBMISSION_SUBMIT: 'submission:submit',
  SUBMISSION_WITHDRAW: 'submission:withdraw',
  SUBMISSION_FILE_READ: 'submission:read:file',
  SUBMISSION_FILE_WRITE: 'submission:write:file',
  SUBMISSION_OWN_READ: 'submission:read:own',
  SUBMISSION_OWN_WRITE: 'submission:write:own',

  // Grading permissions
  GRADING_READ: 'grading:read',
  GRADING_WRITE: 'grading:write',
  GRADING_DELETE: 'grading:delete',
  GRADING_ASSIGN: 'grading:assign',
  GRADING_REVIEW: 'grading:review',
  GRADING_OVERRIDE: 'grading:override',
  GRADING_BULK: 'grading:bulk',
  GRADING_FEEDBACK_READ: 'grading:read:feedback',
  GRADING_FEEDBACK_WRITE: 'grading:write:feedback',

  // Reporting permissions
  REPORTING_READ: 'reporting:read',
  REPORTING_WRITE: 'reporting:write',
  REPORTING_EXPORT: 'reporting:export',
  REPORTING_ANALYTICS_READ: 'reporting:read:analytics',
  REPORTING_DASHBOARD_READ: 'reporting:read:dashboard',

  // Audit permissions
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * All permissions as array for iteration
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/**
 * Role-Permission Mapping
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [ROLES.ADMIN]: [
    // System - full access
    PERMISSIONS.SYSTEM_CONFIG_READ,
    PERMISSIONS.SYSTEM_CONFIG_WRITE,
    PERMISSIONS.SYSTEM_HEALTH_READ,
    PERMISSIONS.SYSTEM_LOGS_READ,

    // Institution - full access
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.INSTITUTION_WRITE,
    PERMISSIONS.INSTITUTION_DELETE,
    PERMISSIONS.INSTITUTION_SETTINGS_READ,
    PERMISSIONS.INSTITUTION_SETTINGS_WRITE,
    PERMISSIONS.INSTITUTION_MEMBERS_READ,
    PERMISSIONS.INSTITUTION_MEMBERS_WRITE,
    PERMISSIONS.INSTITUTION_INVITE,

    // User management - full access
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_ROLE_READ,
    PERMISSIONS.USER_ROLE_WRITE,
    PERMISSIONS.USER_APPROVE,
    PERMISSIONS.USER_SUSPEND,
    PERMISSIONS.USER_PROFILE_READ,
    PERMISSIONS.USER_PROFILE_WRITE,
    PERMISSIONS.USER_MFA_READ,
    PERMISSIONS.USER_MFA_WRITE,

    // Assessment - full access
    PERMISSIONS.ASSESSMENT_READ,
    PERMISSIONS.ASSESSMENT_WRITE,
    PERMISSIONS.ASSESSMENT_DELETE,
    PERMISSIONS.ASSESSMENT_PUBLISH,
    PERMISSIONS.ASSESSMENT_ARCHIVE,
    PERMISSIONS.ASSESSMENT_DUPLICATE,
    PERMISSIONS.ASSESSMENT_SETTINGS_READ,
    PERMISSIONS.ASSESSMENT_SETTINGS_WRITE,

    // Rubric - full access
    PERMISSIONS.RUBRIC_READ,
    PERMISSIONS.RUBRIC_WRITE,
    PERMISSIONS.RUBRIC_DELETE,
    PERMISSIONS.RUBRIC_TEMPLATE_READ,
    PERMISSIONS.RUBRIC_TEMPLATE_WRITE,
    PERMISSIONS.RUBRIC_VERSION_READ,
    PERMISSIONS.RUBRIC_VERSION_WRITE,

    // Submission - full access
    PERMISSIONS.SUBMISSION_READ,
    PERMISSIONS.SUBMISSION_WRITE,
    PERMISSIONS.SUBMISSION_DELETE,
    PERMISSIONS.SUBMISSION_SUBMIT,
    PERMISSIONS.SUBMISSION_WITHDRAW,
    PERMISSIONS.SUBMISSION_FILE_READ,
    PERMISSIONS.SUBMISSION_FILE_WRITE,
    PERMISSIONS.SUBMISSION_OWN_READ,
    PERMISSIONS.SUBMISSION_OWN_WRITE,

    // Grading - full access
    PERMISSIONS.GRADING_READ,
    PERMISSIONS.GRADING_WRITE,
    PERMISSIONS.GRADING_DELETE,
    PERMISSIONS.GRADING_ASSIGN,
    PERMISSIONS.GRADING_REVIEW,
    PERMISSIONS.GRADING_OVERRIDE,
    PERMISSIONS.GRADING_BULK,
    PERMISSIONS.GRADING_FEEDBACK_READ,
    PERMISSIONS.GRADING_FEEDBACK_WRITE,

    // Reporting - full access
    PERMISSIONS.REPORTING_READ,
    PERMISSIONS.REPORTING_WRITE,
    PERMISSIONS.REPORTING_EXPORT,
    PERMISSIONS.REPORTING_ANALYTICS_READ,
    PERMISSIONS.REPORTING_DASHBOARD_READ,

    // Audit - full access
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AUDIT_EXPORT,
  ],

  [ROLES.INSTRUCTOR]: [
    // Institution - read own
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.INSTITUTION_SETTINGS_READ,
    PERMISSIONS.INSTITUTION_MEMBERS_READ,
    PERMISSIONS.INSTITUTION_INVITE,

    // User management - limited
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_PROFILE_READ,
    PERMISSIONS.USER_PROFILE_WRITE,

    // Assessment - full access to own
    PERMISSIONS.ASSESSMENT_READ,
    PERMISSIONS.ASSESSMENT_WRITE,
    PERMISSIONS.ASSESSMENT_DELETE,
    PERMISSIONS.ASSESSMENT_PUBLISH,
    PERMISSIONS.ASSESSMENT_ARCHIVE,
    PERMISSIONS.ASSESSMENT_DUPLICATE,
    PERMISSIONS.ASSESSMENT_SETTINGS_READ,
    PERMISSIONS.ASSESSMENT_SETTINGS_WRITE,

    // Rubric - full access to own
    PERMISSIONS.RUBRIC_READ,
    PERMISSIONS.RUBRIC_WRITE,
    PERMISSIONS.RUBRIC_DELETE,
    PERMISSIONS.RUBRIC_TEMPLATE_READ,
    PERMISSIONS.RUBRIC_TEMPLATE_WRITE,
    PERMISSIONS.RUBRIC_VERSION_READ,
    PERMISSIONS.RUBRIC_VERSION_WRITE,

    // Submission - read all, write own grading
    PERMISSIONS.SUBMISSION_READ,
    PERMISSIONS.SUBMISSION_FILE_READ,
    PERMISSIONS.SUBMISSION_OWN_READ,
    PERMISSIONS.SUBMISSION_OWN_WRITE,

    // Grading - full access to assigned
    PERMISSIONS.GRADING_READ,
    PERMISSIONS.GRADING_WRITE,
    PERMISSIONS.GRADING_ASSIGN,
    PERMISSIONS.GRADING_FEEDBACK_READ,
    PERMISSIONS.GRADING_FEEDBACK_WRITE,
    PERMISSIONS.GRADING_BULK,

    // Reporting - read own
    PERMISSIONS.REPORTING_READ,
    PERMISSIONS.REPORTING_EXPORT,
    PERMISSIONS.REPORTING_ANALYTICS_READ,
    PERMISSIONS.REPORTING_DASHBOARD_READ,

    // Audit - read own actions
    PERMISSIONS.AUDIT_READ,
  ],

  [ROLES.REVIEWER]: [
    // Institution - read only
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.INSTITUTION_SETTINGS_READ,
    PERMISSIONS.INSTITUTION_MEMBERS_READ,

    // User management - read only
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_PROFILE_READ,

    // Assessment - read assigned
    PERMISSIONS.ASSESSMENT_READ,
    PERMISSIONS.ASSESSMENT_SETTINGS_READ,

    // Rubric - read assigned
    PERMISSIONS.RUBRIC_READ,
    PERMISSIONS.RUBRIC_TEMPLATE_READ,
    PERMISSIONS.RUBRIC_VERSION_READ,

    // Submission - read assigned
    PERMISSIONS.SUBMISSION_READ,
    PERMISSIONS.SUBMISSION_FILE_READ,
    PERMISSIONS.SUBMISSION_OWN_READ,

    // Grading - review and feedback
    PERMISSIONS.GRADING_READ,
    PERMISSIONS.GRADING_REVIEW,
    PERMISSIONS.GRADING_FEEDBACK_READ,
    PERMISSIONS.GRADING_FEEDBACK_WRITE,

    // Reporting - read assigned
    PERMISSIONS.REPORTING_READ,
    PERMISSIONS.REPORTING_DASHBOARD_READ,

    // Audit - read own
    PERMISSIONS.AUDIT_READ,
  ],

  [ROLES.STUDENT]: [
    // Institution - read only
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.INSTITUTION_SETTINGS_READ,

    // User management - own profile only
    PERMISSIONS.USER_PROFILE_READ,
    PERMISSIONS.USER_PROFILE_WRITE,

    // Assessment - read published
    PERMISSIONS.ASSESSMENT_READ,
    PERMISSIONS.ASSESSMENT_SETTINGS_READ,

    // Rubric - read published
    PERMISSIONS.RUBRIC_READ,
    PERMISSIONS.RUBRIC_TEMPLATE_READ,

    // Submission - own submissions
    PERMISSIONS.SUBMISSION_OWN_READ,
    PERMISSIONS.SUBMISSION_OWN_WRITE,
    PERMISSIONS.SUBMISSION_SUBMIT,
    PERMISSIONS.SUBMISSION_WITHDRAW,
    PERMISSIONS.SUBMISSION_FILE_READ,
    PERMISSIONS.SUBMISSION_FILE_WRITE,

    // Grading - read own grades and feedback
    PERMISSIONS.GRADING_READ,
    PERMISSIONS.GRADING_FEEDBACK_READ,

    // Reporting - own reports
    PERMISSIONS.REPORTING_READ,
    PERMISSIONS.REPORTING_DASHBOARD_READ,
  ],
};

/**
 * Permission helpers
 */

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function getRolesWithPermission(permission: Permission): UserRole[] {
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([, perms]) => perms.includes(permission))
    .map(([role]) => role as UserRole);
}

export function getPermissionsByCategory(category: PermissionCategory): Permission[] {
  const prefix = `${category}:`;
  return ALL_PERMISSIONS.filter(p => p.startsWith(prefix));
}

export function getRolePermissionsByCategory(role: UserRole, category: PermissionCategory): Permission[] {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  const categoryPrefix = `${category}:`;
  return rolePerms.filter(p => p.startsWith(categoryPrefix));
}

/**
 * Permission groups for UI display
 */
export const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  system: {
    label: 'System Administration',
    permissions: [
      PERMISSIONS.SYSTEM_CONFIG_READ,
      PERMISSIONS.SYSTEM_CONFIG_WRITE,
      PERMISSIONS.SYSTEM_HEALTH_READ,
      PERMISSIONS.SYSTEM_LOGS_READ,
    ],
  },
  institution: {
    label: 'Institution Management',
    permissions: [
      PERMISSIONS.INSTITUTION_READ,
      PERMISSIONS.INSTITUTION_WRITE,
      PERMISSIONS.INSTITUTION_DELETE,
      PERMISSIONS.INSTITUTION_SETTINGS_READ,
      PERMISSIONS.INSTITUTION_SETTINGS_WRITE,
      PERMISSIONS.INSTITUTION_MEMBERS_READ,
      PERMISSIONS.INSTITUTION_MEMBERS_WRITE,
      PERMISSIONS.INSTITUTION_INVITE,
    ],
  },
  users: {
    label: 'User Management',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_WRITE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_ROLE_READ,
      PERMISSIONS.USER_ROLE_WRITE,
      PERMISSIONS.USER_APPROVE,
      PERMISSIONS.USER_SUSPEND,
      PERMISSIONS.USER_PROFILE_READ,
      PERMISSIONS.USER_PROFILE_WRITE,
      PERMISSIONS.USER_MFA_READ,
      PERMISSIONS.USER_MFA_WRITE,
    ],
  },
  assessments: {
    label: 'Assessments',
    permissions: [
      PERMISSIONS.ASSESSMENT_READ,
      PERMISSIONS.ASSESSMENT_WRITE,
      PERMISSIONS.ASSESSMENT_DELETE,
      PERMISSIONS.ASSESSMENT_PUBLISH,
      PERMISSIONS.ASSESSMENT_ARCHIVE,
      PERMISSIONS.ASSESSMENT_DUPLICATE,
      PERMISSIONS.ASSESSMENT_SETTINGS_READ,
      PERMISSIONS.ASSESSMENT_SETTINGS_WRITE,
    ],
  },
  rubrics: {
    label: 'Rubrics',
    permissions: [
      PERMISSIONS.RUBRIC_READ,
      PERMISSIONS.RUBRIC_WRITE,
      PERMISSIONS.RUBRIC_DELETE,
      PERMISSIONS.RUBRIC_TEMPLATE_READ,
      PERMISSIONS.RUBRIC_TEMPLATE_WRITE,
      PERMISSIONS.RUBRIC_VERSION_READ,
      PERMISSIONS.RUBRIC_VERSION_WRITE,
    ],
  },
  submissions: {
    label: 'Submissions',
    permissions: [
      PERMISSIONS.SUBMISSION_READ,
      PERMISSIONS.SUBMISSION_WRITE,
      PERMISSIONS.SUBMISSION_DELETE,
      PERMISSIONS.SUBMISSION_SUBMIT,
      PERMISSIONS.SUBMISSION_WITHDRAW,
      PERMISSIONS.SUBMISSION_FILE_READ,
      PERMISSIONS.SUBMISSION_FILE_WRITE,
      PERMISSIONS.SUBMISSION_OWN_READ,
      PERMISSIONS.SUBMISSION_OWN_WRITE,
    ],
  },
  grading: {
    label: 'Grading',
    permissions: [
      PERMISSIONS.GRADING_READ,
      PERMISSIONS.GRADING_WRITE,
      PERMISSIONS.GRADING_DELETE,
      PERMISSIONS.GRADING_ASSIGN,
      PERMISSIONS.GRADING_REVIEW,
      PERMISSIONS.GRADING_OVERRIDE,
      PERMISSIONS.GRADING_BULK,
      PERMISSIONS.GRADING_FEEDBACK_READ,
      PERMISSIONS.GRADING_FEEDBACK_WRITE,
    ],
  },
  reporting: {
    label: 'Reporting & Analytics',
    permissions: [
      PERMISSIONS.REPORTING_READ,
      PERMISSIONS.REPORTING_WRITE,
      PERMISSIONS.REPORTING_EXPORT,
      PERMISSIONS.REPORTING_ANALYTICS_READ,
      PERMISSIONS.REPORTING_DASHBOARD_READ,
    ],
  },
  audit: {
    label: 'Audit & Compliance',
    permissions: [
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.AUDIT_EXPORT,
    ],
  },
};