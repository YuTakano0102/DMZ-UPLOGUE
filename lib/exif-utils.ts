/**
 * EXIF抽出とクラスタリング用のユーティリティ関数
 * 要件定義書 F-006: 旅行自動生成に基づく実装
 */

export interface ExifData {
  latitude: number | null
  longitude: number | null
  timestamp: Date | null
  fileName: string
}

export interface PhotoWithExif {
  id: string
  file: File
  exif: ExifData
}

export interface GeoLocation {
  lat: number
  lng: number
}

export interface PhotoCluster {
  id: string
  centerLat: number
  centerLng: number
  photos: PhotoWithExif[]
  arrivalTime: Date
  departureTime: Date
}

/**
 * 画像ファイルからEXIF情報を抽出（exifrライブラリ使用）
 * GPS座標(latitude, longitude)と撮影日時(timestamp)を取得
 */
export async function extractExifFromImage(
  file: File
): Promise<ExifData> {
  try {
    // 動的インポート（exifrがインストールされていない場合の対策）
    const exifr = await import('exifr').catch(() => null)
    
    if (!exifr) {
      console.warn('exifr not installed, falling back to simple extraction')
      return extractExifSimple(file)
    }

    console.log(`Extracting EXIF from: ${file.name} (${file.type || 'no mime type'}, ${(file.size / 1024).toFixed(2)} KB)`)

    // まず、すべてのデータを取得してログに出力
    let data: any = null
    
    try {
      // HEIC/HEIF形式に最適化された設定
      data = await exifr.parse(file, {
        // 全てのセグメントを読み込む
        tiff: true,
        xmp: false,
        icc: false,
        iptc: false,
        jfif: false,
        ihdr: true,
        
        // GPS情報を確実に取得
        gps: true,
        
        // EXIF情報
        exif: true,
        ifd0: true,
        ifd1: true,
        interop: true,
        
        // その他の設定
        makerNote: false,
        userComment: false,
        
        // HEIC/HEIFサポート強化
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
        sanitize: false,  // sanitizeをオフにして生データを取得
        mergeOutput: true,
        silentErrors: false,
        
        // キーの変換を有効化
        pick: undefined, // すべてのキーを取得
      })
    } catch (parseError: any) {
      console.error(`Parse error for ${file.name}:`, parseError.message)
      
      // エラーが発生した場合、より寛容な設定で再試行
      try {
        console.log('Retrying with minimal configuration...')
        data = await exifr.parse(file, {
          gps: true,
          tiff: false,
          translateKeys: true,
          translateValues: true,
          reviveValues: true,
          silentErrors: true,
        })
      } catch (retryError) {
        console.error('Retry also failed:', retryError)
      }
    }

    if (!data) {
      console.warn(`No EXIF data found in ${file.name}, using file metadata`)
      return extractExifSimple(file)
    }

    // デバッグ: 取得したすべてのキーを表示
    console.log('Available EXIF keys:', Object.keys(data))
    
    // GPS関連のキーだけを表示
    const gpsKeys = Object.keys(data).filter(key => 
      key.toLowerCase().includes('gps') || 
      key.toLowerCase().includes('latitude') || 
      key.toLowerCase().includes('longitude')
    )
    console.log('GPS-related keys:', gpsKeys)
    if (gpsKeys.length > 0) {
      const gpsData: any = {}
      gpsKeys.forEach(key => {
        gpsData[key] = data[key]
      })
      console.log('GPS data:', gpsData)
    }

    // GPS座標の取得（複数のフィールドを確認）
    let latitude = data.latitude ?? data.GPSLatitude ?? data.Latitude ?? null
    let longitude = data.longitude ?? data.GPSLongitude ?? data.Longitude ?? null
    
    // 座標が配列形式の場合（DMS形式: 度・分・秒）
    if (Array.isArray(latitude) && latitude.length >= 3) {
      const ref = data.GPSLatitudeRef || data.LatitudeRef || 'N'
      latitude = convertDMSToDD(latitude, ref)
      console.log(`Converted latitude from DMS to DD: ${latitude}`)
    }
    if (Array.isArray(longitude) && longitude.length >= 3) {
      const ref = data.GPSLongitudeRef || data.LongitudeRef || 'E'
      longitude = convertDMSToDD(longitude, ref)
      console.log(`Converted longitude from DMS to DD: ${longitude}`)
    }

    // 撮影日時の取得（複数のフィールドを試行）
    let timestamp: Date | null = null
    const dateFields = [
      'DateTimeOriginal',
      'CreateDate', 
      'DateTime',
      'DateCreated',
      'ModifyDate',
      'CreationDate',
    ]
    
    for (const field of dateFields) {
      if (data[field]) {
        try {
          timestamp = new Date(data[field])
          if (!isNaN(timestamp.getTime())) {
            console.log(`Using timestamp from ${field}:`, timestamp.toISOString())
            break
          }
        } catch {
          continue
        }
      }
    }

    // デバッグ用ログ
    console.log(`✓ EXIF extracted for ${file.name}:`, {
      latitude,
      longitude,
      timestamp: timestamp?.toISOString() || 'N/A',
      hasGPS: latitude !== null && longitude !== null,
      fileType: file.type,
    })

    return {
      latitude,
      longitude,
      timestamp: timestamp || new Date(file.lastModified),
      fileName: file.name,
    }
  } catch (error) {
    console.error(`✗ Failed to extract EXIF from ${file.name}:`, error)
    return extractExifSimple(file)
  }
}

/**
 * DMS (Degrees, Minutes, Seconds) を DD (Decimal Degrees) に変換
 */
