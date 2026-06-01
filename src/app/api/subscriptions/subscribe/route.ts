import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardXp } from '@/lib/gamification'

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
    const { planType, planName } = body

    if (!planType) {
      return NextResponse.json({ error: 'Plan type is required' }, { status: 400 })
    }

    // 3. Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('created_at, arv_credits, mao_credits, ai_uses_remaining')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 4. Calculate 60-minute offer expiration
    const createdAtTime = new Date(profile.created_at).getTime()
    const nowTime = new Date().getTime()
    const diffMs = nowTime - createdAtTime
    const isDiscountActive = diffMs > 0 && diffMs < 60 * 60 * 1000 // 60 minutes

    // Prices mapping
    const prices = {
      monthly: { original: 149.99, discounted: 119.99 },
      six_month: { original: 799.99, discounted: 639.99 },
      yearly: { original: 1499.99, discounted: 1199.99 }
    } as const

    const selectedPriceObj = prices[planType as 'monthly' | 'six_month' | 'yearly']
    if (!selectedPriceObj) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const priceCharged = isDiscountActive ? selectedPriceObj.discounted : selectedPriceObj.original

    // 5. Update Subscription table
    const endPeriod = new Date()
    endPeriod.setDate(endPeriod.getDate() + 30)

    const subId = `sub_${Math.random().toString(36).substring(2, 11)}`
    const { error: subErr } = await supabase
      .from('subscriptions')
      .upsert({
        id: subId,
        user_id: user.id,
        status: 'active',
        plan_type: planType,
        current_period_end: endPeriod.toISOString()
      })

    if (subErr) throw subErr

    // 6. Add Subscriber Credits
    const currentArv = profile.arv_credits || 0
    const currentMao = profile.mao_credits || 0
    const currentAi = profile.ai_uses_remaining || 0

    const nextArv = currentArv + 200
    const nextMao = currentMao + 200
    const nextAi = currentAi + 100

    // 7. Update Profile
    const { error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        arv_credits: nextArv,
        mao_credits: nextMao,
        ai_uses_remaining: nextAi
      })
      .eq('id', user.id)

    if (profileUpdateErr) throw profileUpdateErr

    // 8. Log transactions
    const totalBalance = nextArv + nextMao + nextAi
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      feature: `Subscription Upgrade: ${planName} Plan allotment (Charged $${priceCharged})`,
      credits_used: 0,
      credits_added: 500,
      balance: totalBalance
    })

    // Legacy ledger log
    await supabase.from('credit_ledger').insert({
      user_id: user.id,
      transaction_type: 'allotment',
      credits_changed: 500,
      description: `Subscription Upgrade: ${planName} Plan allotment`
    })

    // Award XP
    await awardXp(supabase, user.id, 1000, `Upgraded to ${planName} Subscription`)

    return NextResponse.json({
      success: true,
      priceCharged,
      discountApplied: isDiscountActive
    })
  } catch (err) {
    console.error('Subscription API Error:', err)
    return NextResponse.json({ error: 'Failed to process subscription upgrade' }, { status: 500 })
  }
}
