import { SupabaseClient } from '@supabase/supabase-js'

export const BASELINE_STATS = {
  totalUsers: 10,
  dealsSourced: 8,
  lessonsCompleted: 200,
  activeMembers: 7
}

export interface PlatformStats {
  totalUsers: number
  dealsSourced: number
  lessonsCompleted: number
  activeMembers: number
}

/**
 * Fetches actual live data from Supabase and adds it on top of the baseline stats.
 */
export async function getPlatformStats(supabase: SupabaseClient): Promise<PlatformStats> {
  try {
    // Run all counts in parallel for optimal performance
    const [
      { count: uCount },
      { count: dCount },
      { count: lCount },
      { count: aCount }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      supabase.from('user_lessons').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).not('last_active_date', 'is', null)
    ])

    return {
      totalUsers: BASELINE_STATS.totalUsers + (uCount || 0),
      dealsSourced: BASELINE_STATS.dealsSourced + (dCount || 0),
      lessonsCompleted: BASELINE_STATS.lessonsCompleted + (lCount || 0),
      activeMembers: BASELINE_STATS.activeMembers + (aCount || 0)
    }
  } catch (err) {
    console.error('Error fetching platform statistics:', err)
    // Return baseline stats if fetch fails
    return {
      totalUsers: BASELINE_STATS.totalUsers,
      dealsSourced: BASELINE_STATS.dealsSourced,
      lessonsCompleted: BASELINE_STATS.lessonsCompleted,
      activeMembers: BASELINE_STATS.activeMembers
    }
  }
}
