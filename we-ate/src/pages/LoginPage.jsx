import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
})

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream grain-overlay relative overflow-hidden flex items-center justify-center px-4">

      {/* Background wash — warm terracotta top-left, sage bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full"
        style={{ background: 'radial-gradient(circle, #F0D5C8 0%, transparent 65%)', opacity: 0.6 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-24 w-[480px] h-[480px] rounded-full"
        style={{ background: 'radial-gradient(circle, #C8DDD0 0%, transparent 65%)', opacity: 0.45 }}
      />

      {/* Decorative botanical arcs — top-right */}
      <svg
        aria-hidden
        className="absolute top-10 right-10 text-terracotta"
        width="130" height="100" viewBox="0 0 130 100" fill="none"
        style={{ opacity: 0.13 }}
      >
        <path d="M8 50 Q 65 -10, 122 50" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M8 64 Q 65  4, 122 64" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M8 36 Q 65 -24, 122 36" stroke="currentColor" strokeWidth="0.75" fill="none" />
        <circle cx="65" cy="-10" r="3" fill="currentColor" />
        <circle cx="16"  cy="49" r="1.5" fill="currentColor" />
        <circle cx="114" cy="49" r="1.5" fill="currentColor" />
      </svg>

      {/* Decorative botanical arcs — bottom-left */}
      <svg
        aria-hidden
        className="absolute bottom-10 left-8 text-sage"
        width="90" height="70" viewBox="0 0 90 70" fill="none"
        style={{ opacity: 0.15, transform: 'rotate(180deg)' }}
      >
        <path d="M5 35 Q 45 2, 85 35" stroke="currentColor" strokeWidth="1.25" fill="none" />
        <path d="M5 47 Q 45 14, 85 47" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="45" cy="2" r="2.5" fill="currentColor" />
      </svg>

      {/* Main content */}
      <div className="relative w-full max-w-md">

        {/* Wordmark */}
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <h1 className="font-display leading-none">
            <span className="block text-5xl font-light text-charcoal/60 not-italic tracking-tight">
              We
            </span>
            <span className="block italic text-terracotta font-light" style={{ fontSize: '88px', lineHeight: 0.88 }}>
              Ate
            </span>
          </h1>
        </motion.div>

        {/* Ornamental divider */}
        <motion.div
          {...fadeUp(0.12)}
          className="flex items-center justify-center gap-3 mb-10"
        >
          <div className="w-14 h-px" style={{ background: 'linear-gradient(to right, transparent, #EDE4D6)' }} />
          <span className="text-terracotta/40 text-sm leading-none">✦</span>
          <div className="w-14 h-px" style={{ background: 'linear-gradient(to left, transparent, #EDE4D6)' }} />
        </motion.div>

        {/* Form card */}
        <motion.div
          {...fadeUp(0.22)}
          className="rounded-3xl p-8"
          style={{
            backgroundColor: '#F7F3EE',
            border: '1px solid #EDE4D6',
            boxShadow: '0 2px 4px rgba(44,36,22,0.04), 0 12px 40px rgba(44,36,22,0.09), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <p className="eyebrow mb-6">Sign in</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm font-body"
              style={{
                background: 'rgba(196,98,45,0.07)',
                border: '1px solid rgba(196,98,45,0.2)',
                color: '#9A4820',
              }}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@weate.app"
                className="input-field"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-gray-light hover:text-charcoal transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 text-base"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-warm-gray-light font-body">
            This is a private shared account.
          </p>
        </motion.div>

        <motion.p
          {...fadeUp(0.38)}
          className="text-center mt-8 font-display italic text-warm-gray/40 text-sm"
        >
          a shared table
        </motion.p>

      </div>
    </div>
  )
}
