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

  // デバッグ用（必要なら使う）
  rawFeatureTypes?: string[]
}

type MapboxFeature = {
  id: string
  text?: string
  place_name?: string
  place_type?: string[]
  properties?: Record<string, any>
  context?: Array<{ id: string; text?: string }>
}

function safeString(s: unknown): string {
  return typeof s === 'string' ? s : ''
}

function pickContextText(feature: MapboxFeature, prefix: string) {
  const hit = feature.context?.find((c) => c.id?.startsWith(prefix))
  return hit?.text ?? ''
}

/**
 * Mapboxのfeaturesから「短くて分かりやすいスポット名」を抽出
 * 優先順: poi → neighborhood → locality → place → region → address
 */
function pickShortName(features: MapboxFeature[]) {
  const rawFeatureTypes = features
    .flatMap((f) => f.place_type ?? [])
    .filter(Boolean)

  const pickByType = (type: string) =>
    features.find((f) => (f.place_type ?? []).includes(type))

  // 1) poi（施設名）
  const poi = pickByType('poi')
  if (poi) {
    const name =
      safeString(poi.text) ||
      safeString(poi.properties?.name) ||
      '不明なスポット'
    const address = safeString(poi.place_name) || ''
    const place = pickContextText(poi, 'place.') || pickContextText(poi, 'locality.')
    const region = pickContextText(poi, 'region.')
    const country = pickContextText(poi, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  // 2) neighborhood（地区）
  const neighborhood = pickByType('neighborhood')
  if (neighborhood) {
    const name = safeString(neighborhood.text) || '不明なスポット'
    const address = safeString(neighborhood.place_name) || ''
    const place = pickContextText(neighborhood, 'place.') || pickContextText(neighborhood, 'locality.')
    const region = pickContextText(neighborhood, 'region.')
    const country = pickContextText(neighborhood, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  // 3) locality（町域）
  const locality = pickByType('locality')
  if (locality) {
    const name = safeString(locality.text) || '不明なスポット'
    const address = safeString(locality.place_name) || ''
    const place = pickContextText(locality, 'place.') || name
    const region = pickContextText(locality, 'region.')
    const country = pickContextText(locality, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  // 4) place（市区町村）
  const placeFeature = pickByType('place')
  if (placeFeature) {
    const name = safeString(placeFeature.text) || '不明なスポット'
    const address = safeString(placeFeature.place_name) || ''
    const place = name
    const region = pickContextText(placeFeature, 'region.')
    const country = pickContextText(placeFeature, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  // 5) region（都道府県）
  const regionFeature = pickByType('region')
  if (regionFeature) {
    const name = safeString(regionFeature.text) || '不明なスポット'
    const address = safeString(regionFeature.place_name) || ''
    const place = ''
    const region = name
    const country = pickContextText(regionFeature, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  // 6) address（番地）
  const addr = pickByType('address')
  if (addr) {
    const name = safeString(addr.text) || '不明なスポット'
    const address = safeString(addr.place_name) || ''
    const place = pickContextText(addr, 'place.') || pickContextText(addr, 'locality.')
    const region = pickContextText(addr, 'region.')
    const country = pickContextText(addr, 'country.')
    return { name, address, place, region, country, rawFeatureTypes }
  }

  return {
    name: '不明なスポット',
    address: '',
    place: '',
    region: '',
    country: '',
    rawFeatureTypes,
  }
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

  // ✅ サーバー側処理(Route Handler)で使うなら MAPBOX_TOKEN を優先
  const mapboxToken =
    process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!mapboxToken) {
    console.error('❌ MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN is not configured')
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MAPBOX')))
    return {
      name: '不明なスポット',
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      place: '',
      region: '',
      country: '',
    }
  }
  
  // トークンの形式チェック（pk. または sk. で始まるべき）
  if (!mapboxToken.startsWith('pk.') && !mapboxToken.startsWith('sk.')) {
    console.error('❌ Invalid Mapbox token format. Token should start with "pk." or "sk."')
    console.error('Token preview:', mapboxToken.substring(0, 10) + '...')
    return {
      name: '不明なスポット',
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      place: '',
      region: '',
      country: '',
    }
  }

  try {
    // ✅ lng,lat の順
    // ✅ types を拡張して「短い名前候補」を増やす
    // ✅ limit を上げて features[0] に依存しない
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${mapboxToken}` +
      `&language=ja` +
      `&types=poi,neighborhood,locality,place,region,address` +
      `&limit=6`

    console.log('Mapbox API request for:', { lat, lng })

    // タイムアウト付きfetch（5秒）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
      clearTimeout(timeoutId)

      // ✅ レスポンスのContent-Typeをチェック
      const contentType = response.headers.get('content-type')
      console.log(`Mapbox API response: status=${response.status}, content-type=${contentType}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Mapbox API error: ${response.status}`, errorText.substring(0, 200))
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('Mapbox API returned non-JSON response:', responseText.substring(0, 200))
        throw new Error(`Unexpected content-type: ${contentType}`)
      }

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse Mapbox API response as JSON:', jsonError)
        throw new Error('Invalid JSON response from Mapbox API')
      }

      const features: MapboxFeature[] = Array.isArray(data?.features) ? data.features : []

      console.log('Mapbox API Response:', {
        lat,
        lng,
        featuresCount: features.length,
        firstFeature: features[0]?.place_name || 'N/A',
        featureTypes: features.map((f) => f.place_type?.join(',') ?? '').slice(0, 6),
      })

      if (features.length === 0) {
        return {
          name: '不明なスポット',
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          place: '',
          region: '',
          country: '',
        }
      }

      // ✅ 「短い名前」を抽出
      const picked = pickShortName(features)

      console.log('Parsed geocode result:', picked)

      return {
        name: picked.name || '不明なスポット',
        address: picked.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        place: picked.place || '',
        region: picked.region || '',
        country: picked.country || '',
        rawFeatureTypes: picked.rawFeatureTypes,
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
