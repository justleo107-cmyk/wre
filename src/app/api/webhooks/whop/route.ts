import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const rawPayload = await request.text()
    
    // 1. Extract Whop Webhook Signature Headers (Svix standard)
    const svixId = request.headers.get('webhook-id') || request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('webhook-timestamp') || request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('webhook-signature') || request.headers.get('svix-signature')

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET

    // 2. Perform Webhook Signature Verification
    if (webhookSecret && svixId && svixTimestamp && svixSignature) {
      try {
        // Strip the secret prefix if present
        const secretPart = webhookSecret.startsWith('whsec_') 
          ? webhookSecret.substring(6) 
          : webhookSecret

        const secretBytes = Buffer.from(secretPart, 'base64')
        const signedContent = `${svixId}.${svixTimestamp}.${rawPayload}`

        const expectedSignature = crypto
          .createHmac('sha256', secretBytes)
          .update(signedContent)
          .digest('base64')

        let isVerified = false
        const signatures = svixSignature.split(' ')
        for (const sig of signatures) {
          const [version, signatureVal] = sig.split(',')
          if (version === 'v1' && signatureVal) {
            const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
            const actualBuffer = Buffer.from(signatureVal, 'utf8')
            
            if (expectedBuffer.length === actualBuffer.length && 
                crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
              isVerified = true
              break
            }
          }
        }

        if (!isVerified) {
          console.error('Whop webhook signature mismatch')
          return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 401 })
        }
      } catch (err) {
        const error = err as Error
        console.error('Error verifying Whop webhook signature:', error.message)
        return NextResponse.json({ error: 'Signature verification error' }, { status: 400 })
      }
    } else if (webhookSecret) {
      // Secret is configured but required headers are missing
      console.error('Whop webhook missing required signature headers')
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
    } else {
      console.warn('WHOP_WEBHOOK_SECRET is not configured. Signature verification bypassed in development mode.')
    }

    // 3. Parse Webhook Event
    const event = JSON.parse(rawPayload)
    const { id: eventId, type, data } = event

    if (!eventId || !type) {
      return NextResponse.json({ error: 'Invalid webhook payload structure' }, { status: 400 })
    }

    console.log(`Processing Whop webhook event: ${type} (ID: ${eventId})`)

    // 4. Reject Duplicate Webhook Deliveries
    const { data: existingLog } = await supabase
      .from('whop_webhook_logs')
      .select('id')
      .eq('id', eventId)
      .maybeSingle()

    if (existingLog) {
      console.log(`Webhook event ${eventId} already processed. Ignoring duplicate.`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Insert log to secure against race conditions / duplicates
    const { error: insertLogErr } = await supabase
      .from('whop_webhook_logs')
      .insert({ id: eventId, event_type: type })

    if (insertLogErr) {
      console.error('Failed to log webhook event ID:', insertLogErr)
      return NextResponse.json({ error: 'Duplicate logging failed' }, { status: 500 })
    }

    // 5. Handle successful purchases
    if (type === 'payment.succeeded') {
      const paymentData = data
      const userEmail = paymentData?.user?.email
      const productTitle = paymentData?.product?.title || 'Credit Pack'
      const paymentId = paymentData?.id || 'unknown_payment'

      if (!userEmail) {
        console.warn('Payment succeeded webhook received but user email is missing')
        return NextResponse.json({ received: true, warning: 'Missing user email' })
      }

      // Lookup user UUID by email via security definer RPC
      const { data: userId, error: lookupErr } = await supabase
        .rpc('get_user_id_by_email', { p_email: userEmail })

      if (lookupErr || !userId) {
        console.error(`User not found in Vanta database for email: ${userEmail}`, lookupErr)
        return NextResponse.json({ received: true, warning: 'User not registered in database' })
      }

      // Identify purchased credit packs and map to credit values
      let arvCredits = 0
      let maoCredits = 0
      let aiUses = 0

      const titleLower = productTitle.toLowerCase()

      if (titleLower.includes('starter') || titleLower.includes('110')) {
        arvCredits = 50
        maoCredits = 50
        aiUses = 10
      } else if (titleLower.includes('pro') || titleLower.includes('250')) {
        arvCredits = 100
        maoCredits = 100
        aiUses = 50
      } else if (titleLower.includes('enterprise') || titleLower.includes('max') || titleLower.includes('500')) {
        arvCredits = 200
        maoCredits = 200
        aiUses = 100
      } else {
        // Default standard top-up pack (e.g. 50 ARV, 50 MAO, 10 AI)
        arvCredits = 50
        maoCredits = 50
        aiUses = 10
      }

      const featureDesc = `Whop Credit Purchase: ${productTitle} (Ref: ${paymentId})`

      // Add credits and log transaction inside DB transaction block using RPC
      const { error: purchaseErr } = await supabase.rpc('handle_whop_credit_purchase', {
        p_user_id: userId,
        p_arv_credits: arvCredits,
        p_mao_credits: maoCredits,
        p_ai_uses: aiUses,
        p_feature_desc: featureDesc
      })

      if (purchaseErr) {
        console.error('Failed to log credits transaction and update balance:', purchaseErr)
        return NextResponse.json({ error: 'Failed to process purchase top-up' }, { status: 500 })
      }

      console.log(`Successfully credited user ${userEmail} with ${arvCredits} ARV, ${maoCredits} MAO, and ${aiUses} AI credits.`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const error = err as Error
    console.error('Whop webhook router exception:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
