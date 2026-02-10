/**
 * 旅行記録生成のためのサービス層
 * F-006: 旅行自動生成機能の実装
 */

import type { PhotoWithExif, PhotoCluster, ExifData } from './exif-utils'
import type { ReverseGeocodeResult } from './geocoding'
import {
  extractExifFromImage,
  clusterPhotos,
  selectRepresentativePhoto,
} from './exif-utils'
import { reverseGeocode, extractPrefecture } from './geocoding'
import type { Spot, Trip } from './mock-data'
import { generateUplogueTags } from './tag-generator'
import { generateTitleSuggestions } from './title-generator'
import type { UplogueTag } from './uplogue-lexicon'

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
  tags: UplogueTag[]
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
  onProgress?: (progress: TripGenerationProgress) => void,
  photoIds?: string[], // ✅ クライアントから送られてきたIDを使用
  exifDataArray?: ExifData[], // ✅ 圧縮前に抽出したEXIF情報を使用
  locale?: string // ✅ ロケール情報
): Promise<TripGenerationResult> {
  const currentLocale = locale || 'ja'
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
    
    // ✅ 渡されたEXIF情報を優先的に使用（圧縮で失われるため）
    const exif = exifDataArray?.[i] 
      ? {
          ...exifDataArray[i],
          // timestampがstringの場合はDateに変換
          timestamp: exifDataArray[i].timestamp 
            ? new Date(exifDataArray[i].timestamp as any)
            : null
        }
      : await extractExifFromImage(photo)
    
    console.log(`Photo ${i + 1}: Using ${exifDataArray?.[i] ? 'provided' : 'extracted'} EXIF, GPS=${exif.latitude},${exif.longitude}`)
    
    photosWithExif.push({
      id: photoIds?.[i] ?? `photo-${i}`, // ✅ クライアントのIDを使用
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
  const geocodeCache: Array<ReverseGeocodeResult> = []
  
  console.log(`Starting geocoding for ${clusters.length} clusters`)
  
  // 並列処理で高速化（最大5件ずつ）
  const batchSize = 5
  for (let batchStart = 0; batchStart < clusters.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, clusters.length)
    const batch = clusters.slice(batchStart, batchEnd)
    
    console.log(`Processing batch ${batchStart / batchSize + 1}: clusters ${batchStart + 1}-${batchEnd}`)
    
    // バッチ内のクラスタを並列処理
    const batchResults = await Promise.allSettled(
      batch.map(async (cluster, batchIndex) => {
        const i = batchStart + batchIndex
        
        try {
          console.log(`Processing cluster ${i + 1}/${clusters.length}:`, {
            centerLat: cluster.centerLat,
            centerLng: cluster.centerLng,
            photoCount: cluster.photos.length,
          })
          
          // 座標の妥当性チェック
          if (!isFinite(cluster.centerLat) || !isFinite(cluster.centerLng)) {
            console.error('Invalid cluster coordinates:', cluster)
            throw new Error(`クラスタ${i + 1}の座標が不正です`)
          }
          
          // 逆ジオコーディング
          const geocode = await reverseGeocode(cluster.centerLat, cluster.centerLng, currentLocale)
          
          console.log(`Geocode result for cluster ${i + 1}:`, geocode)
          
          // 代表写真を選定
          const representativePhoto = selectRepresentativePhoto(cluster)
          
          // ✅ サーバーでは URL を作らない。参照IDだけ返す
          const photoIds = cluster.photos.map((p) => p.id)
          const representativePhotoId = representativePhoto?.id ?? photoIds[0] ?? ""
          
          return {
            spot: {
              id: cluster.id,
              name: geocode.name,
              address: geocode.address,
              lat: cluster.centerLat,
              lng: cluster.centerLng,
              arrivalTime: cluster.arrivalTime.toISOString(),
              departureTime: cluster.departureTime.toISOString(),
              // 👇ここを「URL配列」ではなく「ID配列」にする
              photos: photoIds as any,               // 既存型に合わせる暫定（後で型を直すのが理想）
              representativePhoto: representativePhotoId as any,
            },
            geocode,
          }
        } catch (error) {
          console.error(`Error processing cluster ${i + 1}:`, error)
          throw error
        }
      })
    )
    
    // 結果を処理
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const clusterIndex = batchStart + i
      
      if (result.status === 'fulfilled') {
        spots.push(result.value.spot)
        geocodeCache.push(result.value.geocode)
      } else {
        console.error(`Failed to process cluster ${clusterIndex + 1}:`, result.reason)
        warnings.push(`スポット${clusterIndex + 1}の処理中にエラーが発生しました`)
      }
    }
    
    // 進捗更新
    onProgress?.({
      step: 'geocoding',
      progress: 60 + (batchEnd / clusters.length) * 20,
      message: `スポット情報を取得中... (${batchEnd}/${clusters.length})`,
    })
  }
  
  console.log(`Geocoding completed: ${spots.length}/${clusters.length} spots processed`)

  // ステップ4: 旅行記録データ生成
  onProgress?.({
    step: 'generating',
    progress: 90,
    message: '旅行記録を生成しています...',
  })
  
  // スポットが生成できなかった場合の処理
  if (spots.length === 0) {
    console.warn('No spots were generated')
    warnings.push('スポットを検出できませんでした。GPS情報を確認してください。')
  }

  // 旅行の開始日と終了日を算出
  const timestamps = photosWithExif
    .map((p) => p.exif.timestamp)
    .filter((t): t is Date => t !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const startDate = timestamps[0]?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  const endDate = timestamps[timestamps.length - 1]?.toISOString().split('T')[0] || startDate

  // 旅行のタイトルを生成
  let title = '旅の記録'
  let location = '不明'
  
  if (spots.length > 0 && geocodeCache.length > 0) {
    try {
      // Mapbox APIから取得したregion情報を優先的に使用
      const firstGeocode = geocodeCache[0]
      console.log('First geocode data:', firstGeocode)
      
      // regionを確認
      if (firstGeocode.region && firstGeocode.region.trim() !== '') {
        location = firstGeocode.region
        console.log('Using region from Mapbox:', location)
      } else {
        // regionが空の場合、addressから抽出を試みる
        console.log('Region is empty, extracting from address:', firstGeocode.address)
        const extracted = extractPrefecture(firstGeocode.address)
        if (extracted && extracted.trim() !== '') {
          location = extracted
          console.log('Extracted prefecture:', location)
        } else {
          console.log('Could not extract prefecture, using place:', firstGeocode.place)
          location = firstGeocode.place || '不明'
        }
      }
      
      const startMonth = new Date(startDate).getMonth() + 1
      title = location !== '不明' && location !== '' ? `${location}・${startMonth}月の旅` : '旅の記録'
      console.log('Generated title:', title, 'Location:', location)
    } catch (error) {
      console.error('Error generating title:', error)
      title = '旅の記録'
      location = '不明'
    }
  }

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
    progress: 95,
    message: 'タグを生成しています...',
  })

  // ✅ derive minimal signals for tags (MVP)
  const gpsRatio = photosWithExif.length > 0 ? gpsPhotos.length / photosWithExif.length : 0

  const photoTimestamps = photosWithExif
    .map((p) => p.exif.timestamp)
    .filter((d): d is Date => d instanceof Date)

  // Calculate total distance for motion tags
  let totalDistance = 0
  if (spots.length > 1) {
    for (let i = 1; i < spots.length; i++) {
      const prev = spots[i - 1]
      const curr = spots[i]
      const R = 6371 // Earth radius in km
      const dLat = (curr.lat - prev.lat) * Math.PI / 180
      const dLon = (curr.lng - prev.lng) * Math.PI / 180
      const lat1 = prev.lat * Math.PI / 180
      const lat2 = curr.lat * Math.PI / 180
      
      const a = Math.sin(dLat / 2) ** 2 +
                Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      totalDistance += R * c
    }
  }

  // NOTE: brightness is optional; keep undefined for now.
  const tags = generateUplogueTags({
    trip,
    startDateISO: startDate,
    photoTimestamps,
    gpsRatio,
    distanceKm: totalDistance > 0 ? totalDistance : undefined,
    locale: currentLocale,
  })

  // default title suggestions from all 5 tags
  const titleSuggestions = generateTitleSuggestions(tags, currentLocale)

  trip.tags = tags
  trip.titleSuggestions = titleSuggestions

  console.log('Generated tags:', tags)
  console.log('Generated title suggestions:', titleSuggestions)

  onProgress?.({
    step: 'complete',
    progress: 100,
    message: '完了しました',
  })

  return {
    trip,
    warnings,
    tags,
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
