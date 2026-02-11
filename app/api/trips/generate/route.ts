import { NextRequest, NextResponse } from 'next/server'
import { generateTripFromPhotos } from '@/lib/trip-generator'
import type { ExifData } from '@/lib/exif-utils'
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

// Vercel Serverless Functionのタイムアウトと実行環境を設定
export const runtime = "nodejs"
export const maxDuration = 60

/**
 * 旅行記録生成API（Supabase + Prisma版）
 * POST /api/trips/generate
 * 
 * フロー:
 * 1. 写真をSupabase Storageにアップロード
 * 2. 旅行記録を生成
 * 3. Prismaでデータベースに保存
 * 4. 保存された旅行記録を返す
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // ✅ 写真ファイル、photoIDs、EXIF情報、ロケールを取得
    const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File)
    const photoIds = formData.getAll("photoIds").filter((v): v is string => typeof v === "string")
    const exifDataString = formData.get("exifData")
    const locale = formData.get("locale") as string | null

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: '写真が選択されていません' },
        { status: 400 }
      )
    }

    // 写真数の上限チェック(パフォーマンス対策)
    if (photoFiles.length > 100) {
      return NextResponse.json(
        { error: '一度にアップロードできる写真は100枚までです' },
        { status: 400 }
      )
    }

    // ✅ ids が無い/数が合わない場合のフォールバック
    const ids =
      photoIds.length === photoFiles.length
        ? photoIds
        : photoFiles.map((f, i) => `${f.name}-${i}`)

    // ✅ EXIF情報をパース
    let exifDataArray: ExifData[] | undefined
    if (exifDataString && typeof exifDataString === 'string') {
      try {
        exifDataArray = JSON.parse(exifDataString)
        console.log(`Received ${exifDataArray?.length} EXIF data entries`)
      } catch (e) {
        console.error('Failed to parse EXIF data:', e)
      }
    }

    // ===== STEP 1: 写真をSupabase Storageにアップロード =====
    console.log(`Uploading ${photoFiles.length} photos to Supabase Storage...`)
    
    const uploadPromises = photoFiles.map(async (file, index) => {
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 9)
      const extension = file.name.split('.').pop() || 'jpg'
      const uniqueFileName = `${timestamp}-${randomStr}-${index}.${extension}`
      
      const { url, path } = await uploadFile(
        STORAGE_BUCKETS.PHOTOS,
        uniqueFileName,
        file,
        {
          cacheControl: '31536000',
          upsert: false,
        }
      )

      return {
        id: ids[index],
        url,
        path,
      }
    })

    const uploadedPhotos = await Promise.all(uploadPromises)
    console.log(`✓ Uploaded ${uploadedPhotos.length} photos`)

    // photoId → url のマッピングを作成
    const photoUrlMap = new Map(uploadedPhotos.map(p => [p.id, p.url]))

    // ===== STEP 2: 旅行記録を生成 =====
    console.log('Generating trip from photos...')
    const result = await generateTripFromPhotos(photoFiles, undefined, ids, exifDataArray, locale || 'ja')

    // ===== STEP 3: Prismaでデータベースに保存 =====
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

    // ===== STEP 4: レスポンスを返す =====
    return NextResponse.json({
      success: true,
      trip: formattedTrip,
      warnings: result.warnings,
      tags: result.tags,
    })
  } catch (error) {
    console.error('Trip generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : '旅行記録の生成に失敗しました'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
