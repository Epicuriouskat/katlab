import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Clock } from 'lucide-react'

function formatTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function MealSection({ title, emoji, entries, onAdd, onRemove }) {
  const sectionCalories = entries.reduce((sum, e) => sum + (e.calories || 0), 0)

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="font-display text-xl font-medium text-charcoal">{title}</h3>
          {sectionCalories > 0 && (
            <span className="font-body text-xs text-warm-gray bg-parchment px-2.5 py-0.5 rounded-full">
              {sectionCalories} kcal
            </span>
          )}
        </div>
        <button
          onClick={() => onAdd(title)}
          className="flex items-center gap-1.5 text-xs font-body font-medium text-terracotta hover:text-terracotta-dark transition-colors group"
        >
          <span className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/20 transition-colors">
            <Plus size={12} />
          </span>
          Add
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 px-4 rounded-xl border border-dashed border-parchment text-center"
            >
              <p className="font-body text-xs text-warm-gray-light">Nothing logged yet</p>
            </motion.div>
          ) : (
            entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between bg-warm-white rounded-xl border border-parchment px-4 py-3 group hover:border-terracotta-lighter transition-colors duration-150"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-charcoal text-sm truncate">{entry.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {entry.loggedAt && (
                      <span className="flex items-center gap-1 text-xs text-warm-gray-light">
                        <Clock size={10} />
                        {formatTime(entry.loggedAt)}
                      </span>
                    )}
                    <span className="text-xs text-warm-gray">{entry.calories} kcal</span>
                    {entry.protein > 0 && (
                      <span className="text-xs text-sage">P {entry.protein}g</span>
                    )}
                    {entry.carbs > 0 && (
                      <span className="text-xs text-amber">C {entry.carbs}g</span>
                    )}
                    {entry.fat > 0 && (
                      <span className="text-xs text-blush">F {entry.fat}g</span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-warm-gray mt-0.5 italic truncate">{entry.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => onRemove(entry.id)}
                  className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-warm-gray-light hover:text-terracotta hover:bg-terracotta/8 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Remove entry"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
