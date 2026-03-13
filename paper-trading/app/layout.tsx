import type { Metadata } from 'next'
import './globals.css'
import Nav from './components/Nav'

export const metadata: Metadata = {
  title: 'SemiAI Trader',
  description: 'Paper trading terminal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Nav />
          <main style={{
            flex: 1,
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
            padding: '32px 24px',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
