/**
 * Uplogue world lexicon:
 * Convert "machine-ish" signals into human-ish phrases.
 */

export type TagCategory = "place" | "season" | "time" | "motion" | "mood"

export type UplogueTag = {
  id: string
  category: TagCategory
  label: string
  reason?: string
  score: number // 0..1
}

export function uniqBy<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const k = keyFn(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

// ---- Season helpers ----
export function monthToSeasonJP(month: number): { season: string; label: string } {
  // month: 1..12
  if (month === 12 || month <= 2) return { season: "winter", label: "冬" }
  if (month >= 3 && month <= 5) return { season: "spring", label: "春" }
  if (month >= 6 && month <= 8) return { season: "summer", label: "夏" }
  return { season: "autumn", label: "秋" }
}

export function monthToSeasonEN(month: number): { season: string; label: string } {
  if (month === 12 || month <= 2) return { season: "winter", label: "Winter" }
  if (month >= 3 && month <= 5) return { season: "spring", label: "Spring" }
  if (month >= 6 && month <= 8) return { season: "summer", label: "Summer" }
  return { season: "autumn", label: "Autumn" }
}

export function monthToSeason(month: number, locale: string = 'ja'): { season: string; label: string } {
  return locale === 'en' ? monthToSeasonEN(month) : monthToSeasonJP(month)
}

// ---- Time-of-day to poetic labels ----
export function hourToTimeLabelJP(hour: number): string {
  if (hour < 6) return "夜更け"
  if (hour < 10) return "朝"
  if (hour < 12) return "午前"
  if (hour < 15) return "昼下がり"
  if (hour < 18) return "午後"
  if (hour < 21) return "夕方"
  return "夜"
}

export function hourToTimeLabelEN(hour: number): string {
  if (hour < 6) return "Late night"
  if (hour < 10) return "Morning"
  if (hour < 12) return "Late morning"
  if (hour < 15) return "Afternoon"
  if (hour < 18) return "Late afternoon"
  if (hour < 21) return "Evening"
  return "Night"
}

export function hourToTimeLabel(hour: number, locale: string = 'ja'): string {
  return locale === 'en' ? hourToTimeLabelEN(hour) : hourToTimeLabelJP(hour)
}

// ---- Motion mapping ----
export function distanceToMotionLabelJP(distanceKm: number): string {
  if (distanceKm >= 15) return "よく歩いた日"
  if (distanceKm >= 8) return "歩き回った"
  if (distanceKm >= 3) return "ゆるく散歩"
  return "近くをめぐる"
}

export function distanceToMotionLabelEN(distanceKm: number): string {
  if (distanceKm >= 15) return "Long walk"
  if (distanceKm >= 8) return "Wandering around"
  if (distanceKm >= 3) return "Casual stroll"
  return "Nearby exploration"
}

export function distanceToMotionLabel(distanceKm: number, locale: string = 'ja'): string {
  return locale === 'en' ? distanceToMotionLabelEN(distanceKm) : distanceToMotionLabelJP(distanceKm)
}

// ---- Mood mapping (simple heuristics) ----
export function sunlightToMoodLabelJP(isLikelyBright: boolean): string {
  return isLikelyBright ? "まぶしさの記憶" : "やわらかな光"
}

export function sunlightToMoodLabelEN(isLikelyBright: boolean): string {
  return isLikelyBright ? "Bright moments" : "Soft light"
}

export function sunlightToMoodLabel(isLikelyBright: boolean, locale: string = 'ja'): string {
  return locale === 'en' ? sunlightToMoodLabelEN(isLikelyBright) : sunlightToMoodLabelJP(isLikelyBright)
}

// Place fallback when no geocode name
export function unknownPlaceLabel(locale: string = 'ja'): string {
  return locale === 'en' ? "Somewhere" : "どこかの街角"
}

// Utility: safe clamp
export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0
  return Math.max(0, Math.min(1, x))
}
