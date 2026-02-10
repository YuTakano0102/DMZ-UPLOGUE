/**
 * Title generation with templates
 * Avoid "just concatenation" - use gentle poetic patterns
 */

import type { UplogueTag } from "./uplogue-lexicon"

export type TitleSuggestion = {
  title: string
  subtitle?: string
  usedTagIds: string[]
}

function pick(tags: UplogueTag[], category: string): UplogueTag | undefined {
  return tags.find((t) => t.category === category)
}

function pickAny(tags: UplogueTag[], categories: string[]): UplogueTag | undefined {
  return tags.find((t) => categories.includes(t.category))
}

function cleanLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim()
}

function generateTitleSuggestionsJA(selectedTags: UplogueTag[]): TitleSuggestion[] {
  const place = pick(selectedTags, "place")
  const season = pick(selectedTags, "season")
  const time = pick(selectedTags, "time")
  const motion = pick(selectedTags, "motion")
  const mood = pick(selectedTags, "mood")

  const p = place ? cleanLabel(place.label) : ""
  const s = season ? cleanLabel(season.label) : ""
  const t = time ? cleanLabel(time.label) : ""
  const m = motion ? cleanLabel(motion.label) : ""
  const md = mood ? cleanLabel(mood.label) : ""

  const poetic = pickAny(selectedTags, ["mood", "motion", "time"])
  const poeticLabel = poetic ? cleanLabel(poetic.label) : "旅の記憶"

  const suggestions: TitleSuggestion[] = []

  // 1) Place + Season + Poetic
  if (p && s) {
    suggestions.push({
      title: `${p}、${s}の${poeticLabel}`,
      subtitle: m || t || md || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // 2) Time + Place + Action
  if (p && t) {
    suggestions.push({
      title: `${t}の${p}で、${m || "ふらりと歩く"}`,
      subtitle: md || s || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // 3) Minimal poetic but informative
  if (p || s) {
    const info = p || s
    suggestions.push({
      title: `${info}の記憶 — ${poeticLabel}`,
      subtitle: [p && s ? `${p} / ${s}` : "", m, t, md].filter(Boolean).join("・") || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // Fallback
  if (suggestions.length === 0) {
    suggestions.push({
      title: `旅の記録 — ${poeticLabel}`,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  return suggestions
}

function generateTitleSuggestionsEN(selectedTags: UplogueTag[]): TitleSuggestion[] {
  const place = pick(selectedTags, "place")
  const season = pick(selectedTags, "season")
  const time = pick(selectedTags, "time")
  const motion = pick(selectedTags, "motion")
  const mood = pick(selectedTags, "mood")

  const p = place ? cleanLabel(place.label) : ""
  const s = season ? cleanLabel(season.label) : ""
  const t = time ? cleanLabel(time.label) : ""
  const m = motion ? cleanLabel(motion.label) : ""
  const md = mood ? cleanLabel(mood.label) : ""

  const poetic = pickAny(selectedTags, ["mood", "motion", "time"])
  const poeticLabel = poetic ? cleanLabel(poetic.label) : "travel memories"

  const suggestions: TitleSuggestion[] = []

  // 1) Place + Season + Poetic
  if (p && s) {
    suggestions.push({
      title: `${p}, ${s} ${poeticLabel}`,
      subtitle: m || t || md || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // 2) Time + Place + Action
  if (p && t) {
    suggestions.push({
      title: `${t} in ${p}, ${m || "wandering"}`,
      subtitle: md || s || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // 3) Minimal poetic but informative
  if (p || s) {
    const info = p || s
    suggestions.push({
      title: `${info} memories — ${poeticLabel}`,
      subtitle: [p && s ? `${p} / ${s}` : "", m, t, md].filter(Boolean).join(" · ") || undefined,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  // Fallback
  if (suggestions.length === 0) {
    suggestions.push({
      title: `Travel record — ${poeticLabel}`,
      usedTagIds: selectedTags.map((x) => x.id),
    })
  }

  return suggestions
}

export function generateTitleSuggestions(selectedTags: UplogueTag[], locale: string = 'ja'): TitleSuggestion[] {
  const suggestions = locale === 'en' 
    ? generateTitleSuggestionsEN(selectedTags)
    : generateTitleSuggestionsJA(selectedTags)

  // De-dup titles
  const seen = new Set<string>()
  return suggestions.filter((x) => {
    if (seen.has(x.title)) return false
    seen.add(x.title)
    return true
  }).slice(0, 3)
}
