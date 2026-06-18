import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch active pricing config using the SQL function get_active_pricing
    const { data: pricingData, error } = await supabase
      .rpc('get_active_pricing')

    // Fallback query if RPC isn't found or fails
    let activePricing = pricingData && pricingData.length > 0 ? pricingData[0] : null
    
    if (error || !activePricing) {
      console.warn('RPC get_active_pricing failed or returned empty, falling back to direct select query:', error)
      const { data: fallbackData } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()
      
      activePricing = fallbackData
    }

    if (!activePricing) {
      return NextResponse.json({ error: 'No active pricing configuration found.' }, { status: 404 })
    }

    const {
      stage,
      monthly_price,
      sixmonth_price,
      yearly_price,
      standard_monthly,
      standard_sixmonth,
      standard_yearly,
      spots_total,
      spots_used
    } = activePricing

    // Convert numeric fields to numbers to prevent string addition/multiplication bugs
    const mPrice = Number(monthly_price)
    const sPrice = Number(sixmonth_price)
    const yPrice = Number(yearly_price)
    const stdMonthly = Number(standard_monthly)
    const stdSixmonth = Number(standard_sixmonth)
    const stdYearly = Number(standard_yearly)

    const spotsTotal = spots_total !== null ? Number(spots_total) : null
    const spotsUsed = Number(spots_used)
    const spotsRemaining = spotsTotal !== null ? Math.max(0, spotsTotal - spotsUsed) : null

    // Calculations
    const savingsSixmonthVsMonthly = (mPrice * 6) - sPrice
    const savingsSixmonthVsStandard = stdSixmonth - sPrice

    const savingsYearlyVsMonthly = (mPrice * 12) - yPrice
    const savingsYearlyVsStandard = stdYearly - yPrice

    const output = {
      stage,
      prices: {
        monthly: mPrice,
        sixmonth: sPrice,
        yearly: yPrice
      },
      standardPrices: {
        monthly: stdMonthly,
        sixmonth: stdSixmonth,
        yearly: stdYearly
      },
      spots: {
        total: spotsTotal,
        used: spotsUsed,
        remaining: spotsRemaining
      },
      savings: {
        sixmonth: {
          vsMonthly: Number(savingsSixmonthVsMonthly.toFixed(2)),
          vsStandard: Number(savingsSixmonthVsStandard.toFixed(2))
        },
        yearly: {
          vsMonthly: Number(savingsYearlyVsMonthly.toFixed(2)),
          vsStandard: Number(savingsYearlyVsStandard.toFixed(2))
        }
      }
    }

    return NextResponse.json(output, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      }
    })
  } catch (err: any) {
    console.error('Pricing API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 })
  }
}
