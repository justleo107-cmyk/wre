import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateOAuthParams, getOAuthUrl } from '@/lib/whop'

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = process.env.WHOP_REDIRECT_URI || `${protocol}://${host}/api/auth/whop/callback`

    // Generate OAuth security tokens (PKCE state/verifier)
    const { verifier, challenge, state, nonce } = generateOAuthParams()

    // Store security tokens in secure HTTP-only cookies
    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 10 // 10 minutes
    }

    cookieStore.set('whop_oauth_verifier', verifier, cookieOptions)
    cookieStore.set('whop_oauth_state', state, cookieOptions)
    cookieStore.set('whop_oauth_nonce', nonce, cookieOptions)

    // Redirect directly to the official Whop authorization URL
    const authorizeUrl = getOAuthUrl(redirectUri, state, challenge, nonce)
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error('Error during Whop login redirect:', error)
    return NextResponse.json({ error: 'Failed to initiate login flow' }, { status: 500 })
  }
}
