import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'

const USERS = [
  {
    id: 'kat',
    name: 'Kat',
    initial: 'K',
    tagline: 'Ready to log your meals?',
    accent: '#C4622D',
    gradientFrom: '#FBF0EA',
    border: '#E8C4B0',
    ring: '#E8B49A',
  },
  {
    id: 'jeremiah',
    name: 'Jeremiah',
    initial: 'J',
    tagline: 'What did you eat today?',
    accent: '#5A7D68',
    gradientFrom: '#EAF4EE',
    border: '#A8C4B0',
    ring: '#A8C4B0',
  },
]

export default function UserSelectPage() {
  const { setActiveUser } = useAuth()
  const navigate = useNavigate()
  const [selecting, setSelecting] = useState(null)

  const handleSelect = (userId) => {
    setSelecting(userId)
    setTimeout(() => {
      setActiveUser(userId)
      navigate('/', { replace: true })
    }, 320)
  }

  return (
    <div className="min-h-screen bg-cream grain-overlay relative overflow-hidden flex flex-col items-center justify-center px-4">

      {/* Ambient background washes */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 w-[420px] h-[420px] opacity-30"
        style={{ background: 'radial-gradient(circle at 0% 0%, #F0D5C8 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] opacity-25"
        style={{ background: 'radial-gradient(circle at 100% 100%, #C8DDD0 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-lg">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="font-display italic text-terracotta text-lg mb-3 opacity-80">We Ate</p>
          <h1 className="font-display text-4xl font-light text-charcoal tracking-tight">
            Who&rsquo;s eating today?
          </h1>
        </motion.div>

        {/* User cards */}
        <div className="grid grid-cols-2 gap-4">
          {USERS.map((user, i) => (
            <motion.button
              key={user.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(user.id)}
              disabled={!!selecting}
              className="relative flex flex-col items-center p-8 rounded-3xl border transition-all duration-300 focus:outline-none overflow-hidden"
              style={{
                background: `linear-gradient(148deg, ${user.gradientFrom} 0%, #FAF7F2 58%)`,
                borderColor: selecting === user.id ? user.accent : user.border,
                boxShadow: selecting === user.id
                  ? `0 0 0 3px ${user.ring}80, 0 8px 32px rgba(44,36,22,0.12)`
                  : '0 2px 8px rgba(44,36,22,0.06), 0 12px 32px rgba(44,36,22,0.05)',
              }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: user.accent + '55' }}
              />

              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-transform duration-200"
                style={{
                  backgroundColor: user.accent,
                  boxShadow: `0 4px 16px ${user.accent}40`,
                }}
              >
                <span className="font-display text-4xl font-light text-white italic">
                  {user.initial}
                </span>
              </div>

              <span
                className="font-display text-3xl font-medium tracking-tight mb-1.5"
                style={{ color: user.accent }}
              >
                {user.name}
              </span>
              <span className="font-body text-xs text-warm-gray text-center leading-relaxed">
                {user.tagline}
              </span>

              {/* Selected checkmark */}
              {selecting === user.id && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: user.accent }}
                >
                  <span className="text-white text-xs leading-none">✓</span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-center mt-10 font-display italic text-warm-gray/45 text-sm"
        >
          Your logs are kept separate. Your appetite is not.
        </motion.p>

      </div>
    </div>
  )
}
