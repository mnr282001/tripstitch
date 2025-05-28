'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Plus, X, Edit3, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthForm from './AuthForm';
import { Event } from '@/types/database';

const TripPlanningCalendar = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Omit<Event, 'id' | 'created_at' | 'updated_at'>>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    time: '09:00',
    duration: 30,
    is_multi_day: false,
    color: '#3B82F6',
    calendar_id: '',
    created_by: ''
  });

  // Check auth state
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Load mock events
  useEffect(() => {
    if (!user) return; // Only load events when user is authenticated

    const mockEvents: Event[] = [
      {
        id: '1',
        title: 'Flight Arrival',
        description: 'Landing at JFK Airport',
        start_date: '2025-06-15',
        end_date: '2025-06-15',
        time: '14:30',
        duration: 60,
        is_multi_day: false,
        created_by: 'Alice',
        color: '#EF4444',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calendar_id: '1'
      },
      {
        id: '2',
        title: 'Hotel Stay',
        description: 'Downtown Hotel Reservation',
        start_date: '2025-06-15',
        end_date: '2025-06-18',
        time: '16:00',
        duration: 30,
        is_multi_day: true,
        created_by: 'Bob',
        color: '#10B981',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calendar_id: '1'
      },
      {
        id: '3',
        title: 'Museum Visit',
        description: 'Metropolitan Museum of Art',
        start_date: '2025-06-16',
        end_date: '2025-06-16',
        time: '10:00',
        duration: 120,
        is_multi_day: false,
        created_by: 'Charlie',
        color: '#8B5CF6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calendar_id: '1'
      },
      {
        id: '4',
        title: 'Road Trip to Boston',
        description: 'Drive to Boston, visit landmarks',
        start_date: '2025-06-19',
        end_date: '2025-06-21',
        time: '08:00',
        duration: 480,
        is_multi_day: true,
        created_by: 'Alice',
        color: '#F59E0B',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calendar_id: '1'
      }
    ];
    setEvents(mockEvents);
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventsForDate = (day: number | null) => {
    if (!day) return [];
    const dateStr = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return events.filter(event => {
      if (event.is_multi_day) {
        return dateStr >= event.start_date && dateStr <= event.end_date;
      } else {
        return event.start_date === dateStr;
      }
    });
  };

  const getEventDisplayInfo = (event: Event, currentDateStr: string) => {
    if (!event.is_multi_day) {
      return {
        showTime: true,
        prefix: '',
        isStart: true,
        isEnd: true,
        isMiddle: false
      };
    }

    const isStart = currentDateStr === event.start_date;
    const isEnd = currentDateStr === event.end_date;
    const isMiddle = !isStart && !isEnd;

    return {
      showTime: isStart,
      prefix: isStart ? '▶ ' : isEnd ? '◀ ' : '▬ ',
      isStart,
      isEnd,
      isMiddle
    };
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start_date) return;
    
    const event: Event = {
      ...newEvent,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setEvents([...events, event]);
    setNewEvent({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      time: '09:00',
      duration: 30,
      is_multi_day: false,
      color: '#3B82F6',
      calendar_id: '',
      created_by: ''
    });
    setShowAddModal(false);
  };

  const handleDateClick = (day: number | null) => {
    if (!day) return;
    const clickedDate = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedDate(clickedDate);
    setNewEvent(prev => ({ ...prev, start_date: clickedDate }));
    setShowAddModal(true);
  };

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Trip Planning Calendar</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Activity
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-800">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Collaborative Planning</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Real-time Updates</span>
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-800 text-sm">
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
                        const dateStr = formatDateForInput(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                        const displayInfo = getEventDisplayInfo(event, dateStr);
                        return (
                          <div
                            key={`${event.id}-${dateStr}`}
                            className={`text-sm ${displayInfo.isStart ? 'font-bold' : ''} ${displayInfo.isEnd ? 'font-bold' : ''} ${displayInfo.isMiddle ? 'font-normal' : ''}`}
                          >
                            {displayInfo.showTime && (
                              <span className="text-gray-800">{event.time} - </span>
                            )}
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg relative max-w-md w-full">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-gray-900"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Add Activity</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Activity title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  placeholder="Activity description"
                  value={newEvent.description ?? ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-gray-900 placeholder-gray-500"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="multiDay"
                    checked={newEvent.is_multi_day}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, is_multi_day: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="multiDay" className="text-sm font-medium text-gray-900">Multi-day event</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fullDay"
                    checked={!newEvent.time}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      time: e.target.checked ? '' : '09:00',
                      duration: e.target.checked ? 0 : 30 
                    }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="fullDay" className="text-sm font-medium text-gray-900">Full day</label>
                </div>
              </div>

              {!newEvent.time && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full p-2 border rounded-lg text-gray-900"
                    />
                  </div>
                  {newEvent.is_multi_day && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                      <input
                        type="date"
                        value={newEvent.end_date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-gray-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {newEvent.time && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newEvent.start_date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-gray-900"
                      />
                    </div>
                    {newEvent.is_multi_day && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                        <input
                          type="date"
                          value={newEvent.end_date}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full p-2 border rounded-lg text-gray-900"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Time</label>
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={newEvent.duration}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, duration: Number(e.target.value) }))}
                        className="w-full p-2 border rounded-lg text-gray-900"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Color</label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    '#3B82F6', // blue
                    '#EF4444', // red
                    '#10B981', // green
                    '#8B5CF6', // purple
                    '#F59E0B', // orange
                    '#EC4899', // pink
                    '#06B6D4', // cyan
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewEvent(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        newEvent.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAddEvent}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanningCalendar;