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

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const dealId = formData.get('dealId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // 3. Validate file type and size
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/vnd.dlna.adts', 'audio/x-wav']
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['mp3', 'wav', 'm4a', 'mp4']

    const isTypeAllowed = allowedTypes.includes(file.type) || (fileExt && allowedExts.includes(fileExt))
    if (!isTypeAllowed) {
      return NextResponse.json({ error: 'Unsupported file format. Please upload MP3, WAV, or M4A.' }, { status: 400 })
    }

    const maxSizeBytes = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File size exceeds the 25MB limit.' }, { status: 400 })
    }

    // 4. Upload to Supabase Storage (Private bucket)
    const fileNameClean = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${Date.now()}_${fileNameClean}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: storageErr } = await supabase.storage
      .from('voice-notes')
      .upload(storagePath, buffer, {
        contentType: file.type || 'audio/mpeg',
        upsert: true
      })

    if (storageErr) {
      console.error('Supabase Storage Upload Error:', storageErr)
      return NextResponse.json({ error: 'Failed to upload audio to storage. ' + storageErr.message }, { status: 500 })
    }

    // 5. Save record to database table voice_notes with status 'uploaded'
    const { data: voiceNote, error: dbErr } = await supabase
      .from('voice_notes')
      .insert({
        user_id: user.id,
        deal_id: dealId || null,
        file_name: file.name,
        file_url: storagePath,
        file_size: file.size,
        status: 'uploaded'
      })
      .select('id')
      .single()

    if (dbErr) {
      console.error('Database Save Error:', dbErr)
      // Attempt clean up
      await supabase.storage.from('voice-notes').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save voice note record to database: ' + dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ voiceNoteId: voiceNote.id })
  } catch (err: any) {
    console.error('Voice Notes Upload Handler Error:', err)
    return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 })
  }
}
