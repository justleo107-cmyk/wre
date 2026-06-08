import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // 1. Run updateSession to refresh cookie session
  let response = await updateSession(request)

  // 2. Create client to check user authentication status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Protected paths list
  const isProtectedRoute = 
    path.startsWith('/dashboard') ||
    path.startsWith('/deals') ||
    path.startsWith('/deal-intelligence') ||
    path.startsWith('/calculators') ||
    path.startsWith('/learn') ||
    path.startsWith('/xp') ||
    path.startsWith('/streaks') ||
    path.startsWith('/badges') ||
    path.startsWith('/progression') ||
    path.startsWith('/credits') ||
    path.startsWith('/pricing') ||
    path.startsWith('/settings') ||
    path.startsWith('/admin') ||
    path.startsWith('/onboarding')

  // If a protected route is requested and no user session is present, redirect to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated user away from login to dashboard
  if (path === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images/icons in public/
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
