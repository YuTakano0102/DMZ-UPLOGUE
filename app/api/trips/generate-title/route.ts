import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = "nodejs"
export const maxDuration = 30

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GenerateTitleRequest {
  tags: string[]
  location?: string
  date?: string
}

/**
 * タイトル生成API
 * POST /api/trips/generate-title
 * 
 * ユーザーが選択した3つのタグからタイトルを生成
 * 
 * Request body:
 * - tags: string[] (3つのタグ)
 * - location?: string (地名、表示用)
 * - date?: string (日付、表示用)
 * 
 * Response:
 * - titles: string[] (3つのタイトル案)
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateTitleRequest = await request.json()
    const { tags, location, date } = body

    // バリデーション
    if (!tags || !Array.isArray(tags) || tags.length !== 3) {
      return NextResponse.json(
        { error: 'タグは3つ選択してください' },
        { status: 400 }
      )
    }

    // OpenAI APIでタイトル生成
    const prompt = `あなたはUplogueの編集者です。
入力された3つのタグだけを使って、短い日本語タイトルを3案作ってください。

ルール:
- 新しい情報を追加しない
- 地名は入れない（地名は別表示する）
- 感情語は禁止（楽しい/最高/感動など）
- 10〜18文字程度
- 余白を残す
- 3案はニュアンスを変える（静/動/抽象）
- タグの語順を変えたり、助詞を補ったりして自然な日本語にする
- 必ず3つのタグすべてを使う

タグ:
${tags.map((t, i) => `${i + 1}. ${t}`).join('\n')}

JSONフォーマットで3つのタイトルを返してください:
{"titles": ["タイトル1", "タイトル2", "タイトル3"]}`

    console.log('Generating titles with OpenAI...')
    console.log('Tags:', tags)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは旅の記録のタイトルを生成する編集者です。与えられたタグだけを使い、詩的で余白のあるタイトルを作ります。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('タイトル生成に失敗しました')
    }

    const result = JSON.parse(content)
    console.log('Generated titles:', result.titles)

    // タイトルの検証
    if (!result.titles || !Array.isArray(result.titles) || result.titles.length !== 3) {
      throw new Error('タイトル生成に失敗しました')
    }

    return NextResponse.json({
      success: true,
      titles: result.titles,
      metadata: {
        location,
        date,
      },
    })
  } catch (error) {
    console.error('Title generation error:', error)

    const errorMessage = error instanceof Error ? error.message : 'タイトル生成に失敗しました'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
