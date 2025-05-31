"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Plus, Users, LogOut, LayoutGrid, List } from 'lucide-react'
import type { Calendar as CalendarType, Profile } from '@/types/database'
import CalendarView from './CalendarView'
import CreateCalendarModal from './CreateCalendarModal'
import InviteModal from './InviteModal'
import { PostgrestError } from '@supabase/supabase-js'

interface DashboardProps {
  user: Profile
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [calendars, setCalendars] = useState<CalendarType[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarType | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

      console.log('Fetch calendars result:', { data, error })

      if (error) {
        console.error('Fetch calendars error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Get member counts for each calendar
      const calendarIds = (data as unknown as CalendarMemberWithCalendar[]).map(item => item.calendars.id)
      const { data: memberCounts, error: countError } = await supabase
        .from('calendar_members')
        .select('calendar_id')
        .in('calendar_id', calendarIds)

      if (countError) throw countError

      // Count members manually
      const memberCountMap = new Map<string, number>()
      ;(memberCounts as { calendar_id: string }[]).forEach(item => {
        const currentCount = memberCountMap.get(item.calendar_id) || 0
        memberCountMap.set(item.calendar_id, currentCount + 1)
      })

      const formattedCalendars: CalendarType[] = (data as unknown as CalendarMemberWithCalendar[]).map(item => ({
        id: item.calendars.id,
        name: item.calendars.name,
        description: item.calendars.description,
        color: item.calendars.color,
        created_by: item.calendars.created_by,
        created_at: item.calendars.created_at,
        updated_at: item.calendars.created_at,
        user_role: item.role,
        creator_profile: item.calendars.profiles,
        member_count: memberCountMap.get(item.calendars.id) || 1
      }))

      console.log('Formatted calendars:', formattedCalendars)
      setCalendars(formattedCalendars)
    } catch (error: unknown) {
      console.error('Error fetching calendars:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof PostgrestError ? error.details : undefined,
        hint: error instanceof PostgrestError ? error.hint : undefined,
        code: error instanceof PostgrestError ? error.code : undefined
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
      fetchCalendars()
    }
  }, [user?.id, fetchProfile, fetchCalendars])

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        style={{ backgroundColor: calendar.color }}
                      >
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{calendar.name}</h3>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {calendar.description || 'No description'}
                        </p>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{calendar.member_count} members</span>
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
                              style={{ backgroundColor: calendar.color }}
                            >
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{calendar.name}</p>
                              <p className="text-sm text-gray-500">
                                {calendar.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-sm text-gray-500">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{calendar.member_count}</span>
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
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateCalendarModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCalendar}
        />
      )}
      {showInviteModal && selectedCalendar && (
        <InviteModal
          calendar={selectedCalendar}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}