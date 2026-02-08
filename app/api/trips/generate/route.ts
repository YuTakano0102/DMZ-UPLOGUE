import { NextRequest, NextResponse } from 'next/server'
import { generateTripFromPhotos } from '@/lib/trip-generator'

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
    const photoFiles: File[] = []

    // FormDataから写真ファイルを取得
    for (const [key, value] of formData.entries()) {
      if (key === 'photos' && value instanceof File) {
        photoFiles.push(value)
      }
    }

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

    // 旅行記録を生成
    const result = await generateTripFromPhotos(photoFiles)

    // 成功レスポンス
    // Note: 実際の画像URLはクライアント側でObjectURLを使用
    // 将来的にはS3などにアップロードしてURLを返す
    return NextResponse.json({
      success: true,
      trip: result.trip,
      warnings: result.warnings,
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
