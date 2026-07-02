import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { exchangeCodeForToken, fetchWhopUserProfile, fetchWhopMemberships, type WhopMembership } from '@/lib/whop'

// Initialize a standard Supabase admin client to invoke the RPC
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const oauthError = url.searchParams.get('error')
    const oauthErrorDescription = url.searchParams.get('error_description')

    // Handle OAuth errors returned by the authorization server
    if (oauthError) {
      console.error(`Whop OAuth error: ${oauthError}`, oauthErrorDescription || '')

      // Clean up OAuth cookies even on error
      const cookieStore = await cookies()
      cookieStore.delete('whop_oauth_state')
      cookieStore.delete('whop_oauth_verifier')
      cookieStore.delete('whop_oauth_nonce')

      // Map known OAuth errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        invalid_scope: 'The login request included invalid permissions. Please try again.',
        access_denied: 'Authorization was denied. Please try again or contact support.',
        invalid_request: 'The login request was malformed. Please try again.',
        invalid_client: 'Application configuration error. Please contact support.',
        server_error: 'Whop experienced a temporary error. Please try again later.',
        temporarily_unavailable: 'Whop is temporarily unavailable. Please try again later.',
      }

      const userMessage = errorMessages[oauthError] || `Authentication failed: ${oauthErrorDescription || oauthError}`
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', userMessage)
      return NextResponse.redirect(loginUrl.toString())
    }

    const cookieStore = await cookies()
    const storedState = cookieStore.get('whop_oauth_state')?.value
    const codeVerifier = cookieStore.get('whop_oauth_verifier')?.value

    // Clean up OAuth cookies
    cookieStore.delete('whop_oauth_state')
    cookieStore.delete('whop_oauth_verifier')
    cookieStore.delete('whop_oauth_nonce')

    // 1. Verify OAuth state
    if (!state || state !== storedState) {
      console.error('State mismatch. Stored:', storedState, 'Received:', state)
      return NextResponse.json({ error: 'OAuth state verification failed' }, { status: 400 })
    }

    // 2. Exchange code for access token in live mode
    if (!code || !codeVerifier) {
      return NextResponse.json({ error: 'Missing authorization code or verifier' }, { status: 400 })
    }

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = process.env.WHOP_REDIRECT_URI || `${protocol}://${host}/api/auth/whop/callback`

    const tokenRes = await exchangeCodeForToken(code, codeVerifier, redirectUri)
    const accessToken = tokenRes.access_token

    // 3. Fetch Whop User Profile
    const profile = await fetchWhopUserProfile(accessToken)
    const whopUser = {
      id: profile.id,
      email: profile.email || `${profile.username || profile.id}@whop.user`,
      username: profile.username || profile.id,
      name: profile.name || profile.username || 'Whop User'
    }

    // 4. Fetch Whop Memberships
    const membership = await fetchWhopMemberships(whopUser.email, whopUser.id, accessToken)

    // 5. Link user in Supabase by calling our database RPC
    const securePassword = `whop_user_${whopUser.id}`
    const { data: userId, error: rpcErr } = await supabaseAdmin.rpc('create_or_get_user_for_whop', {
      p_email: whopUser.email,
      p_username: whopUser.username,
      p_full_name: whopUser.name,
      p_whop_user_id: whopUser.id,
      p_password: securePassword
    })

    if (rpcErr || !userId) {
      console.error('Failed to create or update Supabase user via RPC:', rpcErr)
      return NextResponse.json({ error: 'Authentication sync failed' }, { status: 500 })
    }

    // 6. Sign in to Supabase Auth to establish the session in cookies
    const supabaseServer = await createSupabaseServerClient()
    const { error: signInErr } = await supabaseServer.auth.signInWithPassword({
      email: whopUser.email,
      password: securePassword
    })

    if (signInErr) {
      console.error('Failed to sign in to Supabase server:', signInErr.message)
      return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 })
    }

    // 7. Update database subscription cache
    const { error: cacheErr } = await supabaseAdmin.rpc('handle_stripe_subscription_update', {
      p_user_id: userId,
      p_subscription_id: membership.status === 'none' ? `no_sub_${userId}` : `whop_sub_${whopUser.id}`,
      p_status: membership.status === 'none' ? 'free' : membership.status,
      p_plan_type: membership.plan_type === 'free' ? 'monthly' : membership.plan_type,
      p_current_period_end: membership.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_stripe_customer_id: membership.manage_url || `whop_manage_${userId}`
    })

    if (cacheErr) {
      console.error('Failed to cache subscription status in database:', cacheErr)
    }

    // 8. Redirect to Dashboard
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Error during Whop callback processing:', error)
    return NextResponse.json({ error: 'Failed to complete authentication' }, { status: 500 })
  }
}
