// Positional color styles for profiles.
// Index 0 = first profile created (Kat) → terracotta
// Index 1 = second profile (Jeremiah) → sage

export const PROFILE_STYLES = [
  {
    accent:       '#C4622D',
    accentBg:     '#F5E4D8',
    gradientFrom: '#FBF0EA',
    border:       '#E8C4B0',
    ring:         '#E8B49A',
    panelBg:      '#FDF8F5',
    borderColor:  '#E8C4B0',
  },
  {
    accent:       '#5A7D68',
    accentBg:     '#DFF0E5',
    gradientFrom: '#EAF4EE',
    border:       '#A8C4B0',
    ring:         '#A8C4B0',
    panelBg:      '#F5FAF7',
    borderColor:  '#A8C4B0',
  },
]

// Attaches style + initial to a raw profile row from Supabase.
// index is the 0-based position in the profiles array (ordered by created_at).
export function applyStyle(profile, index) {
  const style = PROFILE_STYLES[index % PROFILE_STYLES.length]
  return {
    ...profile,
    initial: profile.name[0]?.toUpperCase() ?? '?',
    ...style,
  }
}
