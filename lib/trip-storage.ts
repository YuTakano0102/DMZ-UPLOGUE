/**
 * 旅行記録のストレージ管理（API版）
 * Supabase + Prisma連携
 */

import type { Trip } from './mock-data'

/**
 * すべての旅行記録を取得
 */
export async function getAllTrips(): Promise<Trip[]> {
  try {
    const response = await fetch('/api/trips')
    
    if (!response.ok) {
      throw new Error('Failed to fetch trips')
    }

    const data = await response.json()
    return data.trips || []
  } catch (error) {
    console.error('Failed to load trips:', error)
    return []
  }
}

/**
 * 特定の旅行記録を取得
 */
export async function getTrip(id: string): Promise<Trip | null> {
  try {
    const response = await fetch(`/api/trips/${id}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch trip')
    }

    const data = await response.json()
    return data.trip || null
  } catch (error) {
    console.error('Failed to load trip:', error)
    return null
  }
}

/**
 * 旅行記録を保存（新規作成）
 */
export async function saveTrip(trip: Trip): Promise<Trip> {
  try {
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trip }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '旅行記録の保存に失敗しました')
    }

    const data = await response.json()
    return data.trip
  } catch (error) {
    console.error('Failed to save trip:', error)
    throw new Error('旅行記録の保存に失敗しました')
  }
}

/**
 * 旅行記録を削除
 */
export async function deleteTrip(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/trips/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '旅行記録の削除に失敗しました')
    }
  } catch (error) {
    console.error('Failed to delete trip:', error)
    throw new Error('旅行記録の削除に失敗しました')
  }
}

/**
 * 旅行記録を更新
 */
export async function updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
  try {
    const response = await fetch(`/api/trips/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '旅行記録の更新に失敗しました')
    }

    const data = await response.json()
    return data.trip
  } catch (error) {
    console.error('Failed to update trip:', error)
    throw new Error('旅行記録の更新に失敗しました')
  }
}

/**
 * すべての旅行記録をクリア(開発用)
 * ⚠️ この関数はAPI版では使用できません
 */
export async function clearAllTrips(): Promise<void> {
  console.warn('clearAllTrips is not supported in API mode')
}
