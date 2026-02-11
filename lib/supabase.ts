/**
 * Supabaseクライアント設定
 * StorageとDatabaseの両方にアクセス
 */

import { createClient } from '@supabase/supabase-js'

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * クライアントサイド用（ブラウザ）
 * - 認証されたユーザーの権限で動作
 * - Row Level Securityが適用される
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * サーバーサイド用（API Routes、Server Components）
 * - 管理者権限で動作
 * - Row Level Securityをバイパス可能
 * - 機密情報にアクセス可能
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

/**
 * Storage バケット名
 */
export const STORAGE_BUCKETS = {
  PHOTOS: 'photos', // 旅行写真
  THUMBNAILS: 'thumbnails', // サムネイル（オプション）
} as const

/**
 * Storageから公開URLを取得
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Storageにファイルをアップロード
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    cacheControl?: string
    upsert?: boolean
  }
): Promise<{ url: string; path: string }> {
  const client = supabaseAdmin || supabase

  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: options?.cacheControl || '3600',
    upsert: options?.upsert || false,
  })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  const url = getPublicUrl(bucket, data.path)

  return {
    url,
    path: data.path,
  }
}

/**
 * Storageからファイルを削除
 */
export async function deleteFile(bucket: string, paths: string[]): Promise<void> {
  const client = supabaseAdmin || supabase

  const { error } = await client.storage.from(bucket).remove(paths)

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}
