import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, SlidersHorizontal, History, Scale } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',         label: 'Today',    Icon: LayoutDashboard },
  { to: '/history',  label: 'History',  Icon: History },
  { to: '/weight',   label: 'Weight',   Icon: Scale },
  { to: '/library',  label: 'Recipes',  Icon: BookOpen },
  { to: '/settings', label: 'Settings', Icon: SlidersHorizontal },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-cream/95 border-t border-parchment backdrop-blur-md">
      <div className="max-w-2xl mx-auto flex">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className="flex-1 relative flex flex-col items-center justify-center py-3 gap-1"
          >
            {({ isActive }) => (
              <>
                {/* Sliding capsule background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-capsule"
                    className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl bg-terracotta/8"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={`relative transition-colors duration-200 ${
                    isActive ? 'text-terracotta' : 'text-warm-gray'
                  }`}
                />
                <span
                  className={`relative font-body text-[9px] font-medium tracking-wide transition-colors duration-200 ${
                    isActive ? 'text-terracotta' : 'text-warm-gray'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
