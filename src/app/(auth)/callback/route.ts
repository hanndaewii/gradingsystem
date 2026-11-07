/**
 * Auth Callback Route - Handles OAuth and email confirmation callbacks
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const redirectUrl = new URL('/auth/login', origin);
    redirectUrl.searchParams.set('error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Handle email confirmation / OAuth code exchange
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Check if user has profile and is approved
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_approved, role')
          .eq('id', user.id)
          .single();

        // If instructor pending approval, redirect to pending page
        if (profile?.role === 'instructor' && !profile?.is_approved) {
          return NextResponse.redirect(new URL('/auth/pending', origin));
        }

        // Otherwise redirect to intended destination
        return NextResponse.redirect(new URL(next, origin));
      }
    }
  }

  // Fallback: redirect to login with error
  const redirectUrl = new URL('/auth/login', origin);
  redirectUrl.searchParams.set('error', 'callback_failed');
  return NextResponse.redirect(redirectUrl);
}