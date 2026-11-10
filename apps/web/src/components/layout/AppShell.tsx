import { Navbar } from "./Navbar"
import { useLocation } from "react-router-dom"
import { useRef, useEffect, useState } from "react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [animKey, setAnimKey] = useState(0)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname
      setAnimKey((k) => k + 1)
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main
        key={animKey}
        className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-page-enter"
      >
        {children}
      </main>
    </div>
  )
}
