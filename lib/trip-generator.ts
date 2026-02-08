/**
 * 旅行記録生成のためのサービス層
 * F-006: 旅行自動生成機能の実装
 */

import type { PhotoWithExif, PhotoCluster } from './exif-utils'
import type { ReverseGeocodeResult } from './geocoding'
import {
  extractExifFromImage,
  clusterPhotos,
  selectRepresentativePhoto,
} from './exif-utils'
import { reverseGeocode, extractPrefecture } from './geocoding'
import type { Spot, Trip } from './mock-data'

export interface TripGenerationInput {
  photos: File[]
}

export interface TripGenerationProgress {
  step: 'extracting' | 'clustering' | 'geocoding' | 'generating' | 'complete'
  progress: number
  message: string
}

export interface TripGenerationResult {
  trip: Trip
  warnings: string[]
}

/**
 * 写真から旅行記録を自動生成
 * 
 * 処理フロー:
 * 1. EXIF情報抽出
 * 2. 時系列整列
 * 3. クラスタリング(距離200m、時間30分)
 * 4. 逆ジオコーディング(スポット名取得)
 * 5. 旅行記録データ生成
 */
export async function generateTripFromPhotos(
  photos: File[],
  onProgress?: (progress: TripGenerationProgress) => void
): Promise<TripGenerationResult> {
  const warnings: string[] = []

  // ステップ1: EXIF情報抽出
  onProgress?.({
    step: 'extracting',
    progress: 10,
    message: 'EXIF情報を抽出しています...',
  })

  const photosWithExif: PhotoWithExif[] = []
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const exif = await extractExifFromImage(photo)
    
    photosWithExif.push({
      id: `photo-${i}`,
      file: photo,
      exif,
    })

    // 進捗更新
    onProgress?.({
      step: 'extracting',
      progress: 10 + (i / photos.length) * 20,
      message: `EXIF情報を抽出中... (${i + 1}/${photos.length})`,
    })
  }

  // GPS情報のチェック
  const gpsPhotos = photosWithExif.filter(
    (p) => p.exif.latitude !== null && p.exif.longitude !== null
  )
  
  if (gpsPhotos.length === 0) {
    warnings.push('GPS情報が含まれていません。位置情報は手動で指定してください。')
  } else if (gpsPhotos.length < photos.length * 0.3) {
    warnings.push(
      `GPS情報が少ない写真が多く含まれています。(${gpsPhotos.length}/${photos.length}枚)`
    )
  }

  // ステップ2: クラスタリング
  onProgress?.({
    step: 'clustering',
    progress: 40,
    message: 'スポットを検出しています...',
  })

  const clusters = clusterPhotos(photosWithExif, 200, 30)

  if (clusters.length === 0) {
    // GPS情報がない場合は時間ベースで簡易グルーピング
    warnings.push('GPS情報がないため、時間ベースで推定しています。')
    // TODO: 時間ベースのフォールバック実装
  }

  // ステップ3: 逆ジオコーディング
  onProgress?.({
    step: 'geocoding',
    progress: 60,
    message: 'スポット名を取得しています...',
  })

  const spots: Spot[] = []
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    
    // 逆ジオコーディング
    const geocode = await reverseGeocode(cluster.centerLat, cluster.centerLng)
    
    // 代表写真を選定
    const representativePhoto = selectRepresentativePhoto(cluster)
    
    // 写真URLを生成(実際はS3などにアップロード)
    const photoUrls = cluster.photos.map((p) => URL.createObjectURL(p.file))
    
    spots.push({
      id: cluster.id,
      name: geocode.name,
      address: geocode.address,
      lat: cluster.centerLat,
      lng: cluster.centerLng,
      arrivalTime: cluster.arrivalTime.toISOString(),
      departureTime: cluster.departureTime.toISOString(),
      photos: photoUrls,
      representativePhoto: photoUrls[0],
    })

    // 進捗更新
    onProgress?.({
      step: 'geocoding',
      progress: 60 + (i / clusters.length) * 20,
      message: `スポット情報を取得中... (${i + 1}/${clusters.length})`,
    })
  }

  // ステップ4: 旅行記録データ生成
  onProgress?.({
    step: 'generating',
    progress: 90,
    message: '旅行記録を生成しています...',
  })

  // 旅行の開始日と終了日を算出
  const timestamps = photosWithExif
    .map((p) => p.exif.timestamp)
    .filter((t): t is Date => t !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const startDate = timestamps[0]?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  const endDate = timestamps[timestamps.length - 1]?.toISOString().split('T')[0] || startDate

  // 旅行のタイトルを生成
  let title = '旅の記録'
  if (spots.length > 0) {
    const prefecture = extractPrefecture(spots[0].address)
    const startMonth = new Date(startDate).getMonth() + 1
    title = `${prefecture}・${startMonth}月の旅`
  }

  // 旅行の位置情報を決定
  const location = spots.length > 0 ? extractPrefecture(spots[0].address) : '不明'

  // カバー画像は最初のスポットの代表写真
  const coverImage = spots[0]?.representativePhoto || ''

  const trip: Trip = {
    id: `trip-${Date.now()}`,
    title,
    coverImage,
    startDate,
    endDate,
    location,
    spotCount: spots.length,
    photoCount: photos.length,
    isPublic: false,
    spots,
  }

  onProgress?.({
    step: 'complete',
    progress: 100,
    message: '完了しました',
  })

  return {
    trip,
    warnings,
  }
}

/**
 * 旅行記録のタイトルを生成
 */
export function generateTripTitle(spots: Spot[], startDate: string): string {
  if (spots.length === 0) {
    return '旅の記録'
  }

  const prefecture = extractPrefecture(spots[0].address)
  const date = new Date(startDate)
  const month = date.getMonth() + 1

  // 季節を判定
  const season = getSeasonFromMonth(month)

  return `${prefecture}・${season}の旅`
}

/**
 * 月から季節を取得
 */
function getSeasonFromMonth(month: number): string {
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}
