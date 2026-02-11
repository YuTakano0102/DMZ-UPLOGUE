/**
 * 写真アップロードAPI
 * POST /api/photos/upload
 * 
 * Supabase Storageに写真をアップロードして、公開URLを返す
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase'

// Supabaseを使うためNode.js Runtimeを明示
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('photos').filter((v): v is File => v instanceof File)

    if (files.length === 0) {
      return NextResponse.json(
        { error: '写真が選択されていません' },
        { status: 400 }
      )
    }

    // 写真数の上限チェック
    if (files.length > 100) {
      return NextResponse.json(
        { error: '一度にアップロードできる写真は100枚までです' },
        { status: 400 }
      )
    }

    console.log(`Uploading ${files.length} photos to Supabase Storage...`)

    // 並列アップロード（バッチ処理で高速化）
    const uploadPromises = files.map(async (file, index) => {
      try {
        // ファイル名を一意にする（タイムスタンプ + ランダム文字列）
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 9)
        const extension = file.name.split('.').pop() || 'jpg'
        const uniqueFileName = `${timestamp}-${randomStr}-${index}.${extension}`
        
        // Supabase Storageにアップロード
        const { url, path } = await uploadFile(
          STORAGE_BUCKETS.PHOTOS,
          uniqueFileName,
          file,
          {
            cacheControl: '31536000', // 1年間キャッシュ
            upsert: false,
          }
        )

        console.log(`✓ Uploaded: ${file.name} → ${path}`)

        return {
          originalName: file.name,
          url,
          path,
          size: file.size,
          type: file.type,
        }
      } catch (error) {
        console.error(`✗ Failed to upload ${file.name}:`, error)
        throw error
      }
    })

    const uploadedPhotos = await Promise.all(uploadPromises)

    console.log(`Successfully uploaded ${uploadedPhotos.length} photos`)

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
    })
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '写真のアップロードに失敗しました',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
