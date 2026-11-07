import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes that require authentication (dashboard route groups)
  const protectedPaths = [
    '/dashboard',
    '/staff',
    '/admin',
    '/reports',
    '/settings',
    '/classes',
  ];

  // Auth routes that should redirect to dashboard if already logged in
  const authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/callback',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/mfa/setup',
    '/auth/invite',
    '/auth/pending',
  ];

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth routes
  if (isAuthPath && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Role-based route protection
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    const isApproved = profile?.is_approved;

    // Admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Staff routes
    if (request.nextUrl.pathname.startsWith('/staff') && !['admin', 'staff'].includes(role || '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Professor routes - check approval
    if (request.nextUrl.pathname.startsWith('/dashboard') && role === 'professor' && !isApproved) {
      return NextResponse.redirect(new URL('/auth/pending', request.url));
    }

    // Professor routes - only professors, staff, admin
    if (request.nextUrl.pathname.startsWith('/dashboard') && role === 'student') {
      return NextResponse.redirect(new URL('/dashboard', request.url)); // Will show student dashboard later
    }
  }

  return supabaseResponse;
}