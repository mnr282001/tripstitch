"use client"

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { Calendar, CalendarMember } from '@/types/database'
import { PostgrestError } from '@supabase/supabase-js'

interface InviteModalProps {
  calendar: Calendar
  onClose: () => void
}

const roles = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' }
] as const

export default function InviteModal({ calendar, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<CalendarMember[]>([])

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          *,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('calendar_id', calendar.id)

      if (error) throw error

      setMembers(data.map(member => ({
        ...member,
        profile: member.profiles
      })))
    } catch (error: unknown) {
      console.error('Error fetching members:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof PostgrestError ? error.details : undefined
      })
    }
  }, [calendar.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      return
    }

    setLoading(true)

    console.log('Starting invite process for:', email.trim()) // Debug log

    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('Not authenticated')
      }

      console.log('Current user:', currentUser.id) // Debug log

      const emailToInvite = email.trim().toLowerCase()

      // Check if user already exists in our system
      const { data: existingUser, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToInvite)
        .maybeSingle() // Use maybeSingle to avoid errors when no user found

      console.log('Existing user check:', { existingUser, userCheckError }) // Debug log

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        throw userCheckError
      }

      if (existingUser) {
        console.log('User exists, checking membership...') // Debug log
        
        // Check if already a member
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('calendar_members')
          .select('id')
          .eq('calendar_id', calendar.id)
          .eq('user_id', existingUser.id)
          .maybeSingle()

        console.log('Member check:', { existingMember, memberCheckError }) // Debug log

        if (memberCheckError && memberCheckError.code !== 'PGRST116') {
          throw memberCheckError
        }

        if (existingMember) {
          return
        }

        // Add directly as member
        const { error: addMemberError } = await supabase
          .from('calendar_members')
          .insert({
            calendar_id: calendar.id,
            user_id: existingUser.id,
            role
          })

        if (addMemberError) throw addMemberError

        await fetchMembers()
        setEmail('')
      } else {
        console.log('Creating new invitation...') // Debug log
        
        // Create invitation record first
        const inviteToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        
        console.log('Invitation details:', { 
          calendar_id: calendar.id, 
          email: emailToInvite, 
          role, 
          invited_by: currentUser.id,
          token: inviteToken,
          expires_at: expiresAt
        }) // Debug log

        const { data: invitation, error: inviteError } = await supabase
          .from('calendar_invitations')
          .insert({
            calendar_id: calendar.id,
            email: emailToInvite,
            role,
            invited_by: currentUser.id,
            token: inviteToken,
            expires_at: expiresAt
          })
          .select()
          .single()

        console.log('Invitation creation result:', { invitation, inviteError }) // Debug log

        if (inviteError) {
          if (inviteError.code === '23505') {
            // Check if there's an existing non-expired invitation
            const { data: existingInvite } = await supabase
              .from('calendar_invitations')
              .select('token, expires_at')
              .eq('calendar_id', calendar.id)
              .eq('email', emailToInvite)
              .is('accepted_at', null)
              .single()

            if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
              // const inviteUrl = `${window.location.origin}/invite/accept/${existingInvite.token}`
            } else {
            }
          } else {
            throw inviteError
          }
          return
        }

        // Create the invitation URL
        const inviteUrl = `${window.location.origin}/invite/accept/${inviteToken}`
        console.log('Invite URL:', inviteUrl) // Debug log

        // For now, just show the link since email sending might not be set up
        setEmail('')

        // TODO: Implement actual email sending here
        // You can add email sending logic later
      }
    } catch (error: unknown) {
      console.error('Invitation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  // const copyInviteLink = async () => {
  //   const inviteLink = `${window.location.origin}/join/${calendar.id}`
  //   try {
  //     await navigator.clipboard.writeText(inviteLink)
  //     setCopied(true)
  //     setTimeout(() => setCopied(false), 2000)
  //   } catch (error) {
  //     console.error('Failed to copy link:', error)
  //   }
  // }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invite People</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {roles.map((roleOption) => (
                  <button
                    key={roleOption.value}
                    type="button"
                    onClick={() => setRole(roleOption.value)}
                    className={`inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                      role === roleOption.value
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {roleOption.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </form>

          {/* Current Members */}
          <div className="mt-8">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Current Members</h4>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {member.profile?.avatar_url ? (
                        <Image
                          src={member.profile.avatar_url}
                          alt={member.profile.full_name || member.profile.email}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-500">
                            {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.profile?.full_name || member.profile?.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.role === 'owner'
                        ? 'bg-blue-100 text-blue-700'
                        : member.role === 'editor'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.role}
                    </span>
                    {member.role !== 'owner' && calendar.user_role === 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}