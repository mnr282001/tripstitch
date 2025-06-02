"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Plus, Users, LogOut, LayoutGrid, List, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database.types'
import CalendarView from './CalendarView'
import CreateCalendarModal from './CreateCalendarModal'
import { PostgrestError } from '@supabase/supabase-js'

type Calendar = Database['public']['Tables']['calendars']['Row'] & {
  user_role: 'owner' | 'editor' | 'viewer'
}
type Profile = Database['public']['Tables']['profiles']['Row'] 

interface DashboardProps {
  user: Profile
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [showInvitesSidebar, setShowInvitesSidebar] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user?.full_name || user.email
          })
          .select()
          .single()

        if (createError) throw createError
        setProfile(newProfile)
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }, [user?.id, user?.email, user?.full_name])

  const fetchCalendars = useCallback(async () => {
    if (!user?.id) {
      console.error('No user ID for fetching calendars')
      return
    }
    
    console.log('Fetching calendars for user:', user.id)

    try {
      type CalendarMemberWithCalendar = {
        role: 'owner' | 'editor' | 'viewer';
        calendars: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          created_by: string;
          created_at: string;
          profiles: {
            id: string;
            full_name: string | null;
            email: string;
            avatar_url: string | null;
            created_at: string;
            updated_at: string;
          };
        };
      };

      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          role,
          calendars (
            id,
            name,
            description,
            color,
            created_by,
            created_at,
            profiles!calendars_created_by_fkey (
              id,
              full_name,
              email,
              avatar_url,
              created_at,
              updated_at
            )
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Get member counts for each calendar
      const calendarIds = (data as unknown as CalendarMemberWithCalendar[]).map(item => item.calendars.id)
      const { data: memberCounts, error: countError } = await supabase
        .from('calendar_members')
        .select('calendar_id')
        .in('calendar_id', calendarIds)

      if (countError) throw countError

      // Count members manually
      const memberCountMap: Record<string, number> = {}
      ;(memberCounts as { calendar_id: string }[]).forEach(item => {
        memberCountMap[item.calendar_id] = (memberCountMap[item.calendar_id] || 0) + 1
      })

      setMemberCounts(memberCountMap)

      const formattedCalendars: Calendar[] = (data as unknown as CalendarMemberWithCalendar[]).map(item => ({
        id: item.calendars.id,
        name: item.calendars.name,
        description: item.calendars.description,
        color: item.calendars.color,
        created_by: item.calendars.created_by,
        created_at: item.calendars.created_at,
        updated_at: item.calendars.created_at,
        user_role: item.role,
        creator_profile: item.calendars.profiles
      }))

      setCalendars(formattedCalendars)
    } catch (error: unknown) {
      console.error('Error fetching calendars:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Fetch pending invites for the sidebar
  const fetchPendingInvites = useCallback(async () => {
    setInvitesLoading(true)
    try {
      const { data, error } = await supabase
        .from('calendar_invitations')
        .select(`*, calendars(id, name, description, color)`) // adjust as needed
        .eq('email', user.email)
        .is('accepted_at', null)
        .is('rejected_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPendingInvites(data || [])
    } catch (e) {
      setPendingInvites([])
    } finally {
      setInvitesLoading(false)
    }
  }, [user.email])

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
      fetchCalendars()
      fetchPendingInvites()
    }
  }, [user?.id, fetchProfile, fetchCalendars, fetchPendingInvites])

  const handleCreateCalendar = async (name: string, description: string, color: string) => {
    if (!user?.id) {
      console.error('No user ID available')
      return
    }

    console.log('Attempting to create calendar:', { name, description, color, user_id: user.id })

    try {
      // First, let's check if we can access the calendars table at all
      const { data: testData, error: testError } = await supabase
        .from('calendars')
        .select('id')
        .limit(1)

      console.log('Test query result:', { testData, testError })

      // Create calendar
      const { data: calendar, error: calendarError } = await supabase
        .from('calendars')
        .insert({
          name,
          description: description || null,
          color,
          created_by: user.id
        })
        .select()
        .single()

      console.log('Calendar insert result:', { calendar, calendarError })

      if (calendarError) {
        console.error('Calendar creation failed:', {
          message: calendarError.message,
          details: calendarError.details,
          hint: calendarError.hint,
          code: calendarError.code
        })
        throw calendarError
      }

      if (!calendar) {
        throw new Error('Calendar was not created - no data returned')
      }

      console.log('Calendar created successfully:', calendar)

      // Add creator as owner
      const { data: member, error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
          role: 'owner'
        })
        .select()
        .single()

      console.log('Member insert result:', { member, memberError })

      if (memberError) {
        console.error('Member creation failed:', {
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint,
          code: memberError.code
        })
        throw memberError
      }

      console.log('Member created successfully, fetching calendars...')
      await fetchCalendars()
      setShowCreateModal(false)
    } catch (error: unknown) {
      console.error('Full error creating calendar:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof PostgrestError ? error.details : undefined,
        hint: error instanceof PostgrestError ? error.hint : undefined,
        code: error instanceof PostgrestError ? error.code : undefined,
        stack: error instanceof Error ? error.stack : undefined
      })
      alert(`Error creating calendar: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Filter to only show one invite per calendar (most recent)
  const uniquePendingInvites = Object.values(
    pendingInvites.reduce((acc, invite) => {
      if (!acc[invite.calendar_id] || new Date(invite.created_at) > new Date(acc[invite.calendar_id].created_at)) {
        acc[invite.calendar_id] = invite;
      }
      return acc;
    }, {} as Record<string, any>)
  ) as any[];
  // Filter out invites for calendars where the user is already a member
  const memberCalendarIds = new Set(calendars.map(c => c.id));
  const filteredPendingInvites = uniquePendingInvites.filter(
    invite => !memberCalendarIds.has(invite.calendar_id)
  );

  // Accept invite handler
  const handleAcceptInvite = async (invite: any) => {
    // Add to calendar_members if not already a member
    const { data: existingMember } = await supabase
      .from('calendar_members')
      .select('id')
      .eq('calendar_id', invite.calendar_id)
      .eq('user_id', user.id)
      .single();
    if (!existingMember) {
      await supabase.from('calendar_members').insert({
        calendar_id: invite.calendar_id,
        user_id: user.id,
        role: invite.role || 'viewer',
      });
    }
    // Mark all invites for this calendar and user as accepted
    await supabase
      .from('calendar_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('calendar_id', invite.calendar_id)
      .eq('email', user.email)
      .is('accepted_at', null)
      .is('rejected_at', null);
    fetchPendingInvites();
    fetchCalendars();
  };

  // Reject invite handler
  const handleRejectInvite = async (invite: any) => {
    await supabase
      .from('calendar_invitations')
      .update({ rejected_at: new Date().toISOString() })
      .eq('calendar_id', invite.calendar_id)
      .eq('email', user.email)
      .is('accepted_at', null)
      .is('rejected_at', null);
    fetchPendingInvites();
  };

  // const handleSignOut = async () => {
  //   await supabase.auth.signOut()
  //   onSignOut()
  // }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your calendars...</p>
        </div>
      </div>
    )
  }

  if (selectedCalendar) {
    return (
      <CalendarView
        calendar={selectedCalendar}
        user={user}
        onBack={() => setSelectedCalendar(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">TripStitch</h1>
              <div className="hidden sm:block text-gray-500">|</div>
              <p className="text-gray-600">
                Hi, {profile?.full_name || user?.email?.split('@')[0] || 'there'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex">
        {/* Collapsible Sidebar for pending invites */}
        {showInvitesSidebar ? (
          <aside className="w-full sm:w-72 mr-8 mb-8 sm:mb-0 relative">
            <button
              onClick={() => setShowInvitesSidebar(false)}
              className="absolute -right-4 top-4 bg-white border rounded-full shadow p-1 z-10 hover:bg-gray-100 flex items-center justify-center"
              title="Hide Pending Invites"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="h-5 w-5 mr-2 text-indigo-500" /> Pending Invites
              </h2>
              {invitesLoading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
              ) : filteredPendingInvites.length === 0 ? (
                <div className="text-gray-500 text-sm">No pending invites</div>
              ) : (
                <ul className="space-y-4">
                  {filteredPendingInvites.map((invite) => (
                    <li key={invite.id} className="border rounded p-3 bg-gray-50">
                      <div className="mb-2">
                        <span className="font-medium">{invite.calendars?.name || 'Calendar'}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{invite.role || 'viewer'}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">{invite.calendars?.description}</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectInvite(invite)}
                          className="px-3 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        ) : (
          <div className="flex flex-col items-center justify-start mr-2">
            <button
              onClick={() => setShowInvitesSidebar(true)}
              className="relative bg-white border rounded-l-lg shadow px-2 py-4 mt-8 hover:bg-gray-100 flex flex-col items-center"
              title="Show Pending Invites"
            >
              <Bell className="h-6 w-6 text-indigo-500" />
              {filteredPendingInvites.length > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
              <ChevronRight className="h-4 w-4 text-gray-500 mt-2" />
            </button>
          </div>
        )}
        {/* Main content area (calendars, etc.) */}
        <section className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : selectedCalendar ? (
            <CalendarView
              calendar={selectedCalendar}
              user={user}
              onBack={() => setSelectedCalendar(null)}
            />
          ) : (
            <div className="space-y-6">
              {/* View Toggle and Create Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="flex items-center bg-gray-100 rounded-lg w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`h-9 flex-1 sm:flex-none px-3 rounded-l-lg text-sm font-medium transition-colors ${
                      viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-5 w-5 mx-auto sm:mx-0" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`h-9 flex-1 sm:flex-none px-3 rounded-r-lg text-sm font-medium transition-colors ${
                      viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700'
                    }`}
                    title="List View"
                  >
                    <List className="h-5 w-5 mx-auto sm:mx-0" />
                  </button>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center h-9 w-full sm:w-auto px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Calendar
                </button>
              </div>

              {/* Calendar Display */}
              {calendars.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No calendars</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new calendar.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Calendar
                    </button>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {calendars.map((calendar) => (
                    <button
                      key={calendar.id}
                      onClick={() => setSelectedCalendar(calendar)}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left"
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: calendar.color || '#6B7280' }}
                        >
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 truncate">{calendar.name}</h3>
                            <div
                              className={`ml-2 px-2 py-1 rounded-full text-xs font-medium text-white ${
                                calendar.user_role === 'owner' 
                                  ? 'bg-indigo-500/70' 
                                  : calendar.user_role === 'editor'
                                  ? 'bg-blue-400/70'
                                  : 'bg-gray-500/70'
                              }`}
                            >
                              {calendar.user_role}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {calendar.description || 'No description'}
                          </p>
                          <div className="mt-4 flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{memberCounts[calendar.id] || 0} members</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {calendars.map((calendar) => (
                      <li key={calendar.id} className="hover:bg-gray-50">
                        <button
                          onClick={() => setSelectedCalendar(calendar)}
                          className="w-full px-4 py-4 sm:px-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="h-8 w-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: calendar.color || '#6B7280' }}
                              >
                                <Calendar className="h-4 w-4 text-white" />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900">{calendar.name}</p>
                                  <div
                                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium text-white ${
                                      calendar.user_role === 'owner' 
                                        ? 'bg-indigo-500/70' 
                                        : calendar.user_role === 'editor'
                                        ? 'bg-blue-400/70'
                                        : 'bg-gray-500/70'
                                    }`}
                                  >
                                    {calendar.user_role}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {calendar.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center text-sm text-gray-500">
                                <Users className="h-4 w-4 mr-1" />
                                <span>{memberCounts[calendar.id]}</span>
                                <span className="mx-2">•</span>
                                <span className="capitalize">{calendar.user_role}</span>
                              </div>
                              <div className="text-gray-400">
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateCalendarModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCalendar}
        />
      )}
    </div>
  )
}