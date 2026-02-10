# Uplogueタグシステム - 実装ガイド

## 📋 概要

このシステムは、写真から旅行記録を生成する際に、**必ず5つのタグ**を生成し、ユーザーが選んだ3つからテンプレートベースでタイトルを自動生成します。

**特徴:**
- ✅ AI不要（ルールベースで完結）
- ✅ 必ず5つのタグ（カテゴリ固定）
- ✅ Uplogueらしい語彙（辞書変換）
- ✅ テンプレート式タイトル（ただの連結を回避）

## 🏗️ アーキテクチャ

```
写真 → EXIF/GPS抽出
   ↓
Uplogue辞書で変換
   ↓
5つのタグ生成（place/season/time/motion/mood）
   ↓
ユーザーが3つ選択
   ↓
テンプレートでタイトル生成
```

## 📁 ファイル構成

### 1. `/lib/uplogue-lexicon.ts` - 辞書

機械的なデータを「Uplogueらしい語彙」に変換:

```typescript
// 時間帯の変換
hourToTimeLabelJP(15) → "午後"

// 移動距離の変換
distanceToMotionLabelJP(10) → "歩き回った"

// 季節の変換
monthToSeasonJP(2) → { season: "winter", label: "冬" }
```

### 2. `/lib/tag-generator.ts` - タグ生成

5つのカテゴリから必ずタグを生成:

```typescript
export function generateUplogueTags(input: TagCandidateInput): UplogueTag[] {
  // 1. 候補を生成
  // 2. カテゴリごとにトップを選出
  // 3. 不足分をバックフィル
  // 4. 必ず5つ返す
}
```

**カテゴリ保証:**
- `place`: 場所（trip.location → 都道府県 → フォールバック）
- `season`: 季節（月から判定）
- `time`: 時間帯（写真の時刻から平均）
- `motion`: 移動感（GPS距離から判定）
- `mood`: 雰囲気（ヒューリスティック）

### 3. `/lib/title-generator.ts` - タイトル生成

3つのタグからテンプレートでタイトル生成:

```typescript
export function generateTitleSuggestions(
  selectedTags: UplogueTag[]
): TitleSuggestion[] {
  // テンプレート1: Place + Season + Poetic
  // テンプレート2: Time + Place + Action
  // テンプレート3: Minimal Poetic
  // → 3案を返す
}
```

## 🔧 使い方

### タグ生成

```typescript
import { generateUplogueTags } from './tag-generator'

const tags = generateUplogueTags({
  trip,
  startDateISO: '2026-02-10',
  photoTimestamps: [new Date(), ...],
  gpsRatio: 0.8,
  distanceKm: 5.2,
})

console.log(tags)
// [
//   { id: 'place:東京都', category: 'place', label: '東京都', score: 0.95 },
//   { id: 'season:冬の旅', category: 'season', label: '冬の旅', score: 0.9 },
//   { id: 'time:朝の時間', category: 'time', label: '朝の時間', score: 0.85 },
//   { id: 'motion:ゆるく散歩', category: 'motion', label: 'ゆるく散歩', score: 0.85 },
//   { id: 'mood:街のざわめき', category: 'mood', label: '街のざわめき', score: 0.6 },
// ]
```

### タイトル生成

```typescript
import { generateTitleSuggestions } from './title-generator'

// ユーザーが3つ選択
const selectedTags = tags.slice(0, 3)

const suggestions = generateTitleSuggestions(selectedTags)

console.log(suggestions)
// [
//   { 
//     title: '東京都、冬の旅の朝の時間',
//     subtitle: 'ゆるく散歩・街のざわめき',
//   },
//   {
//     title: '朝の時間の東京都で、ゆるく散歩',
//     subtitle: '冬の旅',
//   },
//   {
//     title: '東京都の記憶 — 朝の時間',
//     subtitle: '東京都 / 冬の旅・ゆるく散歩',
//   },
// ]
```

## 🎨 カスタマイズ

### 辞書を拡張する

`/lib/uplogue-lexicon.ts` に新しい変換関数を追加:

```typescript
export function weatherToMoodLabelJP(isRainy: boolean): string {
  return isRainy ? "雨の匂い" : "晴れた日"
}
```

