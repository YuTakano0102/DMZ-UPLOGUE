/**
 * 個別旅行記録API
 * GET    /api/trips/[id] - 特定の旅行記録を取得
 * PUT    /api/trips/[id] - 旅行記録を更新
 * DELETE /api/trips/[id] - 旅行記録を削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 特定の旅行記録を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const trip = await prisma.trip.findUnique({
      where: { id },
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

    if (!trip) {
      return NextResponse.json(
        { error: '旅行記録が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({ trip })
  } catch (error) {
    console.error('Failed to fetch trip:', error)
    return NextResponse.json(
      { error: '旅行記録の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 旅行記録を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { updates } = body

    if (!updates) {
      return NextResponse.json(
        { error: '更新データが指定されていません' },
        { status: 400 }
      )
    }

    // 旅行記録を更新
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.coverImage !== undefined && { coverImage: updates.coverImage }),
        ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
        ...(updates.selectedTagIds !== undefined && { selectedTagIds: updates.selectedTagIds }),
        ...(updates.titleConfirmed !== undefined && { titleConfirmed: updates.titleConfirmed }),
      },
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

    console.log(`Updated trip: ${id}`)

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
    })
  } catch (error) {
    console.error('Failed to update trip:', error)
    return NextResponse.json(
      { 
        error: '旅行記録の更新に失敗しました',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * 旅行記録を削除
 * - 関連するスポットと写真も自動削除（CASCADE）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.trip.delete({
      where: { id },
    })

    console.log(`Deleted trip: ${id}`)

    return NextResponse.json({
      success: true,
      message: '旅行記録を削除しました',
    })
  } catch (error) {
    console.error('Failed to delete trip:', error)
    return NextResponse.json(
      { 
        error: '旅行記録の削除に失敗しました',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
