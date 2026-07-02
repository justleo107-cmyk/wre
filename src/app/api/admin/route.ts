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
    const { action, targetUserId, role } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId.' }, { status: 400 })
    }

    if (action === 'suspend') {
      const { error } = await supabase.rpc('admin_toggle_user_suspension', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_is_suspended: true
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: 'User suspended successfully.' })
    }

    if (action === 'reactivate') {
      const { error } = await supabase.rpc('admin_toggle_user_suspension', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_is_suspended: false
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: 'User reactivated successfully.' })
    }

    if (action === 'change_role') {
      if (!role) {
        return NextResponse.json({ error: 'Missing role.' }, { status: 400 })
      }
      const { error } = await supabase.rpc('admin_change_user_role', {
        p_admin_id: admin.id,
        p_target_user_id: targetUserId,
        p_role: role
      })
      if (error) throw error
      return NextResponse.json({ success: true, message: `User role changed to ${role}.` })
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin API POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
