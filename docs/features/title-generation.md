# タイトル生成機能（F-015）

## 概要

写真から旅行記録を生成する際に、ユーザーが選んだ「印象タグ」からAIがタイトルを自動生成する機能です。

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

### タグカテゴリ（5つ）

| カテゴリ | 数 | 抽出元データ | 例 |
|---------|---|------------|---|
| 時間 | 1 | EXIF撮影時刻 | 「朝が長い」「夕方が濃い」 |
| 移動 | 1 | GPS移動距離 | 「歩き続けた」「留まった」 |
| 場所 | 2 | 逆ジオコーディング | 「水の近く」「境内」 |
| 空気 | 1 | 日付・季節 | 「空気が冷たい」「光が強い」 |

### タグ抽出ロジック

#### A. 時間帯タグ（EXIF時刻）

```typescript
スポットの到着時刻を4つのバケットに分類:
- 朝 (0-10時)
- 昼 (10-15時)
- 夕 (15-19時)
- 夜 (19時-24時)

最も多いバケット → タグ
```

#### B. 移動タグ（GPS距離）

```typescript
スポット間の総移動距離を計算:
- > 5km  → 「歩き続けた」
- 2-5km  → 「巡った」
- < 2km  → 「留まった」
```

#### C. 場所タグ（住所文字列）

```typescript
逆ジオコーディングの住所から正規表現マッチング:
- 川|橋|water|river|海|湖 → 「水の近く」
- 公園|park|garden → 「緑のそば」
- 駅|station → 「駅の周辺」
- 寺|神社|shrine|temple → 「境内」
- cafe|カフェ|coffee|喫茶 → 「カフェ」

※ 最大2つまで抽出
※ マッチしない場合は「街の中」をデフォルト
```

#### D. 空気タグ（日付・季節）

```typescript
旅行開始日の月から季節判定:
- 12, 1, 2月 → 「空気が冷たい」（冬）
- 6, 7, 8月  → 「光が強い」（夏）
- 3, 4, 5月  → 「風がやわらかい」（春）
- 9, 10, 11月 → 「風が澄んでる」（秋）
```

## タイトル生成のルール

### AIへのプロンプト設計

```
あなたはUplogueの編集者です。
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
```

### Reality Anchor（事実の表示）

タイトルは詩的であるべきですが、事実情報は別枠で確実に表示します:

```
東京都 / 2026年2月
京都府 / 2025年11月
```

これはAI生成不要で、確定情報として出します。

## 実装ファイル

### 1. タグ生成ロジック

```
/lib/impression-tags.ts
```

- `generateImpressionTags(trip: Trip): ImpressionTag[]`
  - 旅行データから5つの印象タグを生成

### 2. 旅行生成への統合

```
/lib/trip-generator.ts
```

- `TripGenerationResult` に `impressionTags` を追加
- 旅行記録生成後にタグを自動生成

### 3. タイトル生成API

```
/app/api/trips/generate-title/route.ts
```

- `POST /api/trips/generate-title`
- リクエスト:
  ```json
  {
    "tags": ["夕方が濃い", "水の近く", "空気が冷たい"],
    "location": "東京都",
    "date": "2026-02-10"
  }
  ```
- レスポンス:
  ```json
  {
    "success": true,
    "titles": [
      "夕方、水の近くで冷たい空気",
      "冷たい空気の水辺に夕方が落ちる",
      "水辺の夕、冷えた空気"
    ],
    "metadata": {
      "location": "東京都",
      "date": "2026-02-10"
    }
  }
  ```

### 4. フロントエンド

```
/app/[locale]/upload/page.tsx
```

**新しいステップ:**
- `tags`: タグ選択画面（5つから3つ選ぶ）
- `title`: タイトル選択・編集画面（3案から選ぶ or 編集）

**新しいstate:**
```typescript
const [impressionTags, setImpressionTags] = useState<ImpressionTag[]>([])
const [selectedTags, setSelectedTags] = useState<string[]>([])
const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
const [selectedTitle, setSelectedTitle] = useState<string>("")
const [isEditingTitle, setIsEditingTitle] = useState(false)
```

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install openai
```

### 2. 環境変数の設定

`.env.local` に以下を追加:

```bash
# OpenAI API Key
# タイトル生成機能に使用
OPENAI_API_KEY=your-openai-api-key-here
```

OpenAI APIキーは [platform.openai.com](https://platform.openai.com/) で取得できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 使い方

1. **写真をアップロード**: UpLogueページで写真を選択
2. **旅行記録生成**: AIが自動でスポット・タイムライン・地図を生成
3. **タグ選択**: 5つの印象タグから気に入った3つを選択
4. **タイトル生成**: AIが3つのタイトル案を生成
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

### タグが生成されない

- スポットが0件の場合はタグ生成をスキップ
- GPS情報がない場合は場所タグが「街の中」になる

### タイトル生成が失敗する

- OpenAI APIキーが正しく設定されているか確認
- APIレート制限に達していないか確認
- ネットワーク接続を確認

### タグの精度が低い

- GPS情報が少ない場合、場所タグの精度が下がります
- 写真にEXIF情報が含まれているか確認
- HEIC形式の写真はGPS情報が取得できない場合があります

## 参考リンク

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [exifr Library](https://github.com/MikeKovarik/exifr)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
