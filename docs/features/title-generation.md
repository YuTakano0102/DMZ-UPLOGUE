# タイトル生成機能（F-015）改訂版

## 概要

写真から旅行記録を生成する際に、**Uplogue辞書**を使って5つのタグを生成し、ユーザーが選んだ3つのタグから**テンプレートベース**でタイトルを自動生成する機能です。

**改訂のポイント:**
- ✅ **必ず5つのタグ**が出る（カテゴリ固定＋バックフィル）
- ✅ **Uplogueらしい語彙**（辞書で変換）
- ✅ **テンプレート式のタイトル**（ただの連結を回避）
- ✅ **AI不要**（ルールベースで完結）

## 体験フロー

```
写真アップロード
   ↓
旅行記録生成（スポット/タイムライン/地図）
   ↓
タグ候補を5つ提示（"この旅の核"）
   ↓
ユーザーが3つ選ぶ
   ↓
選ばれた3タグだけでAIがタイトル生成（3案）
   ↓
タイトル確定（編集も可）→ 保存
```

## タグ生成の仕組み

### タグカテゴリ（5つ - 固定）

| カテゴリ | 数 | 抽出元データ | 例 |
|---------|---|------------|---|
| place | 1 | 逆ジオコーディング | 「東京都」「京都府」「どこかの街角」 |
| season | 1 | 日付・月 | 「春の旅」「冬の空気」 |
| time | 1 | EXIF撮影時刻 | 「朝の時間」「夕方の時間」 |
| motion | 1 | GPS移動距離 | 「よく歩いた日」「ゆるく散歩」 |
| mood | 1 | ヒューリスティック | 「街のざわめき」「やわらかな光」 |

**保証:**
- 各カテゴリから**最低1つずつ**選出
- 合計**必ず5つ**のタグを返す
- データが不足している場合はフォールバックで補完

### Uplogue辞書（/lib/uplogue-lexicon.ts）

機械的なデータを「Uplogueらしい語彙」に変換:

#### 1. 時間帯の変換

```typescript
hourToTimeLabelJP(hour: number): string
- 0-6時  → "夜更け"
- 6-10時 → "朝"
- 10-12時 → "午前"
- 12-15時 → "昼下がり"
- 15-18時 → "午後"
- 18-21時 → "夕方"
- 21-24時 → "夜"
```

#### 2. 移動距離の変換

```typescript
distanceToMotionLabelJP(distanceKm: number): string
- ≥15km → "よく歩いた日"
- 8-15km → "歩き回った"
- 3-8km → "ゆるく散歩"
- <3km → "近くをめぐる"
```

#### 3. 季節の変換

```typescript
monthToSeasonJP(month: number): { season, label }
- 12, 1, 2月 → { season: "winter", label: "冬" }
- 3, 4, 5月 → { season: "spring", label: "春" }
- 6, 7, 8月 → { season: "summer", label: "夏" }
- 9, 10, 11月 → { season: "autumn", label: "秋" }
```

#### 4. 雰囲気の変換

```typescript
sunlightToMoodLabelJP(isLikelyBright: boolean): string
- 明るい → "まぶしさの記憶"
- 暗い → "やわらかな光"

デフォルト:
- "街のざわめき"
- "路地の気配"
- "手探りの旅"（GPS情報が少ない場合）
```

## タイトル生成のルール

### テンプレートベースの生成（/lib/title-generator.ts）

ユーザーが選んだ3つのタグから、**テンプレート式**でタイトルを生成:

#### テンプレート1: Place + Season + Poetic

```typescript
`${place}、${season}の${poeticLabel}`

例: 東京都、冬の旅の街のざわめき
```

#### テンプレート2: Time + Place + Action

```typescript
`${time}の${place}で、${motion || "ふらりと歩く"}`

例: 朝の時間の京都府で、ゆるく散歩
```

#### テンプレート3: Minimal Poetic

```typescript
`${place || season}の記憶 — ${poeticLabel}`

例: 京都府の記憶 — やわらかな光
```

**特徴:**
- ✅ 「ただつなげただけ」を回避
- ✅ 詩的な余白を残す
- ✅ 自然な日本語
- ✅ AI不要（即座に生成）

### Reality Anchor（事実の表示）

タイトルは詩的であるべきですが、事実情報は別枠で確実に表示します:

```
東京都 / 2026年2月
京都府 / 2025年11月
```

これはAI生成不要で、確定情報として出します。

## 実装ファイル

### 1. Uplogue辞書

```
/lib/uplogue-lexicon.ts
```

- `UplogueTag` 型定義
- `monthToSeasonJP()` - 月から季節へ
- `hourToTimeLabelJP()` - 時刻から時間帯へ
- `distanceToMotionLabelJP()` - 距離から移動感へ
- `sunlightToMoodLabelJP()` - 明るさから雰囲気へ

### 2. タグ生成ロジック

