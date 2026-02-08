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

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`)
    }

    const data = await response.json()

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

    return {
      name: feature.text || feature.place_name || '不明なスポット',
      address: feature.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      place,
      region,
      country,
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
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<ReverseGeocodeResult[]> {
  // Mapbox APIのレート制限を考慮して順次実行
  const results: ReverseGeocodeResult[] = []
  
  for (const coord of coordinates) {
    const result = await reverseGeocode(coord.lat, coord.lng)
    results.push(result)
    
    // レート制限回避のため少し待機
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

/**
 * 住所文字列から都道府県名を抽出
 */
export function extractPrefecture(address: string): string {
  const prefecturePattern = /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/
  const match = address.match(prefecturePattern)
  return match ? match[1] : ''
}

/**
 * 住所文字列から市区町村名を抽出
 */
export function extractCity(address: string): string {
  const cityPattern = /(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)(.+?[市区町村])/
  const match = address.match(cityPattern)
  return match ? match[1] : ''
}