### タグカテゴリを追加する

1. `TagCategory` 型を拡張:

```typescript
export type TagCategory = "place" | "season" | "time" | "motion" | "mood" | "weather"
```

2. `tag-generator.ts` で新しいカテゴリを生成:

```typescript
// Weather tags
if (weatherData) {
  candidates.push(makeTag("weather", weatherToMoodLabelJP(weatherData.isRainy), 0.8))
}
```

3. カテゴリ保証に追加:

```typescript
;(["place", "season", "time", "motion", "mood", "weather"] as TagCategory[]).forEach((cat) => {
  const top = pickTopByCategory(cleaned, cat)
  if (top) selected.push(top)
})
```

### テンプレートを追加する

`/lib/title-generator.ts` に新しいテンプレートを追加:

```typescript
// 4) Weather + Motion
if (weather && motion) {
  suggestions.push({
    title: `${weather}の中を${motion}`,
    subtitle: p || s || undefined,
    usedTagIds: selectedTags.map((x) => x.id),
  })
}
```

## 🧪 テスト

### タグが必ず5つ出るか確認

```typescript
const tags = generateUplogueTags({
  trip: emptyTrip, // スポット0件
  startDateISO: '2026-02-10',
})

console.assert(tags.length === 5, 'タグは必ず5つ生成されるべき')
```

### カテゴリが重複していないか確認

```typescript
const categories = tags.map(t => t.category)
const uniqueCategories = new Set(categories)

console.assert(
  uniqueCategories.size === 5,
  'カテゴリは重複しないべき'
)
```

### タイトルが生成されるか確認

```typescript
const suggestions = generateTitleSuggestions(tags.slice(0, 3))

console.assert(
  suggestions.length >= 1 && suggestions.length <= 3,
  'タイトルは1〜3案生成されるべき'
)
```

## 🚀 拡張案（Phase 2以降）

### Vision APIで画像内容を解析

```typescript
// 現在: ルールベース
const tags = generateUplogueTags(input)

// 将来: Vision API
const imageAnalysis = await analyzeImagesWithVision(photoBlobs)
const tags = generateUplogueTagsWithVision({
  ...input,
  imageAnalysis,
})
```

`tag-generator.ts` だけを置き換えれば、フロントエンドは変更不要。

### LLMでタイトルを洗練

```typescript
// 現在: テンプレート
const suggestions = generateTitleSuggestions(selectedTags)

// 将来: LLM
const suggestions = await refineTitlesWithLLM(
  generateTitleSuggestions(selectedTags)
)
```

テンプレート版をベースラインとして、LLMで洗練。

### ユーザーフィードバックで学習

```typescript
// タグの選択率を記録
trackTagSelection(tagId, wasSelected)

// スコアを調整
tag.score *= learningRate
```

## 🐛 トラブルシューティング

### タグが5つより少ない

→ **起こりません**。バックフィル機能で必ず5つ生成されます。

### タグが機械的

→ `uplogue-lexicon.ts` の変換関数を見直してください。

### タイトルがただの連結

→ `title-generator.ts` のテンプレートを見直してください。

## 📚 参考資料

- `/docs/features/title-generation.md` - 詳細なドキュメント
- `/lib/mock-data.ts` - データ型定義
- `/app/[locale]/upload/page.tsx` - UI実装

## 💡 Tips

### デバッグ用のログ

```typescript
const tags = generateUplogueTags(input)
console.table(tags.map(t => ({
  category: t.category,
  label: t.label,
  score: t.score.toFixed(2),
  reason: t.reason,
})))
```

### タグのスコア調整

```typescript
// より重要なタグのスコアを上げる
if (tag.category === 'place' && tag.label !== 'どこかの街角') {
  tag.score = Math.min(1, tag.score * 1.1)
}
```

### フォールバックの優先順位

```typescript
// フォールバックのスコアを下げる
makeTag("place", unknownPlaceLabel(), 0.35, "fallback")
makeTag("time", "ある日の時間", 0.4, "fallback")
```

---

**質問・フィードバック:**
このシステムは進化中です。改善案があれば Issue または PR でお知らせください。