function convertDMSToDD(dms: number[], ref: string): number {
  const degrees = dms[0] || 0
  const minutes = dms[1] || 0
  const seconds = dms[2] || 0
  
  let dd = degrees + minutes / 60 + seconds / 3600
  
  // 南半球または西半球の場合は負の値
  if (ref === 'S' || ref === 'W') {
    dd = -dd
  }
  
  console.log(`DMS to DD conversion: [${degrees}, ${minutes}, ${seconds}] ${ref} → ${dd}`)
  
  return dd
}

/**
 * ブラウザのFile APIを使用してEXIF情報を抽出
 * (簡易版: 実際はexif-jsなどのライブラリ使用を推奨)
 */
export async function extractExifSimple(file: File): Promise<ExifData> {
  try {
    // 実装の簡易化のため、ファイルの更新日時を使用
    // 本番環境ではexif-jsやexifr等のライブラリを使用することを推奨
    
    const timestamp = file.lastModified ? new Date(file.lastModified) : new Date()
    
    // デバッグ用のログ
    console.log(`⚠ EXIF simple extraction for ${file.name} (no GPS data):`, {
      timestamp: timestamp.toISOString(),
      size: file.size,
      type: file.type,
    })
    
    return {
      latitude: null,
      longitude: null,
      timestamp,
      fileName: file.name,
    }
  } catch (error) {
    console.error(`Failed to extract EXIF from ${file.name}:`, error)
    return {
      latitude: null,
      longitude: null,
      timestamp: new Date(),
      fileName: file.name,
    }
  }
}

/**
 * 2点間の距離を計算(Haversine formula)
 * @param point1 地点1の座標
 * @param point2 地点2の座標
 * @returns 距離(メートル)
 */
export function calculateDistance(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const R = 6371e3 // 地球の半径(メートル)
  const φ1 = (point1.lat * Math.PI) / 180
  const φ2 = (point2.lat * Math.PI) / 180
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * 写真を時系列で整列
 */
export function sortPhotosByTime(photos: PhotoWithExif[]): PhotoWithExif[] {
  return [...photos].sort((a, b) => {
    const timeA = a.exif.timestamp?.getTime() || 0
    const timeB = b.exif.timestamp?.getTime() || 0
    return timeA - timeB
  })
}

/**
 * 写真をクラスタリング
 * 距離閾値200m、時間閾値30分でスポット単位にグループ化
 * 
 * @param photos GPS情報付きの写真リスト
 * @param distanceThreshold 距離閾値(メートル) デフォルト200m
 * @param timeThreshold 時間閾値(分) デフォルト30分
 * @returns クラスタリングされたスポットリスト
 */
export function clusterPhotos(
  photos: PhotoWithExif[],
  distanceThreshold = 200,
  timeThreshold = 30
): PhotoCluster[] {
  // GPS情報を持つ写真のみフィルタリング
  const validPhotos = photos.filter(
    (p) => p.exif.latitude !== null && p.exif.longitude !== null && p.exif.timestamp !== null
  )

  if (validPhotos.length === 0) {
    return []
  }

  // 時系列でソート
  const sorted = sortPhotosByTime(validPhotos)

  const clusters: PhotoCluster[] = []
  let currentCluster: PhotoWithExif[] = [sorted[0]]
  let clusterCenter: GeoLocation = {
    lat: sorted[0].exif.latitude!,
    lng: sorted[0].exif.longitude!,
  }

  for (let i = 1; i < sorted.length; i++) {
    const photo = sorted[i]
    const photoLocation: GeoLocation = {
      lat: photo.exif.latitude!,
      lng: photo.exif.longitude!,
    }

    const distance = calculateDistance(clusterCenter, photoLocation)
    const timeDiff =
      (photo.exif.timestamp!.getTime() -
        sorted[i - 1].exif.timestamp!.getTime()) /
      (1000 * 60) // 分単位

    // 距離または時間が閾値を超えたら新しいクラスタを作成
    if (distance > distanceThreshold || timeDiff > timeThreshold) {
      // 現在のクラスタを保存
      clusters.push(createCluster(currentCluster, clusters.length))

      // 新しいクラスタを開始
      currentCluster = [photo]
      clusterCenter = photoLocation
    } else {
      // 既存のクラスタに追加
      currentCluster.push(photo)
      
      // クラスタ中心を更新(平均座標)
      clusterCenter = {
        lat:
          currentCluster.reduce((sum, p) => sum + p.exif.latitude!, 0) /
          currentCluster.length,
        lng:
          currentCluster.reduce((sum, p) => sum + p.exif.longitude!, 0) /
          currentCluster.length,
      }
    }
  }

  // 最後のクラスタを保存
  if (currentCluster.length > 0) {
    clusters.push(createCluster(currentCluster, clusters.length))
  }

  return clusters
}

/**
 * 写真グループからクラスタを作成
 */
function createCluster(
  photos: PhotoWithExif[],
  index: number
): PhotoCluster {
  const centerLat =
    photos.reduce((sum, p) => sum + (p.exif.latitude || 0), 0) / photos.length
  const centerLng =
    photos.reduce((sum, p) => sum + (p.exif.longitude || 0), 0) / photos.length

  const timestamps = photos
    .map((p) => p.exif.timestamp!)
    .filter((t) => t !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const arrivalTime = timestamps[0]
  const departureTime = timestamps[timestamps.length - 1]

  return {
    id: `cluster-${index + 1}`,
    centerLat,
    centerLng,
    photos,
    arrivalTime,
    departureTime,
  }
}

/**
 * クラスタから代表写真を選定
 * 最初の写真を代表写真とする(将来的には画質や構図で選定)
 */
export function selectRepresentativePhoto(
  cluster: PhotoCluster
): PhotoWithExif {
  return cluster.photos[0]
}
