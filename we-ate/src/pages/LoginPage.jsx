import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
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

      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #E8C4B0 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 w-[520px] h-[520px] rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, #C4622D 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #7B9E87 0%, transparent 60%)' }}
      />

      {/* Decorative corner botanical lines */}
      <svg
        aria-hidden
        className="absolute top-8 right-8 opacity-20 text-terracotta"
        width="120" height="120" viewBox="0 0 120 120" fill="none"
      >
        <path d="M10 60 Q 60 10, 110 60" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M10 75 Q 60 25, 110 75" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M10 45 Q 60 -5, 110 45" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="60" cy="10" r="3" fill="currentColor" />
        <circle cx="20" cy="55" r="2" fill="currentColor" />
        <circle cx="100" cy="55" r="2" fill="currentColor" />
      </svg>

      <svg
        aria-hidden
        className="absolute bottom-8 left-8 opacity-15 text-sage rotate-180"
        width="80" height="80" viewBox="0 0 80 80" fill="none"
      >
        <path d="M5 40 Q 40 5, 75 40" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M5 52 Q 40 17, 75 52" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="40" cy="5" r="3" fill="currentColor" />
      </svg>

      {/* Main card */}
      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-10">
          <motion.div {...fadeUp(0)} className="inline-block">
            <h1 className="font-display text-7xl font-light text-charcoal tracking-tight leading-none">
              We<br />
              <span className="italic text-terracotta">Ate</span>
            </h1>
          </motion.div>
          <motion.p
            {...fadeUp(0.1)}
            className="mt-3 font-display italic text-lg text-warm-gray font-light"
          >
            a shared table
          </motion.p>
        </div>

        {/* Form card */}
        <motion.div
          {...fadeUp(0.2)}
          className="bg-warm-white rounded-3xl border border-parchment shadow-sm shadow-terracotta/5 p-8"
        >
          <h2 className="font-body text-sm font-medium text-warm-gray tracking-widest uppercase mb-6">
            Sign in
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2.5 bg-terracotta/8 border border-terracotta/20 text-terracotta-dark rounded-xl px-4 py-3 mb-5 text-sm font-body"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-gray hover:text-charcoal transition-colors"
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
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                  Signing in…
                </span>
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
          {...fadeUp(0.35)}
          className="text-center mt-6 text-xs text-warm-gray/50 font-body"
        >
          © {new Date().getFullYear()} We Ate
        </motion.p>
      </div>
    </div>
  )
}
