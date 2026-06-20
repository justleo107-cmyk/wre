import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

// Create a Supabase client that uses anon key but can invoke SECURITY DEFINER RPCs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  let event: Stripe.Event
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (stripeSecretKey !== 'sk_test_placeholder' && webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('Webhook signature verification failed:', errMsg)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }
  } else {
    // Development fallback / direct JSON parser
    try {
      event = JSON.parse(payload)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to parse webhook JSON payload:', errMsg)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
  }

  console.log(`Processing Stripe webhook event type: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planType = session.metadata?.planType
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId || !subscriptionId) {
          console.warn('Checkout session missing metadata. userId:', userId, 'subId:', subscriptionId)
          break
        }

        // Retrieve subscription details to get status and current period end
        let status = 'active'
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        if (stripeSecretKey !== 'sk_test_placeholder') {
          try {
            const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as { status: string, current_period_end: number }
            status = subscription.status
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
          } catch (err) {
            console.error('Error retrieving Stripe subscription details:', err)
          }
        }

        // Call PostgreSQL SECURITY DEFINER RPC to update DB
        const { error } = await supabase.rpc('handle_stripe_subscription_update', {
          p_user_id: userId,
          p_subscription_id: subscriptionId,
          p_status: status,
          p_plan_type: planType,
          p_current_period_end: currentPeriodEnd,
          p_stripe_customer_id: customerId,
        })

        if (error) {
          console.error('Error in handle_stripe_subscription_update RPC:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as {
          id: string
          customer: string
          status: string
          current_period_end: number
          metadata?: Record<string, string>
          items: {
            data: Array<{
              price: {
                id: string
              }
            }>
          }
        }
        const subscriptionId = subscription.id
        const customerId = subscription.customer
        const status = subscription.status
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        // Lookup user profile by stripe customer id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        const userId = subscription.metadata?.userId || profile?.id
        if (!userId) {
          console.warn('Subscription updated but no user profile matches customer:', customerId)
          break
        }

        // Determine plan type from price details
        let planType = subscription.metadata?.planType
        const priceId = subscription.items.data[0]?.price.id

        if (!planType && priceId && stripeSecretKey !== 'sk_test_placeholder') {
          try {
            const price = await stripe.prices.retrieve(priceId)
            if (price.lookup_key?.includes('monthly')) planType = 'monthly'
            else if (price.lookup_key?.includes('six_month')) planType = 'six_month'
            else if (price.lookup_key?.includes('yearly')) planType = 'yearly'
          } catch (err) {
            console.error('Error retrieving price lookup key:', err)
          }
        }

        if (!planType) planType = 'monthly'

        // Call RPC
        const { error } = await supabase.rpc('handle_stripe_subscription_update', {
          p_user_id: userId,
          p_subscription_id: subscriptionId,
          p_status: status,
          p_plan_type: planType,
          p_current_period_end: currentPeriodEnd,
          p_stripe_customer_id: customerId,
        })

        if (error) {
          console.error('Error in handle_stripe_subscription_update RPC:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as { customer: string, id: string }
        const customerId = subscription.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (!profile) {
          console.warn('Subscription deleted but no user profile matches customer:', customerId)
          break
        }

        // Update DB: Set status to canceled/expired
        const { error } = await supabase.rpc('handle_stripe_subscription_update', {
          p_user_id: profile.id,
          p_subscription_id: subscription.id,
          p_status: 'canceled',
          p_plan_type: 'monthly',
          p_current_period_end: new Date().toISOString(),
          p_stripe_customer_id: customerId,
        })

        if (error) {
          console.error('Error in handle_stripe_subscription_update RPC:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as { customer: string | null; subscription: string | null }
        const customerId = invoice.customer
        const subscriptionId = invoice.subscription

        if (!customerId || !subscriptionId) break

        // Invoke invoice.paid helper
        const { error } = await supabase.rpc('handle_stripe_invoice_paid', {
          p_stripe_customer_id: customerId,
          p_subscription_id: subscriptionId,
        })

        if (error) {
          console.error('Error in handle_stripe_invoice_paid RPC:', error)
          return NextResponse.json({ error: 'Database invoice paid trigger failed' }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as { customer: string | null; subscription: string | null }
        const customerId = invoice.customer
        const subscriptionId = invoice.subscription

        console.warn(`Invoice payment failed for customer: ${customerId}, subscription: ${subscriptionId}`)
        // Let user have status update via customer.subscription.updated to past_due/unpaid
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('Webhook endpoint processor error:', err)
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Webhook handler exception: ' + errMsg }, { status: 500 })
  }
}
