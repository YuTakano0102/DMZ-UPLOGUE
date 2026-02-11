/**
 * 旅行記録API
 * GET  /api/trips - 全ての旅行記録を取得
 * POST /api/trips - 新しい旅行記録を作成
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Prismaを使うためNode.js Runtimeを明示
export const runtime = "nodejs"

/**
 * 全ての旅行記録を取得
 */
export async function GET(request: NextRequest) {
  try {
    const trips = await prisma.trip.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Prismaの結果をフロントエンド形式に変換
    const formattedTrips = trips.map(trip => ({
      ...trip,
      spots: trip.spots.map(spot => ({
        ...spot,
        photos: spot.photos.map(p => p.url), // Photo[] → string[]
      })),
    }))

    return NextResponse.json({
      trips: formattedTrips,
      count: formattedTrips.length,
    })
  } catch (error) {
    console.error('Failed to fetch trips:', error)
    return NextResponse.json(
      { error: '旅行記録の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 新しい旅行記録を作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trip } = body

    if (!trip) {
      return NextResponse.json(
        { error: '旅行記録データが指定されていません' },
        { status: 400 }
      )
    }

    // トランザクション内で旅行記録、スポット、写真を一括作成
    const createdTrip = await prisma.$transaction(async (tx) => {
      // 1. 旅行記録を作成
      const newTrip = await tx.trip.create({
        data: {
          title: trip.title,
          coverImage: trip.coverImage || null,
          startDate: trip.startDate,
          endDate: trip.endDate,
          location: trip.location,
          spotCount: trip.spots?.length || 0,
          photoCount: trip.spots?.reduce((sum: number, spot: any) => sum + (spot.photos?.length || 0), 0) || 0,
          isPublic: trip.isPublic || false,
          selectedTagIds: trip.selectedTagIds || [],
          titleConfirmed: trip.titleConfirmed || false,
        },
      })

      // 2. スポットと写真を作成
      if (trip.spots && trip.spots.length > 0) {
        for (const spot of trip.spots) {
          const createdSpot = await tx.spot.create({
            data: {
              tripId: newTrip.id,
              name: spot.name,
              address: spot.address || null,
              lat: spot.lat,
              lng: spot.lng,
              arrivalTime: spot.arrivalTime,
              departureTime: spot.departureTime,
              representativePhoto: spot.representativePhoto || null,
            },
          })

          // 3. 写真を作成
          if (spot.photos && spot.photos.length > 0) {
            await tx.photo.createMany({
              data: spot.photos.map((photoUrl: string) => ({
                spotId: createdSpot.id,
                url: photoUrl,
                // EXIFデータがある場合は追加
                latitude: null,
                longitude: null,
                timestamp: null,
              })),
            })
          }
        }
      }

      // 4. 作成された旅行記録を関連データと共に取得
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

    console.log(`Created trip: ${createdTrip?.id}`)

    // Prismaの結果をフロントエンド形式に変換
    const formattedTrip = createdTrip ? {
      ...createdTrip,
      spots: createdTrip.spots.map(spot => ({
        ...spot,
        photos: spot.photos.map(p => p.url), // Photo[] → string[]
      })),
    } : null

    return NextResponse.json({
      success: true,
      trip: formattedTrip,
    })
  } catch (error) {
    console.error('Failed to create trip:', error)
    return NextResponse.json(
      { 
        error: '旅行記録の作成に失敗しました',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
