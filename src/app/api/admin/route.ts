import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Helper to authenticate the admin server-side
async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch role and suspension status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_suspended) {
    return null
  }
  return user
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'users') {
      const search = searchParams.get('search') || ''
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_admin_id: admin.id,
        p_search: search
      })
      if (error) throw error
      return NextResponse.json({ users: data || [] })
    }

    if (action === 'sessions') {
      const { data, error } = await supabase.rpc('admin_get_sessions', {
        p_admin_id: admin.id
      })
      if (error) throw error
      return NextResponse.json({ sessions: data || [] })
    }

    if (action === 'analytics') {
      const { data, error } = await supabase.rpc('admin_get_analytics', {
        p_admin_id: admin.id
      })
      if (error) throw error
      return NextResponse.json({ analytics: data || {} })
    }

    if (action === 'subscriptions') {
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*, profiles:user_id(username, full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error

      const activeCount = subs?.filter(s => s.status === 'active').length || 0
      const trialingCount = subs?.filter(s => s.status === 'trialing').length || 0
      const expiredCount = subs?.filter(s => s.status === 'canceled' || s.status === 'past_due').length || 0
      const monthlyRev = activeCount * 49 + trialingCount * 0
      const annualRev = monthlyRev * 12

      return NextResponse.json({
        subscriptions: subs || [],
        stats: { activeCount, trialingCount, expiredCount, monthlyRev, annualRev }
      })
    }

    if (action === 'moderation') {
      const { data: reviews, error: rErr } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(username, full_name)')
        .order('created_at', { ascending: false })
      if (rErr) throw rErr

      const { data: deals, error: dErr } = await supabase
        .from('deals')
        .select('*, profiles:owner_id(username, full_name)')
        .order('created_at', { ascending: false })
      if (dErr) throw dErr

      return NextResponse.json({
        reviews: reviews || [],
        deals: deals || []
      })
    }

    if (action === 'audit_logs') {
      const { data, error } = await supabase.rpc('admin_get_audit_logs', {
        p_admin_id: admin.id
      })
      if (error) throw error
      return NextResponse.json({ auditLogs: data || [] })
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin API GET Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const { action, targetUserId, role, reviewId, dealId, isSuspended } = body

    if (action === 'suspend') {
      if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId.' }, { status: 400 })
      const { error } = await supabase.rpc('admin_toggle_user_suspension', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_is_suspended: true
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: 'User suspended successfully.' })
    }

    if (action === 'reactivate') {
      if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId.' }, { status: 400 })
      const { error } = await supabase.rpc('admin_toggle_user_suspension', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_is_suspended: false
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: 'User reactivated successfully.' })
    }

    if (action === 'change_role') {
      if (!targetUserId || !role) return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
      const { error } = await supabase.rpc('admin_change_user_role', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_role: role
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: `User role changed to ${role}.` })
    }

    if (action === 'approve_review') {
      if (!reviewId) return NextResponse.json({ error: 'Missing reviewId.' }, { status: 400 })
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: true })
        .eq('id', reviewId)
      if (error) throw error
      
      // Log admin action
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin.id,
        action: 'APPROVE_REVIEW',
        target_id: reviewId,
        target_type: 'REVIEW',
        details: { approved: true }
      })
      return NextResponse.json({ success: true, message: 'Review approved.' })
    }

    if (action === 'disapprove_review') {
      if (!reviewId) return NextResponse.json({ error: 'Missing reviewId.' }, { status: 400 })
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: false })
        .eq('id', reviewId)
      if (error) throw error

      // Log admin action
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin.id,
        action: 'DISAPPROVE_REVIEW',
        target_id: reviewId,
        target_type: 'REVIEW',
        details: { approved: false }
      })
      return NextResponse.json({ success: true, message: 'Review hidden.' })
    }

    if (action === 'delete_review') {
      if (!reviewId) return NextResponse.json({ error: 'Missing reviewId.' }, { status: 400 })
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
      if (error) throw error

      // Log admin action
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin.id,
        action: 'DELETE_REVIEW',
        target_id: reviewId,
        target_type: 'REVIEW',
        details: { deleted: true }
      })
      return NextResponse.json({ success: true, message: 'Review deleted.' })
    }

    if (action === 'delete_deal') {
      if (!dealId) return NextResponse.json({ error: 'Missing dealId.' }, { status: 400 })
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)
      if (error) throw error

      // Log admin action
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin.id,
        action: 'DELETE_DEAL',
        target_id: dealId,
        target_type: 'DEAL',
        details: { deleted: true }
      })
      return NextResponse.json({ success: true, message: 'Deal deleted.' })
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin API POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
