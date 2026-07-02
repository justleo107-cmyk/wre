import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlatformStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const stats = await getPlatformStats(supabase)
    return NextResponse.json(stats)
  } catch (err: any) {
    console.error('Stats API GET Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
