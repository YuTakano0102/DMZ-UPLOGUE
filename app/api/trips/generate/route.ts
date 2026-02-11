import { NextRequest, NextResponse } from 'next/server'
import { generateTripFromPhotos } from '@/lib/trip-generator'
import type { ExifData } from '@/lib/exif-utils'
import { prisma } from '@/lib/prisma'

// Vercel Serverless Functionのタイムアウトと実行環境を設定
export const runtime = "nodejs"
export const maxDuration = 60

/**
 * 旅行記録生成API（Supabase + Prisma版）
 * POST /api/trips/generate
 * 
 * フロー:
 * 1. クライアントから画像URL + EXIF情報を受け取る（画像は既にSupabase Storageにアップロード済み）
 * 2. 旅行記録を生成
 * 3. Prismaでデータベースに保存
 * 4. 保存された旅行記録を返す
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得してデバッグ
    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)
    
    if (!contentType?.includes('application/json')) {
      console.error('Invalid Content-Type:', contentType)
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('Received body:', JSON.stringify(body).substring(0, 200))

    // ✅ アップロード済みの画像情報を取得
    const { photos, locale } = body as {
      photos: Array<{
        id: string
        url: string
        exif: ExifData
      }>
      locale?: string
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: '写真が選択されていません' },
        { status: 400 }
      )
    }

    // 写真数の上限チェック(パフォーマンス対策)
    if (photos.length > 100) {
      return NextResponse.json(
        { error: '一度にアップロードできる写真は100枚までです' },
        { status: 400 }
      )
    }

    console.log(`✅ Received ${photos.length} photo URLs from client`)

    // photoId → url のマッピングを作成
    const photoUrlMap = new Map(photos.map(p => [p.id, p.url]))
    
    // EXIF情報を抽出
    const exifDataArray = photos.map(p => p.exif)
    const photoIds = photos.map(p => p.id)

    // ===== STEP 1: 旅行記録を生成 =====
    // 注意: generateTripFromPhotos は File[] を期待しているが、
    // 実際にはEXIF情報だけを使用するので、空の配列を渡す
    console.log('Generating trip from EXIF data...')
    const result = await generateTripFromPhotos([], undefined, photoIds, exifDataArray, locale || 'ja')

    // ===== STEP 2: Prismaでデータベースに保存 =====
    console.log('Saving trip to database...')
    
    const savedTrip = await prisma.$transaction(async (tx) => {
      // 旅行記録を作成
      const newTrip = await tx.trip.create({
        data: {
          title: result.trip.title,
          coverImage: null, // 後で設定
          startDate: result.trip.startDate,
          endDate: result.trip.endDate,
          location: result.trip.location,
          spotCount: result.trip.spots.length,
          photoCount: result.trip.photoCount,
          isPublic: false,
        },
      })

      // スポットと写真を作成
      for (const spot of result.trip.spots) {
        // photoIds配列からURLを取得
        const photoUrls = (spot.photos as any as string[])
          .map(id => photoUrlMap.get(id))
          .filter(Boolean) as string[]

        const createdSpot = await tx.spot.create({
          data: {
            tripId: newTrip.id,
            name: spot.name,
            address: spot.address || null,
            lat: spot.lat,
            lng: spot.lng,
            arrivalTime: spot.arrivalTime,
            departureTime: spot.departureTime,
            representativePhoto: photoUrls[0] || null,
          },
        })

        // 写真を作成
        if (photoUrls.length > 0) {
          await tx.photo.createMany({
            data: photoUrls.map(url => ({
              spotId: createdSpot.id,
              url,
            })),
          })
        }
      }

      // coverImageを最初のスポットの代表写真に設定
      const firstSpot = await tx.spot.findFirst({
        where: { tripId: newTrip.id },
        orderBy: { arrivalTime: 'asc' },
      })

      if (firstSpot?.representativePhoto) {
        await tx.trip.update({
          where: { id: newTrip.id },
          data: { coverImage: firstSpot.representativePhoto },
        })
      }

      // 保存された旅行記録を返す
      return await tx.trip.findUnique({
        where: { id: newTrip.id },
        include: {
          spots: {
            include: {
              photos: true,
            },
            orderBy: {
              arrivalTime: 'asc',
            },
          },
        },
      })
    })

    console.log(`✓ Trip saved: ${savedTrip?.id}`)

    // Prismaの結果をフロントエンド形式に変換
    const formattedTrip = savedTrip ? {
      ...savedTrip,
      spots: savedTrip.spots.map(spot => ({
        ...spot,
        photos: spot.photos.map(p => p.url), // Photo[] → string[]
      })),
    } : null

    // ===== STEP 3: レスポンスを返す =====
    return NextResponse.json({
      success: true,
      trip: formattedTrip,
      warnings: result.warnings,
      tags: result.tags,
    })
  } catch (error) {
    console.error('Trip generation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // JSONパースエラーの詳細を返す
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON format',
          details: error.message,
          hint: 'フロントエンドから送信されるデータの形式を確認してください'
        },
        { status: 400 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : '旅行記録の生成に失敗しました'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
