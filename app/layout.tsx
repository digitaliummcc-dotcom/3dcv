import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zoran Šapić – Interactive CV',
  description:
    'Quality Manager & Lead Senior QA Engineer — 25+ years of experience visualised as a 3D knowledge graph.',
  openGraph: {
    title: 'Zoran Šapić – Interactive CV',
    description: 'Explore my career, skills, and projects in 3D.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#050A0E] text-slate-200 antialiased">{children}</body>
    </html>
  )
}
