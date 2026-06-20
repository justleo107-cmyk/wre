import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user session
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }

    // 2. Parse payload
    const body = await request.json()
    const { voiceNoteId } = body

    if (!voiceNoteId) {
      return NextResponse.json({ error: 'Voice Note ID is required' }, { status: 400 })
    }

    // 3. Fetch voice note to verify ownership
    const { data: voiceNote, error: noteErr } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('id', voiceNoteId)
      .eq('user_id', user.id)
      .single()

    if (noteErr || !voiceNote) {
      return NextResponse.json({ error: 'Voice note not found or access denied' }, { status: 404 })
    }

    // 4. Delete file from Supabase Storage
    const { error: storageErr } = await supabase.storage
      .from('voice-notes')
      .remove([voiceNote.file_url])

    if (storageErr) {
      console.warn('Storage File Deletion Failed/Warning:', storageErr)
      // We can proceed to delete the DB record anyway to avoid orphan records
    }

    // 5. Delete record from database
    const { error: dbErr } = await supabase
      .from('voice_notes')
      .delete()
      .eq('id', voiceNoteId)

    if (dbErr) {
      console.error('Database Deletion Error:', dbErr)
      return NextResponse.json({ error: 'Failed to delete database record: ' + dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Delete Voice Note Handler Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
