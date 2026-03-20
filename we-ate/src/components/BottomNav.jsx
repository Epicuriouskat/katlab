import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',        label: 'Today',   Icon: LayoutDashboard },
  { to: '/library', label: 'Recipes', Icon: BookOpen },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-cream/90 border-t border-parchment backdrop-blur-sm">
      <div className="max-w-2xl mx-auto flex">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors duration-150 ${
                isActive ? 'text-terracotta' : 'text-warm-gray hover:text-charcoal'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="font-body text-[10px] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
