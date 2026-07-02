import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Client with service-role level capability if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Toggle sandbox vs production base domains dynamically
const getWhopOAuthBase = () => {
  return process.env.WHOP_SANDBOX === 'true'
    ? 'https://sandbox.whop.com'
    : 'https://api.whop.com'
}

const getWhopApiBase = () => {
  return process.env.WHOP_SANDBOX === 'true'
    ? 'https://sandbox-api.whop.com/api/v1'
    : 'https://api.whop.com/api/v1'
}

export interface WhopMembership {
  status: 'active' | 'trialing' | 'expired' | 'none'
  plan_type: 'monthly' | 'six_month' | 'yearly' | 'free'
  current_period_end: string | null
  manage_url: string | null
}

// PKCE helper functions
export function generateOAuthParams() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')
  return { verifier, challenge, state, nonce }
}

// Get the OAuth Authorization Redirect URL
export function getOAuthUrl(redirectUri: string, state: string, challenge: string, nonce: string) {
  const clientId = process.env.WHOP_CLIENT_ID!
  const oauthBase = getWhopOAuthBase()
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    nonce
  })

  return `${oauthBase}/oauth/authorize?${params.toString()}`
}

// Token Exchange
export async function exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
  const oauthBase = getWhopOAuthBase()
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    client_id: process.env.WHOP_CLIENT_ID!,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  }

  if (process.env.WHOP_CLIENT_SECRET) {
    params.client_secret = process.env.WHOP_CLIENT_SECRET
  }

  const response = await fetch(`${oauthBase}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange Whop authorization code: ${errorText}`)
  }

  return response.json()
}

// Fetch User profile info from Whop using access token
export async function fetchWhopUserProfile(accessToken: string) {
  const apiBase = getWhopApiBase()
  const response = await fetch(`${apiBase}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch Whop user profile: ${errorText}`)
  }

  return response.json()
}

// Fetch user memberships using Whop Company API Key (or accessToken)
export async function fetchWhopMemberships(email: string, whopUserId: string, userAccessToken?: string): Promise<WhopMembership> {
  const apiKey = process.env.WHOP_API_KEY
  const apiBase = getWhopApiBase()
  let headers: HeadersInit = {}
  let url = `${apiBase}/memberships`

  if (userAccessToken) {
    headers = { Authorization: `Bearer ${userAccessToken}` }
  } else if (apiKey) {
    headers = { Authorization: `Bearer ${apiKey}` }
    url = `${apiBase}/memberships?user_emails=${encodeURIComponent(email)}`
  } else {
    // If no keys configured, return free tier
    return {
      status: 'none',
      plan_type: 'free',
      current_period_end: null,
      manage_url: null
    }
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    console.error(`Failed to fetch memberships from Whop: ${await response.text()}`)
    return { status: 'none', plan_type: 'free', current_period_end: null, manage_url: null }
  }

  const result = await response.json()
  const memberships = result.data || []

  if (memberships.length === 0) {
    return { status: 'none', plan_type: 'free', current_period_end: null, manage_url: null }
  }

  // Find the membership for the Vanta Hq products or the active/trialing ones
  const activeMembership = memberships.find((m: any) => 
    m.status === 'active' || m.status === 'trialing' || m.status === 'canceling'
  ) || memberships[0]

  const status = activeMembership.status as string
  let mappedStatus: 'active' | 'trialing' | 'expired' | 'none' = 'none'
  
  if (status === 'active' || status === 'canceling') {
    mappedStatus = 'active'
  } else if (status === 'trialing') {
    mappedStatus = 'trialing'
  } else if (['past_due', 'canceled', 'expired'].includes(status)) {
    mappedStatus = 'expired'
  }

  // Map plan name/meta to plan type
  const planName = (activeMembership.plan?.name || '').toLowerCase()
  let planType: 'monthly' | 'six_month' | 'yearly' | 'free' = 'monthly'

  if (planName.includes('year') || planName.includes('annual')) {
    planType = 'yearly'
  } else if (planName.includes('6-month') || planName.includes('6 month') || planName.includes('six')) {
    planType = 'six_month'
  }

  return {
    status: mappedStatus,
    plan_type: planType,
    current_period_end: activeMembership.renewal_period_end || activeMembership.canceled_at || null,
    manage_url: activeMembership.manage_url || 'https://whop.com/hub/'
  }
}

// Check Database cached subscription or fetch fresh and cache it
export async function getWhopSubscriptionStatus(userId: string, email: string): Promise<WhopMembership> {
  try {
    // 1. Check cached subscription in Supabase
    const { data: cachedSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const cacheTtlMinutes = 5
    const now = new Date()

    if (cachedSub) {
      const lastCheckedStr = cachedSub.created_at
      const lastChecked = new Date(lastCheckedStr)
      const diffMs = now.getTime() - lastChecked.getTime()
      const diffMin = diffMs / (1000 * 60)

      if (diffMin < cacheTtlMinutes) {
        return {
          status: cachedSub.status as any,
          plan_type: cachedSub.plan_type as any,
          current_period_end: cachedSub.current_period_end,
          manage_url: cachedSub.stripe_customer_id?.startsWith('http') 
            ? cachedSub.stripe_customer_id 
            : 'https://whop.com/hub/'
        }
      }
    }

    // 2. Fetch fresh membership from Whop
    const freshStatus = await fetchWhopMemberships(email, '')

    // 3. Update cached status in database using the RPC helper
    await supabase.rpc('handle_stripe_subscription_update', {
      p_user_id: userId,
      p_subscription_id: freshStatus.status === 'none' ? `no_sub_${userId}` : `whop_sub_${userId}`,
      p_status: freshStatus.status === 'none' ? 'free' : freshStatus.status,
      p_plan_type: freshStatus.plan_type === 'free' ? 'monthly' : freshStatus.plan_type,
      p_current_period_end: freshStatus.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_stripe_customer_id: freshStatus.manage_url || `whop_manage_${userId}`
    })

    return freshStatus
  } catch (err) {
    console.error('Error fetching subscription status from Whop or DB:', err)
    return {
      status: 'none',
      plan_type: 'free',
      current_period_end: null,
      manage_url: null
    }
  }
}
