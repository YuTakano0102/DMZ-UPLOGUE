/**
 * Tag generation with Uplogue lexicon
 * Always returns 5 tags with category coverage
 */

import type { Spot, Trip } from "./mock-data"
import { extractPrefecture } from "./geocoding"
import {
  UplogueTag,
  TagCategory,
  uniqBy,
  monthToSeasonJP,
  hourToTimeLabelJP,
  distanceToMotionLabelJP,
  sunlightToMoodLabelJP,
  unknownPlaceLabel,
  clamp01,
} from "./uplogue-lexicon"

/**
 * Tag generation goal:
 * - Always return 5 tags
 * - Ensure category coverage: place/season/time/motion/mood (at least 1 each)
 * - No LLM required; use EXIF/GPS + existing spots/geocode + heuristics
 */

export type TagCandidateInput = {
  trip: Trip
  // derived signals
  startDateISO: string // YYYY-MM-DD
  // timestamps of photos if available (Date objects)
  photoTimestamps?: Date[]
  // GPS ratio (0..1)
  gpsRatio?: number
  // optional: movement distance estimate (km)
  distanceKm?: number
  // optional: bright heuristic
  isLikelyBright?: boolean
}

function makeTag(
  category: TagCategory,
  label: string,
  score: number,
  reason?: string
): UplogueTag {
  return {
    id: `${category}:${label}`,
    category,
    label,
    score: clamp01(score),
    reason,
  }
}

function pickTopByCategory(tags: UplogueTag[], category: TagCategory): UplogueTag | null {
  const candidates = tags.filter((t) => t.category === category)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}

function nextBestNotIn(
  tags: UplogueTag[],
  selected: UplogueTag[],
  category?: TagCategory
): UplogueTag | null {
  const selectedIds = new Set(selected.map((s) => s.id))
  const pool = tags
    .filter((t) => !selectedIds.has(t.id))
    .filter((t) => (category ? t.category === category : true))
    .sort((a, b) => b.score - a.score)
  return pool[0] ?? null
}

export function generateUplogueTags(input: TagCandidateInput): UplogueTag[] {
  const { trip, startDateISO, photoTimestamps, gpsRatio, distanceKm, isLikelyBright } = input

  const candidates: UplogueTag[] = []

  // ---- Place tags ----
  // Prefer: Trip.location -> Prefecture from first spot -> first spot.name -> fallback
  const loc = (trip.location || "").trim()
  if (loc && loc !== "不明") {
    candidates.push(makeTag("place", loc, 0.95, "trip.location"))
  }

  const firstSpot: Spot | undefined = trip.spots?.[0]
  if (firstSpot?.address) {
    const pref = extractPrefecture(firstSpot.address)
    if (pref && pref !== "不明") {
      candidates.push(makeTag("place", pref, 0.9, "extractPrefecture(firstSpot.address)"))
    }
  }
  if (firstSpot?.name && firstSpot.name !== "不明なスポット") {
    candidates.push(makeTag("place", firstSpot.name, 0.82, "firstSpot.name"))
  }

  // fallback place
  candidates.push(makeTag("place", unknownPlaceLabel(), 0.35, "fallback"))

  // ---- Season tags ----
  const month = Number(startDateISO.split("-")[1] ?? "0")
  if (month >= 1 && month <= 12) {
    const { label: seasonLabel } = monthToSeasonJP(month)
    candidates.push(makeTag("season", `${seasonLabel}の旅`, 0.9, "monthToSeason"))
    // extra nuance (optional)
    if (seasonLabel === "夏") candidates.push(makeTag("season", "盛夏", 0.75, "summer nuance"))
    if (seasonLabel === "冬") candidates.push(makeTag("season", "冬の空気", 0.75, "winter nuance"))
  } else {
    candidates.push(makeTag("season", "季節の気配", 0.4, "fallback"))
  }

  // ---- Time tags ----
  if (photoTimestamps && photoTimestamps.length > 0) {
    const hours = photoTimestamps.map((d) => d.getHours())
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length
    const label = hourToTimeLabelJP(Math.round(avg))
    candidates.push(makeTag("time", `${label}の時間`, 0.85, "avg(photo hours)"))
  } else {
    candidates.push(makeTag("time", "ある日の時間", 0.4, "fallback"))
  }

  // ---- Motion tags ----
  if (typeof distanceKm === "number") {
    const m = distanceToMotionLabelJP(distanceKm)
    candidates.push(makeTag("motion", m, 0.85, "distanceKm"))
    // add quantitative (secondary)
    candidates.push(makeTag("motion", `移動 ${distanceKm.toFixed(1)}km`, 0.55, "distanceKm numeric"))
  } else {
    // use gpsRatio as proxy: more gps points -> more movement likely
    const proxy = typeof gpsRatio === "number" ? gpsRatio : 0.2
    if (proxy >= 0.6) candidates.push(makeTag("motion", "歩き回った", 0.65, "gpsRatio proxy"))
    else candidates.push(makeTag("motion", "ゆるく散歩", 0.55, "gpsRatio proxy"))
  }

  // ---- Mood tags ----
  if (typeof isLikelyBright === "boolean") {
    candidates.push(makeTag("mood", sunlightToMoodLabelJP(isLikelyBright), 0.75, "brightness heuristic"))
  } else {
    candidates.push(makeTag("mood", "街のざわめき", 0.6, "default mood"))
    candidates.push(makeTag("mood", "路地の気配", 0.55, "default mood"))
  }

  // GPS uncertainty mood (optional)
  if (typeof gpsRatio === "number" && gpsRatio < 0.3) {
    candidates.push(makeTag("mood", "手探りの旅", 0.55, "low gps ratio"))
  }

  // ---- Clean duplicates / prioritize ----
  const cleaned = uniqBy(candidates, (t) => t.id).sort((a, b) => b.score - a.score)

  // ---- Ensure 5 tags with category coverage ----
  const selected: UplogueTag[] = []

  ;(["place", "season", "time", "motion", "mood"] as TagCategory[]).forEach((cat) => {
    const top = pickTopByCategory(cleaned, cat)
    if (top) selected.push(top)
  })

  // If somehow missing some categories, backfill from overall
  while (selected.length < 5) {
    const nxt = nextBestNotIn(cleaned, selected)
    if (!nxt) break
    selected.push(nxt)
  }

  // If >5 (shouldn't, but just in case), keep best 5
  selected.sort((a, b) => b.score - a.score)
  return selected.slice(0, 5)
}
