import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Get current authenticated user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Query user profile to verify role and suspension status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_suspended) {
    // Fail silently and redirect regular users to standard dashboard
    redirect('/dashboard')
  }

  return <>{children}</>
}
