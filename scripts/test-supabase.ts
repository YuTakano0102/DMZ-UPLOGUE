/**
 * Supabase接続テストスクリプト
 * 実行: npx tsx scripts/test-supabase.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// .env.localを明示的に読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabase, supabaseAdmin } from '../lib/supabase'
import { prisma } from '../lib/prisma'

async function testSupabaseConnection() {
  console.log('🧪 Supabase接続テスト開始...\n')

  // 1. Supabaseクライアント接続テスト
  console.log('1️⃣ Supabaseクライアント接続テスト')
  try {
    const { data, error } = await supabase
      .from('Trip')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('   ⚠️  警告:', error.message)
      console.log('   (これは正常です。テーブルがまだ空の可能性があります)')
    } else {
      console.log('   ✅ 接続成功')
    }
  } catch (err) {
    console.error('   ❌ エラー:', err)
  }

  // 2. Prisma接続テスト
  console.log('\n2️⃣ Prisma Database接続テスト')
  try {
    await prisma.$connect()
    console.log('   ✅ データベース接続成功')
    
    const tripCount = await prisma.trip.count()
    console.log(`   📊 現在の旅行記録数: ${tripCount}`)
  } catch (err) {
    console.error('   ❌ エラー:', err)
  } finally {
    await prisma.$disconnect()
  }

  // 3. Storage接続テスト
  console.log('\n3️⃣ Supabase Storage接続テスト')
  try {
    const { data, error } = await supabase.storage
      .from('photos')
      .list('', {
        limit: 1,
      })
    
    if (error) {
      console.error('   ❌ エラー:', error.message)
    } else {
      console.log('   ✅ Storageバケット接続成功')
      console.log(`   📁 ファイル数: ${data?.length || 0}`)
    }
  } catch (err) {
    console.error('   ❌ エラー:', err)
  }

  console.log('\n✨ テスト完了！')
}

testSupabaseConnection().catch(console.error)
