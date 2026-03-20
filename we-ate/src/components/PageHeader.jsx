import { LogOut } from 'lucide-react'
import { useAuth } from './AuthProvider'

const USER_META = {
  kat:      { name: 'Kat',      initial: 'K', accent: '#C4622D' },
  jeremiah: { name: 'Jeremiah', initial: 'J', accent: '#5A7D68' },
}

/**
 * Shared sticky page header.
 *
 * Props:
 *   subtitle   – page name shown below the brand mark (optional)
 *   maxWidth   – Tailwind max-width class, defaults to 'max-w-3xl'
 *   children   – extra action buttons rendered before the user pill
 */
export default function PageHeader({ subtitle, maxWidth = 'max-w-3xl', children }) {
  const { activeUser, signOut, setActiveUser } = useAuth()
  const meta = USER_META[activeUser] ?? USER_META.kat

  return (
    <header className="sticky top-0 z-40 bg-cream/95 border-b border-parchment backdrop-blur-md">
      <div className={`${maxWidth} mx-auto px-4 h-14 flex items-center justify-between`}>

        {/* Brand mark */}
        <div className="leading-none">
          <p className="font-display text-xl font-light text-charcoal italic">
            We <span className="text-terracotta not-italic font-medium">Ate</span>
          </p>
          {subtitle && (
            <p className="eyebrow mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {children}

          {/* User switcher pill */}
          <button
            onClick={() => setActiveUser(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-white border border-parchment hover:border-warm-gray-light transition-all"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-display italic shrink-0"
              style={{ backgroundColor: meta.accent }}
            >
              {meta.initial}
            </div>
            <span className="font-body text-xs text-warm-gray">{meta.name}</span>
          </button>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>

      </div>
    </header>
  )
}
