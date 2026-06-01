import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deductCredits } from '@/lib/gamification'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Fetch profile uses remaining
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_uses_remaining, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.ai_uses_remaining || 0) < 1) {
      return NextResponse.json({ 
        error: 'You have run out of AI Deal Analysis uses. Please purchase more credits or subscribe to unlock more analysis!' 
      }, { status: 402 })
    }

    // Parse payload
    const body = await request.json()
    const { askingPrice, rehabEstimates, location, propertyCondition, notes } = body

    if (!askingPrice || !location) {
      return NextResponse.json({ error: 'Asking Price and Location are required fields.' }, { status: 400 })
    }

    // 3. Deduct 1 AI use (corresponds to 5 credits in ledger)
    const { success, error: deductError } = await deductCredits(supabase, user.id, 'ai', 1, 'AI Property Analysis Run')

    if (!success) {
      return NextResponse.json({ error: deductError || 'Failed to process credit deduction transaction.' }, { status: 500 })
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
  } catch (err) {
    console.error('AI Analyze API Error:', err)
    const errMsg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
