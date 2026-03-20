import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LogOut, ChevronLeft, ChevronRight, Flame, Dumbbell, Wheat, Droplets, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'
import MealSection from '../components/MealSection'
import AddMealModal from '../components/AddMealModal'
import BottomNav from '../components/BottomNav'

const MEAL_SECTIONS = [
  { title: 'Breakfast', emoji: '🌅' },
  { title: 'Lunch', emoji: '☀️' },
  { title: 'Dinner', emoji: '🌙' },
  { title: 'Snack', emoji: '🍎' },
]

const CALORIE_GOAL = 2000

const USER_META = {
  kat: {
    name: 'Kat',
    initial: 'K',
    accent: '#C4622D',
    accentLight: '#F5E4D8',
  },
  jeremiah: {
    name: 'Jeremiah',
    initial: 'J',
    accent: '#5A7D68',
    accentLight: '#DFF0E5',
  },
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function offsetDate(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day + days)
  return d.toISOString().slice(0, 10)
}

function useLocalMeals(userId) {
  const storageKey = `we-ate-meals-${userId}`

  const [allMeals, setAllMeals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch {
      return {}
    }
  })

  const save = (next) => {
    setAllMeals(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const getMealsForDate = (dateStr) => allMeals[dateStr] || []

  const addMeal = (dateStr, entry) => {
    const existing = allMeals[dateStr] || []
    save({ ...allMeals, [dateStr]: [...existing, entry] })
  }

  const removeMeal = (dateStr, entryId) => {
    const existing = allMeals[dateStr] || []
    save({ ...allMeals, [dateStr]: existing.filter((e) => e.id !== entryId) })
  }

  return { getMealsForDate, addMeal, removeMeal }
}

function MacroRing({ calories, goal }) {
  const pct = Math.min(calories / goal, 1)
  const r = 52
  const circumference = 2 * Math.PI * r
  const dash = pct * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#EDE4D6" strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke="#C4622D"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-3xl font-medium text-charcoal leading-none">{calories}</p>
        <p className="font-body text-xs text-warm-gray mt-0.5">of {goal}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { activeUser, signOut, setActiveUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(todayKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultMealType, setDefaultMealType] = useState('Breakfast')

  const user = USER_META[activeUser] ?? USER_META.kat
  const { getMealsForDate, addMeal, removeMeal } = useLocalMeals(activeUser)

  const meals = getMealsForDate(currentDate)
  const isToday = currentDate === todayKey()

  const totals = useMemo(() => ({
    calories: meals.reduce((s, m) => s + m.calories, 0),
    protein: meals.reduce((s, m) => s + m.protein, 0),
    carbs: meals.reduce((s, m) => s + m.carbs, 0),
    fat: meals.reduce((s, m) => s + m.fat, 0),
  }), [meals])

  const openAddModal = (mealType = 'Breakfast') => {
    setDefaultMealType(mealType)
    setModalOpen(true)
  }

  const handleAddMeal = (entry) => {
    addMeal(currentDate, entry)
  }

  const handleRemoveMeal = (entryId) => {
    removeMeal(currentDate, entryId)
  }

  const getMealsForSection = (title) =>
    meals.filter((m) => m.mealType === title)

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-16">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-cream/80 border-b border-parchment backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-2xl font-light text-charcoal italic">
            We <span className="text-terracotta not-italic font-medium">Ate</span>
          </h1>

          <div className="flex items-center gap-2">
            {/* Switch user */}
            <button
              onClick={() => setActiveUser(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-white border border-parchment hover:border-warm-gray-light transition-all text-xs font-body text-warm-gray hover:text-charcoal"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-display italic"
                style={{ backgroundColor: user.accent }}
              >
                {user.initial}
              </div>
              {user.name}
            </button>

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

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Date navigator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate((d) => offsetDate(d, -1))}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="font-body text-sm font-medium text-charcoal">
              {isToday ? 'Today' : formatDate(currentDate)}
            </p>
            {isToday && (
              <p className="font-body text-xs text-warm-gray">{formatDate(currentDate)}</p>
            )}
          </div>

          <button
            onClick={() => setCurrentDate((d) => offsetDate(d, 1))}
            disabled={isToday}
            className="w-9 h-9 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary card */}
        <motion.div
          key={currentDate}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="card p-6 mb-6 flex items-center gap-6"
        >
          <MacroRing calories={totals.calories} goal={CALORIE_GOAL} />

          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Dumbbell size={12} className="text-sage" />
                <span className="font-body text-xs text-warm-gray uppercase tracking-wide">Protein</span>
              </div>
              <p className="font-display text-2xl font-medium text-charcoal">{totals.protein}</p>
              <p className="font-body text-xs text-warm-gray-light">grams</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wheat size={12} className="text-amber" />
                <span className="font-body text-xs text-warm-gray uppercase tracking-wide">Carbs</span>
              </div>
              <p className="font-display text-2xl font-medium text-charcoal">{totals.carbs}</p>
              <p className="font-body text-xs text-warm-gray-light">grams</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Droplets size={12} className="text-blush" />
                <span className="font-body text-xs text-warm-gray uppercase tracking-wide">Fat</span>
              </div>
              <p className="font-display text-2xl font-medium text-charcoal">{totals.fat}</p>
              <p className="font-body text-xs text-warm-gray-light">grams</p>
            </div>
          </div>
        </motion.div>

        {/* Meal sections */}
        <motion.div
          key={`meals-${currentDate}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {MEAL_SECTIONS.map((section) => (
            <MealSection
              key={section.title}
              title={section.title}
              emoji={section.emoji}
              entries={getMealsForSection(section.title)}
              onAdd={openAddModal}
              onRemove={handleRemoveMeal}
            />
          ))}
        </motion.div>

        {/* Quick add FAB */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openAddModal()}
          className="fixed bottom-20 right-6 sm:bottom-24 sm:right-10 w-14 h-14 rounded-full bg-terracotta text-cream shadow-lg shadow-terracotta/30 flex items-center justify-center"
          style={{ boxShadow: '0 8px 32px rgba(196, 98, 45, 0.35)' }}
          aria-label="Add meal"
        >
          <UtensilsCrossed size={22} />
        </motion.button>
      </main>

      <AddMealModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddMeal}
        defaultType={defaultMealType}
      />

      <BottomNav />
    </div>
  )
}
