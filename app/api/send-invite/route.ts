import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const { email, link } = await req.json();
        if (!email || !link) {
            return NextResponse.json({ error: 'Missing email or link' }, { status: 400 });
        }
        console.log('email', email);
        console.log('link', link);
        await resend.emails.send({
            from: 'TripStitch <noreply@tripstitch.io>',
            to: email,
            subject: 'You are invited to a calendar!',
            html: `<p>You have been invited to join a calendar. Click <a href="${link}">here</a> to join.</p>`
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
