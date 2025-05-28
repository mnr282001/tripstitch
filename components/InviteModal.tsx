"use client"

import { useState, useEffect } from 'react'
import { X, Mail, Copy, Check, Users, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Calendar, CalendarMember } from '@/types/database'

interface InviteModalProps {
  calendar: Calendar
  onClose: () => void
}

export default function InviteModal({ calendar, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [members, setMembers] = useState<CalendarMember[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [calendar.id])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          *,
          profiles!calendar_members_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('calendar_id', calendar.id)

      if (error) throw error

      setMembers(data.map(member => ({
        ...member,
        profile: member.profiles
      })))
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage('')

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (existingUser) {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('calendar_members')
          .select('id')
          .eq('calendar_id', calendar.id)
          .eq('user_id', existingUser.id)
          .single()

        if (existingMember) {
          setMessage('This user is already a member of this calendar')
          return
        }

        // Add directly as member
        const { error } = await supabase
          .from('calendar_members')
          .insert({
            calendar_id: calendar.id,
            user_id: existingUser.id,
            role
          })

        if (error) throw error

        setMessage('User added successfully!')
        await fetchMembers()
        setEmail('')
      } else {
        // Create invitation
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('calendar_invitations')
          .insert({
            calendar_id: calendar.id,
            email: email.trim().toLowerCase(),
            role,
            invited_by: user.user.id
          })

        if (error) {
          if (error.code === '23505') { // Unique violation
            setMessage('An invitation has already been sent to this email')
          } else {
            throw error
          }
        } else {
          setMessage('Invitation sent! They will receive an email to join.')
          setEmail('')
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to send invitation')
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

  const copyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/join/${calendar.id}`
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Manage Calendar Access</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Members */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Current Members ({members.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {member.profile?.email} • {member.role}
                  </div>
                </div>
                {member.role !== 'owner' && calendar.user_role === 'owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite by Email */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Invite by Email</h4>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="editor">Editor - Can add and edit events</option>
                <option value="viewer">Viewer - Can only view events</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="h-4 w-4" />
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('successfully') || message.includes('sent')
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Share Link */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Share Link</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${calendar.id}`}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
            />
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Anyone with this link can request to join the calendar
          </p>
        </div>

        {/* Calendar Info */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-1">Calendar: {calendar.name}</h5>
          <p className="text-sm text-blue-700">
            {calendar.description || 'No description provided'}
          </p>
        </div>
      </div>
    </div>
  )
}