import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deductCredits } from '@/lib/gamification'

interface VoiceNote {
  id: string
  user_id: string
  file_name: string
  file_url: string
  status: string
  created_at: string
  updated_at: string
}

export async function POST(request: Request) {
  let voiceNoteId: string | null = null
  let userId: string | null = null
  let voiceNote: VoiceNote | null = null
  let creditsDeducted = false

  try {
    const supabase = await createClient()

    // 1. Authenticate user session
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 })
    }
    userId = user.id

    // 2. Parse payload
    const body = await request.json()
    voiceNoteId = body.voiceNoteId
    if (!voiceNoteId) {
      return NextResponse.json({ error: 'Voice Note ID is required' }, { status: 400 })
    }

    // 3. Fetch voice note
    const { data: note, error: noteErr } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('id', voiceNoteId)
      .eq('user_id', user.id)
      .single()

    if (noteErr || !note) {
      return NextResponse.json({ error: 'Voice note record not found' }, { status: 404 })
    }
    voiceNote = note

    // 4. Verify user has at least 2 credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_uses_remaining, arv_credits, mao_credits, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'super_admin' && (profile.ai_uses_remaining || 0) < 2)) {
      return NextResponse.json({
        error: 'Insufficient credits. Each analysis requires 2 AI uses. Please purchase more credits.'
      }, { status: 402 })
    }

    // 5. Deduct 2 credits immediately before processing
    const { success, error: deductError } = await deductCredits(
      supabase,
      user.id,
      'ai',
      2,
      `AI Voice Note Analysis: ${note.file_name}`
    )

    if (!success) {
      return NextResponse.json({ error: deductError || 'Failed to process credit deduction' }, { status: 500 })
    }
    creditsDeducted = true

    // Update status to 'processing'
    await supabase
      .from('voice_notes')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', voiceNoteId)

    // 6. Download file from Supabase storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('voice-notes')
      .download(note.file_url)

    if (downloadErr || !fileData) {
      throw new Error('Failed to retrieve audio file from storage: ' + (downloadErr?.message || 'Empty file data'))
    }

    // 7. Call OpenAI Whisper API for transcription
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key is missing on the server config.')
    }

    const fileBuffer = await fileData.arrayBuffer()
    const fileBlob = new Blob([fileBuffer], { type: fileData.type || 'audio/mpeg' })
    const whisperFormData = new FormData()
    whisperFormData.append('file', fileBlob, note.file_name)
    whisperFormData.append('model', 'whisper-1')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: whisperFormData
    })

    if (!whisperResponse.ok) {
      const whisperErrText = await whisperResponse.text()
      console.error('Whisper Transcription API Error:', whisperErrText)
      throw new Error('OpenAI transcription engine failed to process audio.')
    }

    const whisperData = await whisperResponse.json()
    const transcriptText = whisperData.text

    if (!transcriptText || !transcriptText.trim()) {
      throw new Error('OpenAI transcription returned empty text. Check audio volume or clarity.')
    }

    // 8. Call OpenAI GPT-4o for structured analysis
    const systemPrompt = `You are a real estate wholesaling AI assistant. Analyze this seller conversation transcript and extract structured information. Return a JSON object with exactly these fields:
- summary (2-3 sentence deal summary)
- seller_motivation (one of: Tired Landlord, Foreclosure, Divorce, Relocation, Inherited Property, Financial Hardship, Vacant Property, Other)
- property_condition (one of: Excellent, Good, Fair, Poor, Distressed)
- timeline (how urgently the seller wants to sell based on the conversation)
- asking_price (any price mentioned by the seller, or Not mentioned)
- recommended_next_action (specific actionable next step for the wholesaler)

Return only valid JSON, no markdown, no extra text.`

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Seller conversation transcript:\n\n${transcriptText}` }
        ]
      })
    })

    if (!gptResponse.ok) {
      const gptErrText = await gptResponse.text()
      console.error('GPT-4o API Error:', gptErrText)
      throw new Error('OpenAI analysis engine failed to audit the transcript.')
    }

    const gptData = await gptResponse.json()
    const resultJsonStr = gptData.choices[0]?.message?.content
    if (!resultJsonStr) {
      throw new Error('OpenAI analysis returned empty content.')
    }

    const extracted = JSON.parse(resultJsonStr)

    // 9. Save extracted analysis fields to database and set status to completed
    const { error: updateErr } = await supabase
      .from('voice_notes')
      .update({
        status: 'completed',
        transcript: transcriptText,
        summary: extracted.summary || 'Summary not extracted.',
        seller_motivation: extracted.seller_motivation || 'Other',
        property_condition: extracted.property_condition || 'Good',
        timeline: extracted.timeline || 'Not mentioned',
        asking_price: extracted.asking_price || 'Not mentioned',
        recommended_next_action: extracted.recommended_next_action || 'Follow up with seller.',
        updated_at: new Date().toISOString()
      })
      .eq('id', voiceNoteId)

    if (updateErr) {
      throw new Error('Failed to save completed analysis to database: ' + updateErr.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Voice Notes AI Analysis Error:', err)

    const supabase = await createClient()

    // 10. Refund 2 credits if failure occurred and credits were deducted
    if (creditsDeducted && userId && voiceNote) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ai_uses_remaining, arv_credits, mao_credits, role')
          .eq('id', userId)
          .single()

        if (profile && profile.role !== 'super_admin') {
          const nextAiUses = (profile.ai_uses_remaining || 0) + 2
          await supabase
            .from('profiles')
            .update({ ai_uses_remaining: nextAiUses })
            .eq('id', userId)

          // Log transaction refund
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            feature: `Refund: Failed voice note analysis for "${voiceNote?.file_name || 'unknown'}"`,
            credits_used: 0,
            credits_added: 2,
            balance: (profile.arv_credits || 0) + (profile.mao_credits || 0) + nextAiUses
          })
        }
      } catch (refundErr) {
        console.error('Failed to issue credit refund:', refundErr)
      }
    }

    // Set voice note status to failed
    if (voiceNoteId && userId) {
      await supabase
        .from('voice_notes')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', voiceNoteId)
    }

    const errMsg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
