/**
 * 旅の印象タグ生成
 * F-015: 写真から旅の"核"を抽出してタグ化
 */

import type { Trip, Spot } from "./mock-data"

export interface ImpressionTag {
  id: string
  label: string
  reason: string
  category: 'time' | 'movement' | 'place' | 'air'
}

/* ------------------ utils ------------------ */

function hourOf(date: string) {
  return new Date(date).getHours()
}

function distance(a: Spot, b: Spot) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/* ------------------ TAGS ------------------ */

/**
 * 時間帯タグ: 写真の撮影時間から「いつが濃かったか」を判定
 */
function timeTag(spots: Spot[]): ImpressionTag {
  const buckets = { morning: 0, day: 0, evening: 0, night: 0 }

  spots.forEach((s) => {
    const h = hourOf(s.arrivalTime)
    if (h < 10) buckets.morning++
    else if (h < 15) buckets.day++
    else if (h < 19) buckets.evening++
    else buckets.night++
  })

  const max = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof buckets

  const map = {
    morning: ["朝が長い", "午前の時間が多い"],
    day: ["光が高い時間", "昼が中心"],
    evening: ["夕方が濃い", "日が傾く頃"],
    night: ["夜に寄った", "暗くなってから"],
  }

  return {
    id: "time",
    category: 'time',
    label: map[max][0],
    reason: `${map[max][1]}（${buckets[max]}枚）`,
  }
}

/**
 * 移動タグ: 総移動距離から「どう動いたか」を判定
 */
function movementTag(spots: Spot[]): ImpressionTag {
  if (spots.length < 2)
    return {
      id: "move-stay",
      category: 'movement',
      label: "留まった",
      reason: "1箇所のみ",
    }

  let total = 0
  for (let i = 1; i < spots.length; i++) total += distance(spots[i - 1], spots[i])

  if (total > 5)
    return {
      id: "move-walk",
      category: 'movement',
      label: "歩き続けた",
      reason: `移動距離${total.toFixed(1)}km`,
    }
  if (total > 2)
    return {
      id: "move-tour",
      category: 'movement',
      label: "巡った",
      reason: `移動距離${total.toFixed(1)}km`,
    }
  return {
    id: "move-stay",
    category: 'movement',
    label: "留まった",
    reason: `移動距離${total.toFixed(1)}km`,
  }
}

/**
 * 場所タグ: 住所文字列から「どこにいたか」を判定（最大2つ）
 */
function placeTags(spots: Spot[]): ImpressionTag[] {
  const text = spots.map((s) => s.address).join(" ")

  const tags: ImpressionTag[] = []

  if (/川|橋|water|river|海|湖|pond/.test(text))
    tags.push({
      id: "water",
      category: 'place',
      label: "水の近く",
      reason: "水辺の地名を検出",
    })

  if (/公園|park|garden/.test(text))
    tags.push({
      id: "park",
      category: 'place',
      label: "緑のそば",
      reason: "公園の地名を検出",
    })

  if (/駅|station/.test(text))
    tags.push({
      id: "station",
      category: 'place',
      label: "駅の周辺",
      reason: "駅周辺の移動",
    })

  if (/寺|神社|shrine|temple/.test(text))
    tags.push({
      id: "shrine",
      category: 'place',
      label: "境内",
      reason: "寺社の地名を検出",
    })

  if (/cafe|カフェ|coffee|喫茶/.test(text))
    tags.push({
      id: "cafe",
      category: 'place',
      label: "カフェ",
      reason: "カフェの地名を検出",
    })

  if (tags.length === 0)
    tags.push({
      id: "city",
      category: 'place',
      label: "街の中",
      reason: "都市部のスポット",
    })

  return tags.slice(0, 2)
}

/**
 * 季節/空気タグ: 日付から「どんな空気だったか」を推定
 */
function seasonAirTag(trip: Trip): ImpressionTag {
  const m = new Date(trip.startDate).getMonth() + 1
  if ([12, 1, 2].includes(m))
    return {
      id: "air-winter",
      category: 'air',
      label: "空気が冷たい",
      reason: "冬の時期",
    }
  if ([6, 7, 8].includes(m))
    return {
      id: "air-summer",
      category: 'air',
      label: "光が強い",
      reason: "夏の時期",
    }
  if ([3, 4, 5].includes(m))
    return {
      id: "air-spring",
      category: 'air',
      label: "風がやわらかい",
      reason: "春の時期",
    }
  return {
    id: "air-autumn",
    category: 'air',
    label: "風が澄んでる",
    reason: "秋の時期",
  }
}

/* ------------------ MAIN ------------------ */

/**
 * 旅行記録から5つの印象タグを生成
 * 
 * カテゴリ構成:
 * - 時間 ×1
 * - 移動 ×1
 * - 場所 ×2
 * - 空気 ×1
 */
export function generateImpressionTags(trip: Trip): ImpressionTag[] {
  const tags: ImpressionTag[] = []

  // スポットがない場合は空配列を返す
  if (!trip.spots || trip.spots.length === 0) {
    return []
  }

  tags.push(timeTag(trip.spots))
  tags.push(movementTag(trip.spots))
  tags.push(...placeTags(trip.spots))
  tags.push(seasonAirTag(trip))

  return tags.slice(0, 5)
}
