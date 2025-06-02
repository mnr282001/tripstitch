"use client"

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Invitation = Database['public']['Tables']['calendar_invitations']['Row']

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingUp, setSigningUp] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const { data: invitation, error } = await supabase
          .from('calendar_invitations')
          .select('*')
          .eq('token', token)
          .single()

        if (error) throw error

        if (!invitation) {
          setError('Invalid or expired invitation link')
          return
        }

        if (invitation.accepted_at) {
          setError('This invitation has already been accepted')
          return
        }

        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
          setError('This invitation has expired')
          return
        }

        setInvitation(invitation)
        setEmail(invitation.email)
      } catch (error) {
        console.error('Error verifying invitation:', error)
        setError('Error verifying invitation')
      } finally {
        setLoading(false)
      }
    }

    verifyInvitation()
  }, [token])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)
    }
    checkAuth()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningUp(true)
    setError(null)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) {
        if (authError.message && authError.message.toLowerCase().includes('user already registered')) {
          setShowLogin(true)
          setError('You already have an account. Please log in.')
          return
        }
        throw authError
      }
      if (!authData.user) {
        throw new Error('No user data returned after signup')
      }
      setError('Check your email to confirm your account. After confirming, return to this page and log in.')
      setSigningUp(false)
      return
    } catch (error: any) {
      setError(error?.message || 'Error creating account. Please try again.')
    } finally {
      setSigningUp(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingIn(true)
    setError(null)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        throw authError
      }
      setAuthUser(authData.user)
      // After login, redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      setError(error?.message || 'Error logging in. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, show sign up/login UI
  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Calendar Invitation</h2>
            <p className="mt-2 text-sm text-gray-600">
              You've been invited to join a calendar
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div className="flex justify-center mb-4">
              <button
                className={`px-4 py-2 rounded-l-md border ${!showLogin ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setShowLogin(false)}
              >
                Sign Up
              </button>
              <button
                className={`px-4 py-2 rounded-r-md border ${showLogin ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setShowLogin(true)}
              >
                Log In
              </button>
            </div>
            {!showLogin ? (
              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={signingUp}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {signingUp ? 'Creating account...' : 'Create account and join calendar'}
                  </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loggingIn ? 'Logging in...' : 'Log in and join calendar'}
                  </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // If authenticated, show invitation acceptance UI
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Calendar Invitation</h2>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join a calendar
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Accept Invitation
          </button>
        </div>
      </div>
    </div>
  )
} 