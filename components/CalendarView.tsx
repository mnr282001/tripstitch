"use client"

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, X, Clock, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

// Add isDevelopment check
// const isDevelopment = process.env.NODE_ENV === 'development'

type Calendar = Database['public']['Tables']['calendars']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Event = Database['public']['Tables']['events']['Row'] & {
  creator_profile?: Profile
}

interface CalendarViewProps {
  calendar: Calendar
  user: Profile
  onBack: () => void
}

export default function CalendarView({ calendar, user, onBack }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  // const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    time: '09:00',
    duration: 30,
    isMultiDay: false,
    color: calendar.color
  })
  const [filterColor, setFilterColor] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_created_by_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('calendar_id', calendar.id)
        .order('start_date', { ascending: true })

      if (error) throw error

      setEvents(data.map(event => ({
        ...event,
        creator_profile: event.profiles
      })))
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [calendar.id])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const resetEventForm = () => {
    setNewEvent({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      time: '09:00',
      duration: 30,
      isMultiDay: false,
      color: calendar.color
    })
    setEditingEvent(null)
  }

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return
    
    const endDate = newEvent.isMultiDay && newEvent.endDate ? newEvent.endDate : newEvent.startDate
    
    try {
      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            title: newEvent.title,
            description: newEvent.description || null,
            start_date: newEvent.startDate,
            end_date: endDate,
            time: newEvent.time,
            duration: newEvent.duration,
            is_multi_day: newEvent.isMultiDay,
            color: newEvent.color
          })
          .eq('id', editingEvent.id)

        if (error) throw error
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert({
            calendar_id: calendar.id,
            title: newEvent.title,
            description: newEvent.description || null,
            start_date: newEvent.startDate,
            end_date: endDate,
            time: newEvent.time,
            duration: newEvent.duration,
            is_multi_day: newEvent.isMultiDay,
            color: newEvent.color,
            created_by: user.id
          })

        if (error) throw error
      }

      await fetchEvents()
      resetEventForm()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      description: event.description || '',
      startDate: event.start_date,
      endDate: event.end_date,
      time: event.time || '09:00',
      duration: event.duration || 30,
      isMultiDay: event.is_multi_day || false,
      color: event.color
    })
    setShowAddModal(true)
    setShowAllActivitiesModal(false)
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      await fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleDeleteEvent = async (event: Event) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(event.id)
      setShowAddModal(false)
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getEventsForDate = (day: number | null) => {
    if (!day) return []
    const dateStr = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
    return events.filter(event => {
      if (event.is_multi_day) {
        return dateStr >= event.start_date && dateStr <= event.end_date
      } else {
        return event.start_date === dateStr
      }
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${period}`
  }

  const getEventDisplayInfo = (event: Event, currentDateStr: string) => {
    const isStart = event.start_date === currentDateStr
    const isEnd = event.end_date === currentDateStr
    const isMiddle = !isStart && !isEnd

    let displayTitle = event.title
    if (isStart) {
      displayTitle = `${event.title} (${formatTime(event.time || '09:00')})`
    } else if (isMiddle) {
      displayTitle = event.title
    } else if (isEnd) {
      displayTitle = event.title
    }

    return {
      displayTitle,
      isStart,
      isEnd,
      isMiddle
    }
  }

  const handleDateClick = (day: number | null) => {
    if (!day) return
    const clickedDate = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
    setNewEvent(prev => ({ ...prev, startDate: clickedDate }))
    setShowAddModal(true)
  }

  // const formatDuration = (minutes: number) => {
  //   if (minutes < 60) return `${minutes}min`
  //   const hours = Math.floor(minutes / 60)
  //   const mins = minutes % 60
  //   return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  // }

  // const monthNames = [
  //   'January', 'February', 'March', 'April', 'May', 'June',
  //   'July', 'August', 'September', 'October', 'November', 'December'
  // ]

  // const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // const colors = [
  //   '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'
  // ]

  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.start_date}T${a.time}`)
    const dateB = new Date(`${b.start_date}T${b.time}`)
    return dateA.getTime() - dateB.getTime()
  })

  const upcomingEvents = sortedEvents
    .filter(event => new Date(`${event.start_date}T${event.time}`) >= new Date())
    .slice(0, 5)

  const filteredEvents = filterColor 
    ? sortedEvents.filter(event => event.color === filterColor)
    : sortedEvents

  const uniqueColors = Array.from(new Set(events.map(event => event.color)))
  const colorCounts = uniqueColors.reduce((acc, color) => {
    acc[color || ''] = events.filter(event => event.color === color).length
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{calendar.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Calendar Section */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              {/* Calendar Header */}
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="p-2 rounded-md text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <h2 className="text-lg font-medium text-gray-900">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="p-2 rounded-md text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {/* <div className="flex items-center space-x-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          selectedColor === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div> */}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  {getDaysInMonth(currentDate).map((day, index) => (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`bg-white min-h-[100px] p-2 ${
                        day ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-medium text-gray-900">{day}</div>
                          <div className="mt-1 space-y-1">
                            {getEventsForDate(day).map((event) => {
                              const { displayTitle, isStart, isEnd } = getEventDisplayInfo(event, formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)))
                              if (!displayTitle) return null
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditEvent(event)
                                  }}
                                  className={`text-xs p-1 rounded truncate cursor-pointer ${
                                    isStart ? 'rounded-l-none' : ''
                                  } ${isEnd ? 'rounded-r-none' : ''}`}
                                  style={{ backgroundColor: event.color || '#6B7280' }}
                                >
                                  {displayTitle}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities Section */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
                  <button
                    onClick={() => setShowAllActivitiesModal(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Show All
                  </button>
                </div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-start space-x-3">
                        <div
                          className="h-2 w-2 rounded-full mt-2"
                          style={{ backgroundColor: event.color || '#6B7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.title}
                          </p>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {new Date(event.start_date).toLocaleDateString()} at {formatTime(event.time || '09:00')}
                            </span>
                          </div>
                          {event.creator_profile && (
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <Users className="h-3 w-3 mr-1" />
                              <span>Created by {event.creator_profile.full_name || event.creator_profile.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingEvent ? 'Edit Event' : 'Add Event'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetEventForm()
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleAddEvent(); }} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                      Time
                    </label>
                    <input
                      type="time"
                      id="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="duration"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                      min="15"
                      step="15"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <input
                      type="color"
                      id="color"
                      value={newEvent.color || '#6B7280'}
                      onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                      className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isMultiDay"
                    checked={newEvent.isMultiDay}
                    onChange={(e) => setNewEvent({ ...newEvent, isMultiDay: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isMultiDay" className="ml-2 block text-sm text-gray-900">
                    Multi-day event
                  </label>
                </div>
                {newEvent.isMultiDay && (
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      min={newEvent.startDate}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(editingEvent)}
                      className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete Event
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetEventForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingEvent ? 'Save Changes' : 'Add Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* All Activities Modal */}
      {showAllActivitiesModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">All Activities</h3>
                <button
                  onClick={() => setShowAllActivitiesModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFilterColor(null)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        !filterColor
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } border`}
                    >
                      All
                    </button>
                    {uniqueColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFilterColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          filterColor === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color || '#6B7280' }}
                        title={`${colorCounts[color || '']} events`}
                      />
                    ))}
                  </div>
                </div>
                {filterColor && (
                  <button
                    onClick={() => setFilterColor(null)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No events found</p>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div
                        className="h-2 w-2 rounded-full mt-2"
                        style={{ backgroundColor: event.color || '#6B7280' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {new Date(event.start_date).toLocaleDateString()} at {formatTime(event.time || '09:00')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        {event.creator_profile && (
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <Users className="h-3 w-3 mr-1" />
                            <span>Created by {event.creator_profile.full_name || event.creator_profile.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}