import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getOrCreateStripePrice } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { planType } = body // 'monthly', 'six_month', 'yearly'

    if (!planType || !['monthly', 'six_month', 'yearly'].includes(planType)) {
      return NextResponse.json({ error: 'Valid plan type is required' }, { status: 400 })
    }

    // 3. Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 4. Fetch active pricing config
    const { data: pricingConfig } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!pricingConfig) {
      return NextResponse.json({ error: 'No active pricing configuration found' }, { status: 500 })
    }

    let amount = Number(pricingConfig.monthly_price)
    if (planType === 'six_month') {
      amount = Number(pricingConfig.sixmonth_price)
    } else if (planType === 'yearly') {
      amount = Number(pricingConfig.yearly_price)
    }

    // 5. Get or create price in Stripe
    const stripePriceId = await getOrCreateStripePrice(planType, amount)

    // 6. Manage Stripe Customer
    let stripeCustomerId = profile.stripe_customer_id
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'

    if (!stripeCustomerId && stripeSecretKey !== 'sk_test_placeholder') {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile.full_name || user.email,
          metadata: {
            userId: user.id,
          },
        })
        stripeCustomerId = customer.id

        // Update profile
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id)
      } catch (err) {
        console.error('Error creating Stripe customer:', err)
      }
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Mock Mode fallback
    if (stripeSecretKey === 'sk_test_placeholder') {
      const mockSessionId = `cs_mock_${Math.random().toString(36).substring(2, 11)}`
      const mockSuccessUrl = `${origin}/dashboard?checkout_success=true&session_id=${mockSessionId}&plan_type=${planType}&mock_mode=true`
      return NextResponse.json({ url: mockSuccessUrl })
    }

    // 7. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId || undefined,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}&plan_type=${planType}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId: user.id,
        planType,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Subscribe Checkout Session Error:', err)
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to create Stripe Checkout Session: ' + errMsg }, { status: 500 })
  }
}
