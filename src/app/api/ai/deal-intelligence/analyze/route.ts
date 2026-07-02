import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deductCredits } from '@/lib/gamification'

// Utility function to parse prices from chronological logs to check for motivation trends
function parsePricesFromHistory(texts: string[]): number[] {
  const prices: number[] = []
  const regex = /\$(\d+(?:\.\d+)?)\s*(k|K|million|m|M)?\b|\b(\d+)\s*(?:k|K)\b/g

  for (const text of texts) {
    let match
    // Reset regex lastIndex to search from start
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      let numericVal = 0
      if (match[1]) {
        const cleanNum = match[1].replace(/,/g, '')
        numericVal = Number(cleanNum)
        const suffix = match[2]?.toLowerCase()
        if (suffix === 'k') {
          numericVal *= 1000
        } else if (suffix === 'm' || suffix === 'million') {
          numericVal *= 1000000
        }
      } else if (match[3]) {
        numericVal = Number(match[3]) * 1000
      }

      if (numericVal > 1000) {
        prices.push(numericVal)
      }
    }
  }
  return prices
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate session user
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    const body = await request.json()
    const { dealId } = body
    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is a required parameter' }, { status: 400 })
    }

    // 2. Fetch profile credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_uses_remaining, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'super_admin' && (profile.ai_uses_remaining || 0) < 1)) {
      return NextResponse.json({ 
        error: 'You have run out of AI Deal audits. Please buy credits to unlock more audits.' 
      }, { status: 402 })
    }

    // 3. Fetch deal data with notes, call logs, and attachments
    const { data: deal, error: dealErr } = await supabase
      .from('deal_intelligence_files')
      .select(`
        *,
        arv_history:arv_history_id(*),
        mao_history:mao_history_id(*),
        notes:deal_notes(*),
        call_logs:deal_call_logs(*)
      `)
      .eq('id', dealId)
      .single()

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal Intelligence file not found' }, { status: 404 })
    }

    // 4. Deduct 1 credit
    const { success, error: deductError } = await deductCredits(
      supabase, 
      user.id, 
      'ai', 
      1, 
      `AI Deal Intelligence Audit for: ${deal.property_name}`
    )
    if (!success) {
      return NextResponse.json({ error: deductError || 'Failed to process credit deduction' }, { status: 500 })
    }

    interface Note {
      created_at: string
      note_text: string
    }
    interface CallLog {
      call_date: string
      summary: string
      outcome: string
    }

    // 5. AI MEMORY EVALUATION ENGINE (Chronological Trend Analysis)
    // Gather all seller notes & calls sorted chronologically (oldest to newest)
    const notesTexts = ((deal.notes || []) as Note[])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((n) => n.note_text)

    const callsTexts = ((deal.call_logs || []) as CallLog[])
      .sort((a, b) => new Date(a.call_date).getTime() - new Date(b.call_date).getTime())
      .map((c) => `${c.summary} (Outcome: ${c.outcome})`)

    const combinedHistoryTexts = [...notesTexts, ...callsTexts]

    // Extract price updates chronologically
    const priceTrendHistory = parsePricesFromHistory(combinedHistoryTexts)

    let motivationScore = 5
    let priceDropSummary = ''

    if (priceTrendHistory.length >= 2) {
      const firstPrice = priceTrendHistory[0]
      const lastPrice = priceTrendHistory[priceTrendHistory.length - 1]
      if (lastPrice < firstPrice) {
        motivationScore += 3 // Seller motivation boost
        priceDropSummary = `Price reduction trend detected: Asking price dropped from $${firstPrice.toLocaleString()} down to $${lastPrice.toLocaleString()}. `
      }
    }

    // Keyword motivation analysis
    const motivationKeywords = ['motivate', 'quick close', 'inherited', 'urgent', 'needs to sell', 'must sell', 'foreclosure', 'divorce', 'debt']
    const historyBlob = combinedHistoryTexts.join(' ').toLowerCase()
    
    motivationKeywords.forEach(keyword => {
      if (historyBlob.includes(keyword)) {
        motivationScore += 1
      }
    })

    motivationScore = Math.min(10, motivationScore)

    // Risk score calculation based on property details & rehab values
    let riskScore = 3
    const repairs = deal.arv_history?.estimated_repairs || deal.mao_history?.estimated_repairs || 0
    if (repairs > 40000) riskScore += 2
    if (repairs > 80000) riskScore += 2
    if (historyBlob.includes('roof') || historyBlob.includes('foundation') || historyBlob.includes('leak')) {
      riskScore += 1
    }
    riskScore = Math.min(10, riskScore)

    // Calculated offer range based on MAO
    const targetMao = deal.mao_history?.calculated_mao || deal.arv_history?.calculated_arv * 0.70 - repairs - 10000 || 150000
    const lowerOffer = Math.round(targetMao * 0.92)
    const upperOffer = Math.round(targetMao * 1.02)
    const recommendedOfferRange = `$${lowerOffer.toLocaleString()} - $${upperOffer.toLocaleString()}`

    // Deal score
    let dealScore = Math.round((motivationScore * 1.6 + (10 - riskScore)) / 2.6)
    if (dealScore > 10) dealScore = 10
    if (dealScore < 1) dealScore = 1

    // Build lists
    const negotiationSuggestions = [
      `Leverage the price drop trend: the seller lowered expectations from $${(priceTrendHistory[0] || targetMao * 1.2).toLocaleString()} showing high closing urgency.`,
      `Offer a rapid 14-day close if cash-funded, as seller note timeline highlights speed as a key decision factor.`,
      repairs > 30000 
        ? `Use the estimated repairs of $${repairs.toLocaleString()} to anchor negotiations, providing contractor quotes as justification.`
        : `Request an owner-finance option if seller desires a steady income stream over raw cash.`
    ]

    const potentialRedFlags = [
      repairs > 60000 ? `Heavy rehabilitation requirement ($${repairs.toLocaleString()}) could overrun budget without professional general contractors.` : `Standard cosmetic rehab parameters verified.`,
      historyBlob.includes('roof') ? `Roof replacement or structural inspection recommended before drafting purchase contract.` : `No explicit structural warnings found in notes.`,
      deal.status === 'Dead Lead' ? `Lead is currently marked as dead. Re-engage immediately or archive to avoid pipeline clutter.` : `Pipeline is active.`
    ]

    const recommendedNextAction = motivationScore >= 7
      ? `Draft a standard purchase agreement at $${lowerOffer.toLocaleString()} with a 15-day inspection contingency and submit to seller today.`
      : `Follow up via phone in 48 hours to gauge seller feedback on your offer range of ${recommendedOfferRange}.`

    const summaryReport = `AI Memory Workspace Audit for property: ${deal.property_name}.
${priceDropSummary}Based on chronological conversation logs, seller motivation is recorded at index ${motivationScore}/10. Risk bounds indicate a risk level of ${riskScore}/10. Comps average support an estimated ARV of $${(deal.arv_history?.calculated_arv || 0).toLocaleString()} with rehab costs of $${repairs.toLocaleString()}. Standard wholesaling maximum acquisition calculations recommend offering a target range between ${recommendedOfferRange}.`

    // 6. Save Analysis to Supabase
    const { data: newAnalysis, error: saveErr } = await supabase
      .from('deal_intelligence_analyses')
      .insert({
        deal_id: dealId,
        deal_score: dealScore,
        motivation_score: motivationScore,
        risk_score: riskScore,
        recommended_offer_range: recommendedOfferRange,
        negotiation_suggestions: negotiationSuggestions,
        potential_red_flags: potentialRedFlags,
        recommended_next_action: recommendedNextAction,
        summary: summaryReport
      })
      .select()
      .single()

    if (saveErr) {
      return NextResponse.json({ error: 'Failed to save analysis run: ' + saveErr.message }, { status: 500 })
    }

    // 7. Log to Activity Timeline
    await supabase
      .from('deal_activity_timeline')
      .insert({
        deal_id: dealId,
        event_type: 'Ran AI Analysis',
        description: `Executed Deal Intelligence AI Audit (Score: ${dealScore}/10, Motivation: ${motivationScore}/10).`
      })

    return NextResponse.json(newAnalysis)
  } catch (err) {
    console.error('Deal Intelligence AI Audit Error:', err)
    const errMsg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
