import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, detectBot, detectSqliXss } from '@/lib/firewall'

export async function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || (request as any).ip || '127.0.0.1'
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const host = request.nextUrl.hostname

  const isLocalhost = process.env.NODE_ENV === 'development' || host === 'localhost' || host === '127.0.0.1' || ip === '127.0.0.1' || ip === '::1'
  const isApi = path.startsWith('/api')

  // Public routes that are accessible without authentication and never rate-limited
  const isPublicPage =
    path === '/' ||
    path === '/home' ||
    path === '/privacy' ||
    path === '/terms' ||
    path === '/pricing' ||
    path === '/signin' ||
    path === '/signup' ||
    path === '/refund' ||
    path === '/contact'

  // Sensitive paths that require strict rate limiting (120 requests/minute) in production
  const isSensitive =
    isApi ||
    path === '/login' ||
    path === '/signup' ||
    path === '/signin' ||
    path.startsWith('/admin') ||
    path.startsWith('/settings') ||
    path === '/onboarding'

  // Run updateSession to refresh cookie session
  let response = await updateSession(request)

  // Create client to check user authentication status
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

  // Identify if the request belongs to the testing / Vanta audit user account
  const isTestingUser = user?.id === 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5' || user?.email === 'bharath2552v@gmail.com'

  // 1. Check Rate Limiting (120 requests/minute limit strictly in production for sensitive endpoints)
  if (!isLocalhost && isSensitive && !isTestingUser) {
    const rateLimit = checkRateLimit(ip, 120, 60000)
    if (!rateLimit.success) {
      if (isApi) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Blocked by Vanta Shield WAF.' },
          { status: 429 }
        )
      } else {
        // Render friendly UI Error page for browser clients
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Blocked by Vanta Shield</title>
            <style>
              body {
                background-color: #090d16;
                color: #f1f5f9;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 440px;
                text-align: center;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(139, 92, 246, 0.2);
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 0 40px rgba(139, 92, 246, 0.1);
                backdrop-filter: blur(8px);
              }
              h1 {
                font-size: 22px;
                font-weight: 900;
                margin-top: 20px;
                margin-bottom: 10px;
                background: linear-gradient(to right, #a78bfa, #f472b6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              p {
                font-size: 13px;
                color: #94a3b8;
                line-height: 1.6;
                margin-bottom: 25px;
              }
              .icon {
                font-size: 48px;
                margin: 0 auto;
              }
              .btn {
                display: inline-block;
                background: #6d28d9;
                color: white;
                text-decoration: none;
                font-size: 12px;
                font-weight: bold;
                padding: 10px 24px;
                border-radius: 8px;
                transition: background 0.2s;
              }
              .btn:hover {
                background: #7c3aed;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🛡️</div>
              <h1>Request Throttled</h1>
              <p>Vanta Shield WAF has temporarily restricted your access due to too many rapid requests. Please wait a moment and reload.</p>
              <a href="" class="btn" onclick="window.location.reload(); return false;">Try Reloading</a>
            </div>
          </body>
          </html>
        `
        return new NextResponse(html, {
          status: 429,
          headers: { 'Content-Type': 'text/html' }
        })
      }
    }
  }

  // 2. Block automated scraper clients and crawlers
  if (detectBot(userAgent) && !isTestingUser) {
    return NextResponse.json(
      { error: 'Access denied. Automated scraper bot detected by Vanta Shield WAF.' },
      { status: 403 }
    )
  }

  // 3. Scan URL query parameters for potential SQLi/XSS vectors
  const searchParamsStr = request.nextUrl.search
  if (searchParamsStr && detectSqliXss(searchParamsStr) && !isTestingUser) {
    return NextResponse.json(
      { error: 'Access denied. Suspicious security vector detected by Vanta Shield WAF.' },
      { status: 403 }
    )
  }

  // Protected paths list (must be logged in)
  const isProtectedRoute =
    (path.startsWith('/dashboard') ||
    path.startsWith('/deals') ||
    path.startsWith('/deal-intelligence') ||
    path.startsWith('/calculators') ||
    path.startsWith('/learn') ||
    path.startsWith('/xp') ||
    path.startsWith('/streaks') ||
    path.startsWith('/badges') ||
    path.startsWith('/progression') ||
    path.startsWith('/credits') ||
    path.startsWith('/settings') ||
    path.startsWith('/admin') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/chat') ||
    path.startsWith('/voice-notes')) &&
    !isPublicPage

  // If a protected route is requested and no user session is present, redirect to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated user away from login/signin/signup pages to dashboard
  if ((path === '/login' || path === '/signin' || path === '/signup') && user) {
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
