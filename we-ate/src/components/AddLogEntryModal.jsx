import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, BookOpen, Zap, Users, User, Flame, Dumbbell, Wheat, Droplets, Plus, ChevronLeft, Leaf, FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snacks:    'Snacks',
}

const PERSON_META = {
  kat:      { name: 'Kat',      accent: '#C4622D' },
  jeremiah: { name: 'Jeremiah', accent: '#5A7D68' },
}

const PORTION_PRESETS = [0.5, 1, 1.5, 2]

const EMPTY_QA = { name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '' }

function getRecipeNutForPerson(recipe, person) {
  const rows = recipe.recipe_nutrition ?? []
  return (
    rows.find((n) => n.person === person) ??
    rows.find((n) => n.person === 'kat') ??
    null
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function NutritionChips({ nut }) {
  if (!nut) return null
  return (
    <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
      <span className="text-[11px] font-body text-warm-gray flex items-center gap-1">
        <Flame size={9} className="text-terracotta" />
        {nut.calories} kcal
      </span>
      {nut.protein > 0 && (
        <span className="text-[11px] font-body text-sage-dark flex items-center gap-1">
          <Dumbbell size={9} /> P {nut.protein}g
        </span>
      )}
      {nut.carbs > 0 && (
        <span className="text-[11px] font-body text-amber flex items-center gap-1">
          <Wheat size={9} /> C {nut.carbs}g
        </span>
      )}
      {nut.fat > 0 && (
        <span className="text-[11px] font-body text-warm-gray flex items-center gap-1">
          <Droplets size={9} /> F {nut.fat}g
        </span>
      )}
      {nut.sodium > 0 && (
        <span className="text-[11px] font-body text-warm-gray flex items-center gap-1">
          <FlaskConical size={9} /> Na {nut.sodium}mg
        </span>
      )}
    </div>
  )
}

function ItemButton({ name, badge, nut, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-parchment bg-cream hover:border-terracotta-lighter hover:bg-warm-white transition-all duration-150 text-left disabled:opacity-60 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-body font-medium text-charcoal text-sm truncate">{name}</p>
          {badge}
        </div>
        <NutritionChips nut={nut} />
      </div>
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-terracotta/10 text-terracotta group-hover:bg-terracotta group-hover:text-cream transition-all">
        {loading
          ? <span className="w-3.5 h-3.5 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin group-hover:border-cream/30 group-hover:border-t-cream" />
          : <Plus size={14} />
        }
      </div>
    </button>
  )
}

function EmptyList({ search, tab }) {
  return (
    <p className="text-center text-sm text-warm-gray-light font-body py-10">
      {search
        ? `No ${tab === 'recipes' ? 'recipes' : 'items'} matching "${search}"`
        : tab === 'recipes'
          ? 'No recipes yet — add some in the library.'
          : 'No quick items yet — add some in the library.'}
    </p>
  )
}

// ── Portion selector view ─────────────────────────────────────────────────────

function PortionView({ itemName, itemType, baseNut, portion, onPortionChange, onAdd, onBack, adding }) {
  const mul = (v) => v != null ? +(Number(v) * portion).toFixed(1) : null
  const totalNut = baseNut ? {
    calories: mul(baseNut.calories),
    protein:  mul(baseNut.protein),
    carbs:    mul(baseNut.carbs),
    fat:      mul(baseNut.fat),
    fiber:    baseNut.fiber  != null ? mul(baseNut.fiber)  : null,
    sodium:   baseNut.sodium != null ? mul(baseNut.sodium) : null,
  } : null

  return (
    <>
      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-2 space-y-4 min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Item label */}
        <div className="pt-1">
          <p className="font-body text-xs text-warm-gray-light uppercase tracking-wider mb-0.5">
            {itemType === 'quick' ? 'Quick item' : 'Recipe'}
          </p>
          <p className="font-display text-xl font-medium text-charcoal">{itemName}</p>
        </div>

        {/* Portion presets */}
        <div>
          <p className="label mb-2">Portion size</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {PORTION_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => onPortionChange(p)}
                className={`py-2 rounded-xl text-sm font-body font-medium border transition-all duration-150 ${
                  portion === p
                    ? 'bg-terracotta text-cream border-terracotta'
                    : 'bg-cream text-warm-gray border-parchment hover:border-terracotta-lighter'
                }`}
              >
                {p}×
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={portion}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v > 0) onPortionChange(Math.round(v * 10) / 10)
            }}
            className="input-field py-2 text-center text-sm"
            placeholder="Custom amount"
          />
        </div>

        {/* Calculated totals */}
        {totalNut ? (
          <div className="rounded-2xl border border-parchment bg-cream/50 p-4">
            <p className="label mb-3">Calculated totals</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                  <Flame size={11} className="text-terracotta" /> Calories
                </span>
                <span className="font-body text-sm font-medium text-charcoal">
                  {totalNut.calories} <span className="text-warm-gray font-normal text-xs">kcal</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                  <Dumbbell size={11} className="text-sage-dark" /> Protein
                </span>
                <span className="font-body text-sm font-medium text-charcoal">
                  {totalNut.protein}<span className="text-warm-gray font-normal text-xs">g</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                  <Wheat size={11} className="text-amber" /> Carbs
                </span>
                <span className="font-body text-sm font-medium text-charcoal">
                  {totalNut.carbs}<span className="text-warm-gray font-normal text-xs">g</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                  <Droplets size={11} /> Fat
                </span>
                <span className="font-body text-sm font-medium text-charcoal">
                  {totalNut.fat}<span className="text-warm-gray font-normal text-xs">g</span>
                </span>
              </div>
              {totalNut.fiber != null && (
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                    <Leaf size={11} /> Fiber
                  </span>
                  <span className="font-body text-sm font-medium text-charcoal">
                    {totalNut.fiber}<span className="text-warm-gray font-normal text-xs">g</span>
                  </span>
                </div>
              )}
              {totalNut.sodium != null && (
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-warm-gray flex items-center gap-1.5">
                    <FlaskConical size={11} /> Sodium
                  </span>
                  <span className="font-body text-sm font-medium text-charcoal">
                    {totalNut.sodium}<span className="text-warm-gray font-normal text-xs">mg</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-warm-gray font-body py-4 text-center">No nutrition data available.</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-parchment flex gap-3 shrink-0">
        <button onClick={onBack} className="btn-ghost px-4">
          <ChevronLeft size={15} className="-ml-0.5" />
          Back
        </button>
        <button
          onClick={onAdd}
          disabled={adding}
          className="btn-primary flex-1"
        >
          {adding ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
              Adding…
            </span>
          ) : 'Add to log'}
        </button>
      </div>
    </>
  )
}

// ── Quick Add inline form ─────────────────────────────────────────────────────

function QuickAddView({ person, mealSlot, date, onAdded, onClose }) {
  const [form, setForm]     = useState(EMPTY_QA)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleAdd = async () => {
    if (!form.name.trim() || !form.calories) {
      setError('Name and calories are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('daily_log_entries').insert({
        date,
        person,
        meal_slot:     mealSlot,
        recipe_id:     null,
        quick_item_id: null,
        quantity:      1,
        is_quick_add:  true,
        qa_name:       form.name.trim(),
        qa_calories:   Number(form.calories) || 0,
        qa_protein:    Number(form.protein)  || 0,
        qa_carbs:      Number(form.carbs)    || 0,
        qa_fat:        Number(form.fat)      || 0,
        qa_fiber:      form.fiber  !== '' ? Number(form.fiber)  : null,
        qa_sodium:     form.sodium !== '' ? Number(form.sodium) : null,
      })
      if (e) throw e
      onAdded()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="flex-1 overflow-y-auto px-5 pb-2 space-y-4 min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {error && (
          <div className="bg-terracotta/8 border border-terracotta/20 text-terracotta-dark rounded-xl px-4 py-3 text-sm font-body">
            {error}
          </div>
        )}

        <div>
          <label className="label">Name *</label>
          <input
            type="text"
            required
            autoFocus
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Chicken breast"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'calories', label: 'Calories',    placeholder: '300', required: true, span: 2 },
            { key: 'protein',  label: 'Protein (g)', placeholder: '0' },
            { key: 'carbs',    label: 'Carbs (g)',   placeholder: '0' },
            { key: 'fat',      label: 'Fat (g)',     placeholder: '0' },
            { key: 'fiber',    label: 'Fiber (g)',   placeholder: '—' },
            { key: 'sodium',   label: 'Sodium (mg)', placeholder: '—', span: 2 },
          ].map(({ key, label, placeholder, required, span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="label">
                {label}{required && <span className="text-terracotta ml-0.5">*</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required={required}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="input-field py-2"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-parchment shrink-0">
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim() || !form.calories}
          className="btn-primary w-full"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
              Adding…
            </span>
          ) : 'Add to log'}
        </button>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AddLogEntryModal({
  open, person, mealSlot, date, onClose, onAdded, recipes, quickItems,
}) {
  const [search, setSearch]               = useState('')
  const [tab, setTab]                     = useState('recipes')
  const [adding, setAdding]               = useState(null)
  const [selectedItem, setSelectedItem]   = useState(null)  // { id, name, type, baseNut }
  const [portion, setPortion]             = useState(1)

  const meta = PERSON_META[person] ?? PERSON_META.kat

  useEffect(() => {
    if (open) {
      setSearch('')
      setTab('quick')
      setAdding(null)
      setSelectedItem(null)
      setPortion(1)
    }
  }, [open, recipes.length])

  const filteredRecipes = useMemo(() => {
    const q = search.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, search])

  const filteredQuick = useMemo(() => {
    const q = search.toLowerCase()
    return quickItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [quickItems, search])

  const addEntry = async ({ recipeId, quickItemId, quantity = 1 }) => {
    const key = recipeId ?? quickItemId
    setAdding(key)
    try {
      const { error } = await supabase.from('daily_log_entries').insert({
        date,
        person,
        meal_slot:     mealSlot,
        recipe_id:     recipeId    ?? null,
        quick_item_id: quickItemId ?? null,
        quantity,
      })
      if (!error) { onAdded(); onClose() }
    } finally {
      setAdding(null)
    }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  const showSearch = !selectedItem && tab !== 'quickadd'
  const showTabs   = !selectedItem

  const modalTitle = selectedItem
    ? 'Portion size'
    : tab === 'quickadd'
      ? 'Quick add'
      : 'Add to log'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(44,36,22,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-warm-white rounded-3xl border border-parchment shadow-xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 shrink-0 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="font-body text-[11px] font-medium tracking-widest uppercase"
                    style={{ color: meta.accent }}
                  >
                    {meta.name} · {SLOT_LABELS[mealSlot] ?? mealSlot}
                  </p>
                  <h2 className="font-display text-2xl font-medium text-charcoal mt-0.5">
                    {modalTitle}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search — hidden in portion view and quick-add form */}
              {showSearch && (
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-light" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    autoFocus
                    className="input-field pl-9 py-2.5 text-sm"
                  />
                </div>
              )}

              {/* Tabs — hidden when a recipe is selected (portion view) */}
              {showTabs && (
                <div className="flex gap-1 bg-parchment/60 rounded-xl p-1">
                  {[
                    { id: 'recipes',  label: 'Recipes',    Icon: BookOpen },
                    { id: 'quick',    label: 'Quick items', Icon: Zap },
                    { id: 'quickadd', label: 'Quick add',   Icon: Plus },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-body font-medium transition-all duration-200 ${
                        tab === id
                          ? 'bg-warm-white text-charcoal shadow-sm'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      <Icon size={11} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body — three views */}
            {selectedItem ? (
              <PortionView
                itemName={selectedItem.name}
                itemType={selectedItem.type}
                baseNut={selectedItem.baseNut}
                portion={portion}
                onPortionChange={setPortion}
                onBack={() => { setSelectedItem(null); setPortion(1) }}
                adding={!!adding}
                onAdd={() =>
                  selectedItem.type === 'quick'
                    ? addEntry({ quickItemId: selectedItem.id, quantity: portion })
                    : addEntry({ recipeId: selectedItem.id, quantity: portion })
                }
              />
            ) : tab === 'quickadd' ? (
              <QuickAddView
                person={person}
                mealSlot={mealSlot}
                date={date}
                onAdded={onAdded}
                onClose={onClose}
              />
            ) : (
              /* Scrollable recipe / quick-item list */
              <div
                className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 min-h-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {tab === 'recipes' && (
                  filteredRecipes.length === 0
                    ? <EmptyList search={search} tab="recipes" />
                    : filteredRecipes.map((recipe) => {
                        const nut = getRecipeNutForPerson(recipe, person)
                        const TypeBadge = (
                          <span className={`shrink-0 text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                            recipe.type === 'split'
                              ? 'bg-terracotta/10 text-terracotta-dark'
                              : 'bg-sage/15 text-sage-dark'
                          }`}>
                            {recipe.type === 'split' ? <Users size={9} /> : <User size={9} />}
                            {recipe.type}
                          </span>
                        )
                        return (
                          <ItemButton
                            key={recipe.id}
                            name={recipe.name}
                            badge={TypeBadge}
                            nut={nut}
                            loading={adding === recipe.id}
                            onClick={() => {
                              setSelectedItem({ id: recipe.id, name: recipe.name, type: 'recipe', baseNut: nut })
                              setPortion(1)
                            }}
                          />
                        )
                      })
                )}

                {tab === 'quick' && (
                  filteredQuick.length === 0
                    ? <EmptyList search={search} tab="quick" />
                    : filteredQuick.map((item) => (
                        <ItemButton
                          key={item.id}
                          name={item.name}
                          nut={item}
                          loading={adding === item.id}
                          onClick={() => {
                            setSelectedItem({ id: item.id, name: item.name, type: 'quick', baseNut: item })
                            setPortion(1)
                          }}
                        />
                      ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