```
/lib/tag-generator.ts
```

- `generateUplogueTags(input: TagCandidateInput): UplogueTag[]`
  - 旅行データから必ず5つのタグを生成
  - カテゴリ保証機能つき

### 3. タイトル生成ロジック

```
/lib/title-generator.ts
```

- `generateTitleSuggestions(selectedTags: UplogueTag[]): TitleSuggestion[]`
  - 選択された3つのタグからテンプレートでタイトル生成
  - 最大3案を返す

### 4. 旅行生成への統合

```
/lib/trip-generator.ts
```

- `TripGenerationResult` に `tags` を追加
- 旅行記録生成後にタグを自動生成
- Trip型に `tags` と `titleSuggestions` を保持

### 5. 型定義の拡張

```
/lib/mock-data.ts
```

```typescript
export interface Trip {
  // ... 既存フィールド
  tags?: UplogueTag[]
  titleSuggestions?: TitleSuggestion[]
}
```

### 6. フロントエンド

```
/app/[locale]/upload/page.tsx
```

**新しいステップ:**
- `tags`: タグ選択画面（5つから3つ選ぶ）
- `title`: タイトル選択・編集画面（3案から選ぶ or 編集）

**新しいstate:**
```typescript
const [uplogueTags, setUplogueTags] = useState<UplogueTag[]>([])
const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([])
const [selectedTitle, setSelectedTitle] = useState<string>("")
const [isEditingTitle, setIsEditingTitle] = useState(false)
```

**タグ表示の改善:**
- カテゴリバッジを表示（place/season/time/motion/mood）
- スコアに基づく優先順位表示
- reason（理由）をツールチップで表示

## セットアップ

### 1. 依存パッケージ

追加のパッケージは不要です。すべてルールベースで動作します。

### 2. 開発サーバーの起動

```bash
npm run dev
```

## 使い方

1. **写真をアップロード**: UpLogueページで写真を選択
2. **旅行記録生成**: 自動でスポット・タイムライン・地図を生成
3. **タグ選択**: 必ず5つ表示されるタグから気に入った3つを選択
   - カテゴリバッジで識別しやすい
   - reason（理由）で納得感を確認
4. **タイトル生成**: テンプレートで3つのタイトル案を即座に生成
5. **タイトル確定**: 3案から選ぶか、自分で編集して保存

## デザイン原則

### タグ設計

✅ **良いタグの例:**
- 短い（8〜12文字）
- 詩的で余白がある
- 感情ではなく「様子」を表現

```
✅ 「水の匂い」
✅ 「夕方が濃い」
✅ 「路地の連続」

❌ 「浅草寺周辺の観光」
❌ 「隅田川沿いを散歩」
```

### タイトル生成

- **タイトル**: 詩的・抽象的（AI生成）
- **Reality Anchor**: 事実・具体的（自動取得）

```
【タイトル】
夕方、水の近くで冷たい空気

【Reality Anchor】
東京都 / 2026年2月
```

## 今後の拡張（Phase2以降）

### Phase 2
- 逆ジオコーディングの `place` カテゴリを使ってタグ精度UP
- タグの説明文の充実
- タイトル候補のバリエーション増加

### Phase 3
- Vision APIで画像内容解析
  - 「色」「空気感」のタグ強化
  - ただしAI臭くならない制約が必要
- ユーザーフィードバックによるタグ学習

## トラブルシューティング

### タグが5つより少ない

→ **起こりません**。必ず5つ生成されます（バックフィル機能つき）

### タグが「機械的」に見える

→ Uplogue辞書で変換されるため、詩的な表現になります
- 悪い例: 「駅周辺」
- 良い例: 「朝の時間」「ゆるく散歩」

### タイトルがただの連結になる

→ **起こりません**。テンプレート式で自然な日本語になります
- 悪い例: 「東京都、冬の旅、朝の時間」
- 良い例: 「東京都、冬の旅の朝の時間」

### GPS情報が少ない場合

- place: 「どこかの街角」（フォールバック）
- motion: gpsRatio から推定
- mood: 「手探りの旅」（GPS不足を示唆）

## アーキテクチャの利点

### 1. AI不要 = 高速 & 安定

- タグ生成: 即座（0.1秒以内）
- タイトル生成: 即座（ローカル処理）
- コスト: $0（API呼び出しなし）

### 2. 後からAI追加可能

現在の設計は「差し替え可能」:

```typescript
// 現在: ルールベース
const tags = generateUplogueTags(input)

// 将来: Vision API
const tags = await generateUplogueTagsWithVision(input, photoBlobs)
```

`tag-generator.ts` だけを置き換えれば、フロントエンドは変更不要。

### 3. デバッグしやすい

- タグ生成ロジックが明示的
- `reason` フィールドで根拠を確認可能
- `score` で優先度を調整可能

## 参考リンク

- [exifr Library](https://github.com/MikeKovarik/exifr)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
