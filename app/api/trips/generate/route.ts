import { NextRequest, NextResponse } from 'next/server'
import { generateTripFromPhotos } from '@/lib/trip-generator'
import type { ExifData } from '@/lib/exif-utils'

// Vercel Serverless Functionのタイムアウトと実行環境を設定
export const runtime = "nodejs"
export const maxDuration = 60

/**
 * 旅行記録生成API
 * POST /api/trips/generate
 * 
 * Request body: FormData with multiple 'photos' files
 * Response: 生成された旅行記録データ
 * 
 * Note: 現時点ではクライアントサイドでlocalStorageに保存
 * 将来的にはサーバーサイドでデータベースに保存
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // ✅ 写真ファイル、photoIDs、EXIF情報を取得
    const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File)
    const photoIds = formData.getAll("photoIds").filter((v): v is string => typeof v === "string")
    const exifDataString = formData.get("exifData")

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: '写真が選択されていません' },
        { status: 400 }
      )
    }

    // 写真数の上限チェック(パフォーマンス対策)
    if (photoFiles.length > 500) {
      return NextResponse.json(
        { error: '一度にアップロードできる写真は500枚までです' },
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

    // 旅行記録を生成
    const result = await generateTripFromPhotos(photoFiles, undefined, ids, exifDataArray)

    // 成功レスポンス
    // Note: 実際の画像URLはクライアント側でObjectURLを使用
    // 将来的にはS3などにアップロードしてURLを返す
    return NextResponse.json({
      success: true,
      trip: result.trip,
      warnings: result.warnings,
      tags: result.tags,
    })
  } catch (error) {
    console.error('Trip generation error:', error)
    
    // エラーの詳細をログに記録(本番環境では適切なロギングサービスを使用)
    const errorMessage = error instanceof Error ? error.message : '旅行記録の生成に失敗しました'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
