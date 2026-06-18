import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const stripeCustomerId = profile.stripe_customer_id
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'

    // Mock Mode fallback
    if (stripeSecretKey === 'sk_test_placeholder' || !stripeCustomerId) {
      const origin = request.headers.get('origin') || 'http://localhost:3000'
      const mockPortalUrl = `${origin}/settings?portal_success=true&mock_mode=true`
      return NextResponse.json({ url: mockPortalUrl })
    }

    // 3. Create Stripe Billing Portal Session
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Customer Portal API Error:', err)
    return NextResponse.json({ error: 'Failed to access billing portal: ' + err.message }, { status: 500 })
  }
}
