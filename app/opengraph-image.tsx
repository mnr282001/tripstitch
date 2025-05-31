import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Calendar App'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const now = new Date()
  const day = now.getDate()
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '4px solid #1976d2',
        }}>
          <div style={{
            background: '#1976d2',
            color: 'white',
            padding: '20px 60px',
            fontSize: '32px',
            fontWeight: 'bold',
            borderRadius: '8px 8px 0 0',
            width: '100%',
            textAlign: 'center',
          }}>
            {month}
          </div>
          <div style={{
            fontSize: '120px',
            fontWeight: 'bold',
            color: '#0d47a1',
            padding: '20px',
          }}>
            {day}
          </div>
        </div>
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#1976d2',
          marginTop: '40px',
        }}>
          Calendar App
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}