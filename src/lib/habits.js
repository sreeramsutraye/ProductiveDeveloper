export function dateStr(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export const TODAY = dateStr(0)

export function getStreak(dates) {
  if (!dates.length) return 0
  const sorted = [...dates].sort().reverse()
  if (sorted[0] !== TODAY && sorted[0] !== dateStr(1)) return 0
  let streak = 0
  let expected = sorted[0]
  for (const d of sorted) {
    if (d === expected) {
      streak++
      const prev = new Date(expected + 'T00:00:00')
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().split('T')[0]
    } else break
  }
  return streak
}

export function getBestStreak(dates) {
  if (!dates.length) return 0
  const sorted = [...dates].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i] + 'T00:00:00') - new Date(sorted[i - 1] + 'T00:00:00')) / 86400000
    if (diff === 1) { cur++; best = Math.max(best, cur) }
    else cur = 1
  }
  return Math.max(best, cur)
}

export function getRate(dates, days = 30) {
  const cutoff = dateStr(days - 1)
  return Math.round((dates.filter(d => d >= cutoff).length / days) * 100)
}

export const COLORS = {
  blue:   { swatch: 'bg-blue-500',   cell: 'bg-blue-400 dark:bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-400' },
  green:  { swatch: 'bg-green-500',  cell: 'bg-green-400 dark:bg-green-500',  light: 'bg-green-50 dark:bg-green-900/30',  text: 'text-green-600 dark:text-green-400',  ring: 'ring-green-400' },
  purple: { swatch: 'bg-purple-500', cell: 'bg-purple-400 dark:bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
  orange: { swatch: 'bg-orange-500', cell: 'bg-orange-400 dark:bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-400' },
  red:    { swatch: 'bg-red-500',    cell: 'bg-red-400 dark:bg-red-500',    light: 'bg-red-50 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400',    ring: 'ring-red-400' },
  pink:   { swatch: 'bg-pink-500',   cell: 'bg-pink-400 dark:bg-pink-500',   light: 'bg-pink-50 dark:bg-pink-900/30',   text: 'text-pink-600 dark:text-pink-400',   ring: 'ring-pink-400' },
  yellow: { swatch: 'bg-yellow-400', cell: 'bg-yellow-300 dark:bg-yellow-500', light: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-400' },
  teal:   { swatch: 'bg-teal-500',   cell: 'bg-teal-400 dark:bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-400',   ring: 'ring-teal-400' },
}
