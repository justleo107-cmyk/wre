import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15' as NonNullable<ConstructorParameters<typeof Stripe>[1]>['apiVersion'],
})

/**
 * Gets or creates a Stripe Price dynamically based on the plan type and database price amount.
 * This guarantees the rate lock for existing subscribers (Founders pricing).
 */
export async function getOrCreateStripePrice(
  planType: 'monthly' | 'six_month' | 'yearly',
  amount: number
): Promise<string> {
  const amountCents = Math.round(amount * 100)
  const lookupKey = `vanta_premium_${planType}_${amountCents}`

  // If secret key is not set properly, return a mock price ID
  if (stripeSecretKey === 'sk_test_placeholder') {
    console.warn('Stripe secret key is placeholder. Returning mock price ID.')
    return `price_mock_${planType}_${amountCents}`
  }

  try {
    // 1. Search for existing active price matching the lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product'],
      active: true,
    })

    if (prices.data.length > 0) {
      return prices.data[0].id
    }

    // 2. Find or create the Vanta Premium product
    let product: Stripe.Product
    const products = await stripe.products.list({
      limit: 100,
    })
    const vantaProduct = products.data.find(p => p.name === 'Vanta Premium')

    if (vantaProduct) {
      product = vantaProduct
    } else {
      product = await stripe.products.create({
        name: 'Vanta Premium',
        description: 'Unlock all Vanta premium wholesale real-estate progression features.',
      })
    }

    // 3. Define recurring interval
    let interval: Stripe.PriceCreateParams.Recurring.Interval = 'month'
    let intervalCount: number | undefined = undefined

    if (planType === 'six_month') {
      interval = 'month'
      intervalCount = 6
    } else if (planType === 'yearly') {
      interval = 'year'
    }

    // 4. Create a new price in Stripe matching the configuration
    const newPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: 'usd',
      recurring: {
        interval,
        interval_count: intervalCount,
      },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
    })

    return newPrice.id
  } catch (error) {
    console.error('Error in getOrCreateStripePrice:', error)
    // Return fallback price string for testing
    return `price_fallback_${planType}_${amountCents}`
  }
}
