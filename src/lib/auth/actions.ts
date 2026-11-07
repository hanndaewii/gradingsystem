/**
 * Server Actions for Authentication Operations
 * Used by forms and components for server-side auth operations
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { generateSecret, verifyTOTP, enableMFA, disableMFA, verifyMFAToken, getMFAStatus } from '@/lib/auth/mfa';
import { ROLES, type UserRole } from '@/lib/auth/roles';
import { canManageRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';

/**
 * Sign in with email and password
 */
export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Sign up new user
 */
export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const employeeNumber = formData.get('employeeNumber') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password || !employeeNumber) {
    return { error: 'All fields are required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        employee_number: employeeNumber,
        full_name: fullName,
        role: 'instructor',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Sign out
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

/**
 * Request password reset
 */
export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Update password
 */
export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Update user profile
 */
export async function updateProfileAction(formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const avatarUrl = formData.get('avatarUrl') as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings/profile');
  return { success: true };
}

/**
 * Update user role (admin/instructor only)
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check current user's role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentProfile || !canManageRole(currentProfile.role as UserRole, newRole)) {
    return { error: 'Insufficient permissions to assign this role' };
  }

  // Cannot change own role
  if (userId === user.id) {
    return { error: 'Cannot change your own role' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Approve user registration
 */
export async function approveUserAction(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Only administrators can approve users' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_approved: true,
      approval_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Reject user registration
 */
export async function rejectUserAction(userId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Only administrators can reject users' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_approved: false,
      approval_status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Generate MFA secret
 */
export async function generateMFASecretAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const secret = generateSecret();
  return { secret };
}

/**
 * Verify and enable MFA
 */
export async function enableMFAAction(formData: FormData) {
  const token = formData.get('token') as string;

  if (!token || token.length !== 6) {
    return { error: 'Invalid token' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get user's MFA secret
  const { data: profile } = await supabase
    .from('profiles')
    .select('mfa_secret')
    .eq('id', user.id)
    .single();

  if (!profile?.mfa_secret) {
    return { error: 'MFA not configured' };
  }

  const valid = await verifyTOTP(profile.mfa_secret, token);

  if (!valid) {
    return { error: 'Invalid verification code' };
  }

  // Enable MFA
  const { error } = await enableMFA(user.id, profile.mfa_secret);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings/security');
  return { success: true, backupCodes: [] };
}

/**
 * Disable MFA
 */
export async function disableMFAAction(formData: FormData) {
  const token = formData.get('token') as string;

  if (!token || token.length !== 6) {
    return { error: 'Invalid token' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify current MFA token
  const { data: profile } = await supabase
    .from('profiles')
    .select('mfa_secret')
    .eq('id', user.id)
    .single();

  if (!profile?.mfa_secret) {
    return { error: 'MFA not enabled' };
  }

  const valid = await verifyTOTP(profile.mfa_secret, token);

  if (!valid) {
    return { error: 'Invalid verification code' };
  }

  // Disable MFA
  const { error } = await disableMFA(user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings/security');
  return { success: true };
}

/**
 * Verify MFA token for login
 */
export async function verifyMFAAction(userId: string, token: string) {
  return verifyMFAToken(userId, token);
}

/**
 * Get MFA status
 */
export async function getMFAStatusAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { enabled: false, secret: null };
  }

  return getMFAStatus(user.id);
}

/**
 * Invite user to institution
 */
export async function inviteUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const role = formData.get('role') as UserRole;
  const institutionId = formData.get('institutionId') as string;

  if (!email || !role || !institutionId) {
    return { error: 'All fields are required' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || profile.institution_id !== institutionId) {
    return { error: 'Insufficient permissions' };
  }

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email,
      role,
      institution_id: institutionId,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // TODO: Send invitation email
  // await sendInvitationEmail(email, invitation.token);

  return { success: true, invitation };
}

/**
 * Create invitation (admin only)
 */
export async function createInvitationAction(formData: FormData) {
  const email = formData.get('email') as string;
  const role = formData.get('role') as UserRole;
  const institutionId = formData.get('institutionId') as string;

  return inviteUserAction(formData);
}