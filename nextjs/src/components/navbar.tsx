'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Upload, BookOpen, User, LogOut, LogIn, UtensilsCrossed, Info, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavUser { userId: number; username: string }

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<NavUser | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setAccountOpen(false)
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => router.push(href)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive(href)
          ? 'bg-brand1/25 text-ink font-semibold'
          : 'text-ink/85 hover:bg-brand1/15 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <nav className="bg-brand2 shadow-md sticky top-0 z-50 border-b border-brand1/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => router.push(user ? '/upload' : '/library')}
          className="text-xl font-extrabold text-ink flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <UtensilsCrossed size={22} />
          FoodCalorie
        </button>

        {/* Links */}
        <div className="flex items-center gap-0.5">
          {user ? (
            <>
              <NavLink href="/upload"  icon={<Upload size={16} />}   label="Upload" />
              <NavLink href="/library" icon={<BookOpen size={16} />} label="Food Library" />
              <NavLink href="/about"   icon={<Info size={16} />}     label="About" />

              {/* Account dropdown */}
              <div className="relative ml-1" ref={dropdownRef}>
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    (isActive('/account') || accountOpen)
                      ? 'bg-brand1/25 text-ink font-semibold'
                      : 'text-ink/85 hover:bg-brand1/15 hover:text-ink',
                  )}
                >
                  <User size={16} />
                  <span className="max-w-[100px] truncate">{user.username}</span>
                  <ChevronDown size={14} className={cn('transition-transform duration-200', accountOpen && 'rotate-180')} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-brand1/15 rounded-xl shadow-xl border border-brand1/50 overflow-hidden z-50 backdrop-blur">
                    <button
                      onClick={() => { router.push('/account'); setAccountOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ink hover:bg-brand1/20 transition-colors"
                    >
                      <Settings size={15} className="text-ink/70" />
                      Account Settings
                    </button>
                    <div className="border-t border-brand1/40" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-brand3 hover:bg-brand3/10 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink href="/library" icon={<BookOpen size={16} />} label="Food Library" />
              <NavLink href="/about"   icon={<Info size={16} />}     label="About" />
              <NavLink href="/login"   icon={<LogIn size={16} />}    label="Sign In" />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
