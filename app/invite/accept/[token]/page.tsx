// app/invite/accept/[token]/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, CheckCircle, XCircle, Users, Mail, Lock, User, ArrowRight } from 'lucide-react'

// Import Supabase only on client-side
import { supabase } from '@/lib/supabase'

export default function AcceptInvite() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: ''
  })

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      checkInvitation()
      checkUser()
    }
  }, [params.token])

  const checkInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_invitations')
        .select(`
          *,
          calendars (
            id,
            name,
            description,
            color
          ),
          profiles!calendar_invitations_invited_by_fkey (
            full_name,
            email
          )
        `)
        .eq('token', params.token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) throw error
      
      setInvitation(data)
      setSignUpData(prev => ({ ...prev, email: data.email }))
    } catch (error) {
      setMessage('Invalid or expired invitation link')
    } finally {
      setLoading(false)
    }
  }

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
  }

  const acceptInvitation = async () => {
    if (!user || !invitation) return

    setLoading(true)
    try {
      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create profile for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      // Add user to calendar
      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: invitation.calendar_id,
          user_id: user.id,
          role: invitation.role
        })

      if (memberError) throw memberError

      // Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from('calendar_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (inviteError) throw inviteError

      setSuccess(true)
      setMessage('Successfully joined the calendar!')
      
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (error: any) {
      console.error('Accept invitation error:', error)
      setMessage(error.message || 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpData.email || !signUpData.password || !signUpData.fullName) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName
          }
        }
      })

      if (error) throw error

      if (data.user && data.session) {
        setUser(data.user)
        await acceptInvitation()
      } else {
        setMessage('Please check your email to verify your account, then return to this page.')
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    const returnUrl = encodeURIComponent(window.location.href)
    router.push(`/?return=${returnUrl}`)
  }

  // Show loading while checking invitation
  if (loading && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Show invalid invitation
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to TripStitch
          </button>
        </div>
      </div>
    )
  }

  // Show success
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Team!</h1>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 font-medium">Successfully joined:</p>
            <p className="text-green-700">{invitation.calendars.name}</p>
            <p className="text-green-600 text-sm mt-1">Role: {invitation.role}</p>
          </div>
          <p className="text-gray-500 text-sm">Redirecting you to your dashboard...</p>
        </div>
      </div>
    )
  }

  // Main invitation page
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">TripStitch Invitation</h1>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-900 font-medium mb-2">
            {invitation.profiles?.full_name || invitation.profiles?.email || 'Someone'} invited you to:
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: invitation.calendars.color }}
            />
            <div>
              <h3 className="font-medium text-blue-800">{invitation.calendars.name}</h3>
              <p className="text-sm text-blue-600">
                Role: {invitation.role === 'editor' ? 'Editor (can add/edit events)' : 'Viewer (can view events)'}
              </p>
            </div>
          </div>
        </div>

        {invitation.calendars.description && (
          <div className="bg-gray-50 p-3 rounded-lg mb-6">
            <p className="text-gray-700 text-sm">{invitation.calendars.description}</p>
          </div>
        )}

        {!user ? (
          <div className="space-y-4">
            {!showSignUp ? (
              <>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Sign in or create an account to accept this invitation
                </p>
                <button
                  onClick={handleSignIn}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In to TripStitch
                </button>
                <div className="text-center">
                  <span className="text-gray-500 text-sm">Don't have an account? </span>
                  <button
                    onClick={() => setShowSignUp(true)}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    Create one
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">Create Your Account</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Creating Account...' : 'Create Account & Join'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowSignUp(false)}
                    className="text-gray-500 text-sm hover:text-gray-700"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Users className="h-4 w-4" />
              <span>Signed in as {user.email}</span>
            </div>
            <button
              onClick={acceptInvitation}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? 'Joining Calendar...' : 'Accept Invitation'}
            </button>
          </div>
        )}

        {message && (
          <div className={`text-center text-sm mt-4 p-3 rounded-lg ${
            message.includes('Successfully') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}