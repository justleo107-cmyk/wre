import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhopSubscriptionStatus } from '@/lib/whop'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get currently authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ user: null, membership: null })
    }

    // Retrieve their cached/fresh Whop membership details
    const membership = await getWhopSubscriptionStatus(user.id, user.email!)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username,
        full_name: user.user_metadata?.full_name
      },
      membership
    })
  } catch (error) {
    console.error('Error in Whop session route:', error)
    return NextResponse.json({ error: 'Failed to fetch session status' }, { status: 500 })
  }
}
