import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate user session
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Fetch all voice notes for the authenticated user ordered by created_at descending
    const { data: notes, error: dbErr } = await supabase
      .from('voice_notes')
      .select('*, deal_intelligence_files:deal_id(property_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.error('Fetch Voice Notes Error:', dbErr)
      return NextResponse.json({ error: 'Failed to fetch voice notes: ' + dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ voiceNotes: notes || [] })
  } catch (err: unknown) {
    console.error('List Voice Notes Handler Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
