/**
 * RoleGuard - Conditional rendering based on user roles
 * Provides flexible access control for components and pages
 */

'use client';

import { ReactNode } from 'react';
import { useRole, usePermissions } from '@/lib/auth/hooks';
import { ROLES, type UserRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

interface RoleGuardProps {
  /** Allowed roles - user must have one of these roles */
  allowedRoles?: UserRole[];
  /** Minimum role level required (hierarchy-based) */
  minRole?: UserRole;
  /** Required permissions - user must have all of these */
  requiredPermissions?: string[];
  /** Required permissions - user must have at least one of these */
  anyPermissions?: string[];
  /** Fallback component when access denied */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  loading?: ReactNode;
  /** Invert the check (deny access to specified roles) */
  invert?: boolean;
  /** Additional className */
  className?: string;
  /** Children to render when access granted */
  children: ReactNode;
}

/**
 * RoleGuard - Main component for role-based conditional rendering
 */
export function RoleGuard({
  allowedRoles,
  minRole,
  requiredPermissions,
  anyPermissions,
  fallback = null,
  loading = null,
  invert = false,
  className,
  children,
}: RoleGuardProps) {
  const { role, loading: roleLoading } = useRole();
  const { can, canAll, canAny } = usePermissions();

  if (roleLoading) {
    return <>{loading}</>;
  }

  if (!role) {
    return invert ? <>{children}</> : <>{fallback}</>;
  }

  let hasAccess = false;

  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = allowedRoles.includes(role);
  }

  // Check minimum role hierarchy
  if (!hasAccess && minRole) {
    const roleHierarchy = {
      [ROLES.STUDENT]: 1,
      [ROLES.REVIEWER]: 2,
      [ROLES.INSTRUCTOR]: 3,
      [ROLES.ADMIN]: 4,
    };
    hasAccess = (roleHierarchy[role] || 0) >= (roleHierarchy[minRole] || 0);
  }

  // Check required permissions (all must be present)
  if (!hasAccess && requiredPermissions && requiredPermissions.length > 0) {
    hasAccess = canAll(requiredPermissions);
  }

  // Check any permissions (at least one must be present)
  if (!hasAccess && anyPermissions && anyPermissions.length > 0) {
    hasAccess = canAny(anyPermissions);
  }

  // If no criteria specified, grant access to authenticated users
  if (!allowedRoles && !minRole && !requiredPermissions && !anyPermissions) {
    hasAccess = true;
  }

  // Apply inversion
  if (invert) {
    hasAccess = !hasAccess;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <div className={cn(className)}>{children}</div>;
}

/**
 * AdminOnly - Shorthand for admin-only content
 */
export function AdminOnly({ children, fallback = null, loading = null, className }: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  className?: string;
}) {
  return (
    <RoleGuard
      allowedRoles={[ROLES.ADMIN]}
      fallback={fallback}
      loading={loading}
      className={className}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * InstructorOnly - Shorthand for instructor+ content
 */
export function InstructorOnly({ children, fallback = null, loading = null, className }: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  className?: string;
}) {
  return (
    <RoleGuard
      allowedRoles={[ROLES.ADMIN, ROLES.INSTRUCTOR]}
      fallback={fallback}
      loading={loading}
      className={className}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * ReviewerOnly - Shorthand for reviewer+ content
 */
export function ReviewerOnly({ children, fallback = null, loading = null, className }: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  className?: string;
}) {
  return (
    <RoleGuard
      allowedRoles={[ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.REVIEWER]}
      fallback={fallback}
      loading={loading}
      className={className}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * StudentOnly - Shorthand for student-only content
 */
export function StudentOnly({ children, fallback = null, loading = null, className }: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  className?: string;
}) {
  return (
    <RoleGuard
      allowedRoles={[ROLES.STUDENT]}
      fallback={fallback}
      loading={loading}
      className={className}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * PermissionGuard - Guard based on specific permissions
 */
export function PermissionGuard({
  permissions,
  requireAll = true,
  children,
  fallback = null,
  loading = null,
  className,
}: {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  className?: string;
}) {
  const { can, canAll, canAny, role } = usePermissions();
  const { loading: roleLoading } = useRole();

  if (roleLoading || !role) {
    return <>{loading}</>;
  }

  const hasAccess = requireAll ? canAll(permissions) : canAny(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * RoleBadge - Display user role with styling
 */
export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const roleStyles: Record<UserRole, string> = {
    [ROLES.ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    [ROLES.INSTRUCTOR]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [ROLES.REVIEWER]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [ROLES.STUDENT]: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };

  const roleLabels: Record<UserRole, string> = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.INSTRUCTOR]: 'Instructor',
    [ROLES.REVIEWER]: 'Reviewer',
    [ROLES.STUDENT]: 'Student',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        roleStyles[role],
        className
      )}
    >
      {roleLabels[role]}
    </span>
  );
}

/**
 * Hook for checking access in event handlers
 */
export function useAccessControl() {
  const { role } = useRole();
  const { can, canAny, canAll } = usePermissions();

  const checkAccess = useCallback((options: {
    allowedRoles?: UserRole[];
    minRole?: UserRole;
    requiredPermissions?: string[];
    anyPermissions?: string[];
  }) => {
    if (!role) return false;

    let hasAccess = false;

    if (options.allowedRoles?.length) {
      hasAccess = options.allowedRoles.includes(role);
    }

    if (!hasAccess && options.minRole) {
      const roleHierarchy = {
        [ROLES.STUDENT]: 1,
        [ROLES.REVIEWER]: 2,
        [ROLES.INSTRUCTOR]: 3,
        [ROLES.ADMIN]: 4,
      };
      hasAccess = (roleHierarchy[role] || 0) >= (roleHierarchy[options.minRole] || 0);
    }

    if (!hasAccess && options.requiredPermissions?.length) {
      hasAccess = canAll(options.requiredPermissions);
    }

    if (!hasAccess && options.anyPermissions?.length) {
      hasAccess = canAny(options.anyPermissions);
    }

    if (!options.allowedRoles && !options.minRole && !options.requiredPermissions && !options.anyPermissions) {
      hasAccess = true;
    }

    return hasAccess;
  }, [role, canAll, canAny]);

  return { checkAccess, role };
}