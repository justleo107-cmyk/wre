import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Fetch User Profile & Subscription Status
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('id', user.id).eq('status', 'active').single()
    const isSubscribed = !!sub

    // 3. Check credit availability & lifetime limits
    // AI Analysis costs 5 credits
    const cost = 5
    
    // Fetch Credit Balance (Sum from Ledger)
    const { data: ledgerData } = await supabase
      .from('credit_ledger')
      .select('credits_changed')
      .eq('user_id', user.id)

    const credits = ledgerData?.reduce((acc, curr) => acc + curr.credits_changed, 0) || 0

    // Count lifetime AI runs
    const { count: aiRunsCount } = await supabase
      .from('credit_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('description', 'AI Property Analysis Run')

    const lifetimeRuns = aiRunsCount || 0

    if (!isSubscribed && lifetimeRuns >= 10) {
      return NextResponse.json({ 
        error: 'Lifetime AI Analysis limit of 10 runs reached for free tier. Please subscribe to unlock unlimited analysis!' 
      }, { status: 402 })
    }

    if (credits < cost) {
      return NextResponse.json({ 
        error: `Insufficient credits. AI analysis requires ${cost} credits (Current balance: ${credits}).` 
      }, { status: 402 })
    }

    // Parse payload
    const body = await request.json()
    const { askingPrice, rehabEstimates, location, propertyCondition, notes } = body

    if (!askingPrice || !location) {
      return NextResponse.json({ error: 'Asking Price and Location are required fields.' }, { status: 400 })
    }

    // 4. Deduct credits from ledger
    const { data: success, error: rpcError } = await supabase.rpc('deduct_credits', {
      amount_to_deduct: cost,
      transaction_desc: 'AI Property Analysis Run'
    })

    if (rpcError || !success) {
      return NextResponse.json({ error: 'Failed to process credit deduction transaction.' }, { status: 500 })
    }

    // 5. Simulate AI Analysis Engine (GPT-4o / Gemini structured output)
    const priceVal = Number(askingPrice)
    const rehabVal = rehabEstimates ? Number(rehabEstimates) : Math.round(priceVal * 0.15)
    
    // Simple valuation heuristics to make mock outputs highly realistic
    const estimatedArv = Math.round(priceVal * 1.35)
    const suggestedMao = Math.round((estimatedArv * 0.70) - rehabVal - 10000)
    
    let riskScore = 4
    let dealQualityScore = 7
    let buyerSuitability = 'Ideal for fix-and-flip investors looking for high equity margins.'
    
    if (propertyCondition === 'poor') {
      riskScore = 7
      dealQualityScore = 6
      buyerSuitability = 'Heavy rehab project suitable only for experienced crews or structural investors.'
    } else if (propertyCondition === 'excellent') {
      riskScore = 2
      dealQualityScore = 9
      buyerSuitability = 'Turnkey JV deal suitable for rental portfolio cash buyers seeking stable yields.'
    }

    const output = {
      estimatedArv,
      estimatedRehab: rehabVal,
      suggestedMao,
      riskScore,
      dealQualityScore,
      negotiationSuggestions: [
        `Property is located in a high-demand school district. A discounted offer at MAO of $${suggestedMao.toLocaleString()} is competitive yet profitable.`,
        notes?.toLowerCase().includes('roof') 
          ? "Seller mentioned roof issues. Leverage a licensed roofer's inspection report to negotiate an additional $7,500 concession."
          : "The property has been on the market for over 45 days. Use the seller's urgency to secure a flexible closing timeline.",
        `Ensure your purchase contract contains a 15-day feasibility study contingency to verify all repair line items.`
      ],
      buyerSuitability
    }

    return NextResponse.json(output)
  } catch (err: any) {
    console.error('AI Analyze API Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
