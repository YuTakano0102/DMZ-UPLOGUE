import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/geocoding'

export const runtime = "nodejs"

/**
 * デバッグ用ジオコーディングAPI
 * GET /api/debug/geocode?lat=35.360680&lng=139.402079
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '35.360680')
    const lng = parseFloat(searchParams.get('lng') || '139.402079')

    console.log('🔍 Debug geocode request:', { lat, lng })

    const result = await reverseGeocode(lat, lng)

    console.log('🔍 Debug geocode result:', result)

    return NextResponse.json({
      success: true,
      input: { lat, lng },
      result,
    })
  } catch (error) {
    console.error('Debug geocode error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
