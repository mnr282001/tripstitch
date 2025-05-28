"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, Clock, Users, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Calendar, Event } from '@/types/database'

interface CalendarViewProps {
  calendar: Calendar
  user: any
  onBack: () => void
  onInvite: () => void
}

export default function CalendarView({ calendar, user, onBack, onInvite }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchEvents()
  }, [calendar.id])

  const fetchEvents = async () => {
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
  }

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return
    
    const endDate = newEvent.isMultiDay && newEvent.endDate ? newEvent.endDate : newEvent.startDate
    
    try {
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

      await fetchEvents()
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
      setShowAddModal(false)
    } catch (error) {
      console.error('Error creating event:', error)
    }
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
    setSelectedDate(clickedDate)
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: calendar.color }}
              />
              <h1 className="text-2xl font-bold text-gray-900">{calendar.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onInvite}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Invite
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Activity
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {calendar.description && (
          <p className="text-gray-600 mb-6">{calendar.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-8">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Collaborative Planning</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Real-time Updates</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`min-h-32 p-2 border rounded-lg cursor-pointer transition-colors ${
                    day ? 'hover:bg-blue-50 border-gray-200' : 'border-transparent'
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  {day && (
                    <>
                      <div className="font-medium text-gray-900 mb-1">{day}</div>
                      <div className="space-y-1">
                        {getEventsForDate(day).slice(0, 3).map(event => {
                          const dateStr = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
                          const displayInfo = getEventDisplayInfo(event, dateStr)
                          return (
                            <div
                              key={`${event.id}-${dateStr}`}
                              className={`text-xs p-1 rounded text-white truncate ${
                                displayInfo.isMiddle ? 'opacity-80' : ''
                              }`}
                              style={{ backgroundColor: event.color }}
                              title={`${event.title} - ${displayInfo.showTime ? event.time + ' ' : ''}(${formatDuration(event.duration)})${event.is_multi_day ? ` • ${event.start_date} to ${event.end_date}` : ''}`}
                            >
                              {displayInfo.prefix}{displayInfo.showTime ? event.time + ' ' : ''}{event.title}
                            </div>
                          )
                        })}
                        {getEventsForDate(day).length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{getEventsForDate(day).length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Upcoming Activities</h3>
          </div>
          <div className="p-4">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activities planned yet. Add some to get started!</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-gray-600">
                          {event.is_multi_day ? (
                            <span>{event.start_date} to {event.end_date} • starts at {event.time} • by {event.creator_profile?.full_name || 'Unknown'}</span>
                          ) : (
                            <span>{event.start_date} at {event.time} • {formatDuration(event.duration)} • by {event.creator_profile?.full_name || 'Unknown'}</span>
                          )}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                        )}
                      </div>
                    </div>
                    {(calendar.user_role === 'owner' || event.created_by === user.id) && (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Activity</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Museum Visit"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={newEvent.isMultiDay}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      isMultiDay: e.target.checked,
                      endDate: e.target.checked ? prev.endDate : prev.startDate
                    }))}
                    className="mr-2"
                  />
                  Multi-day event
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newEvent.isMultiDay ? 'Start Date *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {newEvent.isMultiDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      min={newEvent.startDate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                {!newEvent.isMultiDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              
              {newEvent.isMultiDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration {newEvent.isMultiDay ? '(per day)' : ''}
                </label>
                <select
                  value={newEvent.duration}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>All day (8 hours)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewEvent(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newEvent.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEvent.title || !newEvent.startDate || (newEvent.isMultiDay && !newEvent.endDate)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}