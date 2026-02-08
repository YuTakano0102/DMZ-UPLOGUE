/**
 * ジオコーディング関連のユーティリティ
 * Mapbox Geocoding APIを使用してスポット名を取得
 */

export interface ReverseGeocodeResult {
  name: string
  address: string
  place: string
  region: string
  country: string
}

/**
 * 逆ジオコーディング: 座標からスポット名・住所を取得
 * Mapbox Geocoding APIを使用
 * 
 * @param lat 緯度
 * @param lng 経度
 * @returns スポット情報
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  // 座標の妥当性チェック
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      !isFinite(lat) || !isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.error('Invalid coordinates provided:', { lat, lng })
    return {
      name: '不明なスポット',
      address: '座標が不正です',
      place: '',
      region: '',
      country: '',
    }
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!mapboxToken) {
    console.warn('Mapbox token not configured')
    return {
      name: '不明なスポット',
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      place: '',
      region: '',
      country: '',
    }
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=ja&types=poi,address,place`
    
    console.log('Mapbox API request for:', { lat, lng })

    // タイムアウト付きfetch（5秒）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error(`Mapbox API error: ${response.status}`)
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      const data = await response.json()
      
      // デバッグ情報をログに出力（簡略版）
      console.log('Mapbox API Response:', {
        lat,
        lng,
        featuresCount: data.features?.length || 0,
        firstFeature: data.features?.[0]?.place_name || 'N/A'
      })

      if (!data.features || data.features.length === 0) {
        return {
          name: '不明なスポット',
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          place: '',
          region: '',
          country: '',
        }
      }

      const feature = data.features[0]
      
      // コンテキスト情報から詳細を抽出
      const context = feature.context || []
      const place = context.find((c: any) => c.id.startsWith('place'))?.text || ''
      const region = context.find((c: any) => c.id.startsWith('region'))?.text || ''
      const country = context.find((c: any) => c.id.startsWith('country'))?.text || ''
      
      console.log('Parsed geocode result:', { 
        name: feature.text,
        place, 
        region, 
        country,
      })

      return {
        name: feature.text || feature.place_name || '不明なスポット',
        address: feature.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        place,
        region,
        country,
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('Mapbox API timeout after 5 seconds')
        throw new Error('Geocoding timeout')
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return {
      name: '不明なスポット',
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      place: '',
      region: '',
      country: '',
    }
  }
}

/**
 * 複数の座標に対してバッチで逆ジオコーディング
 * レート制限を考慮して待機時間なしで実行（Mapboxは比較的寛容）
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<ReverseGeocodeResult[]> {
  // Promise.allで並列実行（最大5件まで）
  const results: ReverseGeocodeResult[] = []
  const batchSize = 5
  
  for (let i = 0; i < coordinates.length; i += batchSize) {
    const batch = coordinates.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(coord => reverseGeocode(coord.lat, coord.lng))
    )
    results.push(...batchResults)
  }
  
  return results
}

/**
 * 住所文字列から都道府県名を抽出
 */
export function extractPrefecture(address: string): string {
  if (!address || typeof address !== 'string') {
    console.warn('Invalid address provided to extractPrefecture:', address)
    return ''
  }
  
  try {
    const prefecturePattern = /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/
    const match = address.match(prefecturePattern)
    const result = match ? match[1] : ''
    console.log(`extractPrefecture("${address}") => "${result}"`)
    return result
  } catch (error) {
    console.error('Error in extractPrefecture:', error, 'Address:', address)
    return ''
  }
}

/**
 * 住所文字列から市区町村名を抽出
 */
export function extractCity(address: string): string {
  if (!address || typeof address !== 'string') {
    console.warn('Invalid address provided to extractCity:', address)
    return ''
  }
  
  try {
    const cityPattern = /(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)(.+?[市区町村])/
    const match = address.match(cityPattern)
    return match ? match[1] : ''
  } catch (error) {
    console.error('Error in extractCity:', error, 'Address:', address)
    return ''
  }
}
