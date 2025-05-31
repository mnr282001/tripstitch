"use client"

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, X, Clock, Users, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Calendar, Event, Profile } from '@/types/database'
import InviteModal from './InviteModal'

// Add isDevelopment check
const isDevelopment = process.env.NODE_ENV === 'development'

interface CalendarViewProps {
  calendar: Calendar
  user: Profile
  onBack: () => void
}

export default function CalendarView({ calendar, user, onBack }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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
      time: event.time,
      duration: event.duration,
      isMultiDay: event.is_multi_day,
      color: event.color
    })
    setShowAddModal(true)
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
    if (!event.is_multi_day) {
      return {
        showTime: true,
        prefix: '',
        isStart: true,
        isEnd: true,
        isMiddle: false
      }
    }

    const isStart = currentDateStr === event.start_date
    const isEnd = currentDateStr === event.end_date
    const isMiddle = !isStart && !isEnd

    return {
      showTime: isStart,
      prefix: isStart ? '▶ ' : isEnd ? '◀ ' : '▬ ',
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'
  ]

  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.start_date}T${a.time}`)
    const dateB = new Date(`${b.start_date}T${b.time}`)
    return dateA.getTime() - dateB.getTime()
  })

  const upcomingEvents = sortedEvents.slice(0, 5)
  const filteredEvents = selectedColor 
    ? sortedEvents.filter(event => event.color === selectedColor)
    : sortedEvents

  const uniqueColors = Array.from(new Set(events.map(event => event.color)))
  const colorCounts = uniqueColors.reduce((acc, color) => {
    acc[color] = events.filter(event => event.color === color).length
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{calendar.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Invite
              </button>
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Calendar Navigation */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setCurrentDate(newDate)
                  }}
                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <h2 className="text-lg font-medium text-gray-900">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setCurrentDate(newDate)
                  }}
                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                {['All', 'Red', 'Blue', 'Green', 'Yellow', 'Purple'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color === 'All' ? null : color.toLowerCase())}
                    className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md ${
                      selectedColor === (color === 'All' ? null : color.toLowerCase())
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-700"
                >
                  {day}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`bg-white min-h-[100px] p-2 ${
                    day === null ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {day !== null && (
                    <>
                      <div className="text-sm text-gray-900 mb-2">{day}</div>
                      <div className="space-y-1">
                        {getEventsForDate(day).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleEditEvent(event)}
                            className="w-full text-left p-1 text-xs rounded truncate"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                              border: `1px solid ${event.color}40`
                            }}
                          >
                            {event.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    />
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="duration"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetEventForm()
                    }}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingEvent ? 'Update' : 'Add'} Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          calendar={calendar}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}