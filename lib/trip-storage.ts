/**
 * 旅行記録のストレージ管理
 * 現時点ではlocalStorageを使用
 * 将来的にはバックエンドAPIと連携
 */

import type { Trip } from './mock-data'

const STORAGE_KEY = 'uplogue_trips'

/**
 * すべての旅行記録を取得
 */
export function getAllTrips(): Trip[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }
    return JSON.parse(stored) as Trip[]
  } catch (error) {
    console.error('Failed to load trips:', error)
    return []
  }
}

/**
 * 特定の旅行記録を取得
 */
export function getTrip(id: string): Trip | null {
  const trips = getAllTrips()
  return trips.find((t) => t.id === id) || null
}

/**
 * 旅行記録を保存
 */
export function saveTrip(trip: Trip): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const trips = getAllTrips()
    
    // 既存の記録があれば更新、なければ追加
    const existingIndex = trips.findIndex((t) => t.id === trip.id)
    
    if (existingIndex >= 0) {
      trips[existingIndex] = trip
    } else {
      trips.unshift(trip) // 新しい記録を先頭に追加
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch (error) {
    console.error('Failed to save trip:', error)
    throw new Error('旅行記録の保存に失敗しました')
  }
}

/**
 * 旅行記録を削除
 */
export function deleteTrip(id: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const trips = getAllTrips()
    const filtered = trips.filter((t) => t.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete trip:', error)
    throw new Error('旅行記録の削除に失敗しました')
  }
}

/**
 * 旅行記録を更新
 */
export function updateTrip(id: string, updates: Partial<Trip>): void {
  const trip = getTrip(id)
  
  if (!trip) {
    throw new Error('旅行記録が見つかりません')
  }

  const updatedTrip = { ...trip, ...updates }
  saveTrip(updatedTrip)
}

/**
 * すべての旅行記録をクリア(開発用)
 */
export function clearAllTrips(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(STORAGE_KEY)
}
