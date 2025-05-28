export interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    created_at: string
    updated_at: string
}

export interface Calendar {
    id: string
    name: string
    description: string | null
    color: string
    created_by: string
    created_at: string
    updated_at: string
    creator_profile?: Profile
    member_count?: number
    user_role?: 'owner' | 'editor' | 'viewer'
}

export interface CalendarMember {
    id: string
    calendar_id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    joined_at: string
    profile?: Profile
}

export interface Event {
    id: string
    calendar_id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
    time: string
    duration: number
    is_multi_day: boolean
    color: string
    created_by: string
    created_at: string
    updated_at: string
    creator_profile?: Profile
}

export interface CalendarInvitation {
    id: string
    calendar_id: string
    email: string
    role: 'editor' | 'viewer'
    invited_by: string
    token: string
    expires_at: string
    accepted_at: string | null
    created_at: string
    calendar?: Calendar
    inviter_profile?: Profile
}