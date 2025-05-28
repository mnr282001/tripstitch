"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Plus, Users, LogOut } from 'lucide-react'
import type { Calendar as CalendarType, Profile } from '@/types/database'
import CalendarView from './CalendarView'
import CreateCalendarModal from './CreateCalendarModal'
import InviteModal from './InviteModal'

interface DashboardProps {
  user: any
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [calendars, setCalendars] = useState<CalendarType[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarType | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
      fetchCalendars()
    }
  }, [user])

  const fetchProfile = async () => {
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
            full_name: user.user_metadata?.full_name || user.email
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
  }

  const fetchCalendars = async () => {
    if (!user?.id) return
    
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
          updated_at: string;
          profiles: {
            id: string;
            full_name: string;
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
            updated_at,
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

      const formattedCalendars: CalendarType[] = (data as unknown as CalendarMemberWithCalendar[]).map(item => ({
        id: item.calendars.id,
        name: item.calendars.name,
        description: item.calendars.description,
        color: item.calendars.color,
        created_by: item.calendars.created_by,
        created_at: item.calendars.created_at,
        updated_at: item.calendars.updated_at,
        user_role: item.role,
        creator_profile: item.calendars.profiles
      }))

      setCalendars(formattedCalendars)
    } catch (error) {
      console.error('Error fetching calendars:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCalendar = async (name: string, description: string, color: string) => {
    if (!user?.id) return

    try {
      // Create calendar
      const { data: calendar, error: calendarError } = await supabase
        .from('calendars')
        .insert({
          name,
          description,
          color,
          created_by: user.id
        })
        .select()
        .single()

      if (calendarError) throw calendarError

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      await fetchCalendars()
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating calendar:', error)
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
        onInvite={() => setShowInviteModal(true)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">TripStitch</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {profile?.full_name || user?.email || 'User'}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Trip Calendars</h2>
            <p className="text-gray-600 mt-2">
              {calendars.length === 0 
                ? "Create your first calendar to start planning trips"
                : `You have access to ${calendars.length} calendar${calendars.length === 1 ? '' : 's'}`
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Calendar
          </button>
        </div>

        {/* Calendars Grid */}
        {calendars.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No calendars yet</h3>
            <p className="text-gray-600 mb-6">Create your first trip calendar to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Calendar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calendars.map(calendar => (
              <div
                key={calendar.id}
                onClick={() => setSelectedCalendar(calendar)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: calendar.color }}
                    />
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      calendar.user_role === 'owner' 
                        ? 'bg-blue-100 text-blue-700'
                        : calendar.user_role === 'editor'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {calendar.user_role}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {calendar.name}
                  </h3>
                  
                  {calendar.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {calendar.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Created by {calendar.creator_profile?.full_name || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>1</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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