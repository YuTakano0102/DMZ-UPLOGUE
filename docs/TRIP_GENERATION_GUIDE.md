# 旅行記録自動生成機能 実装ガイド

## 概要

写真から旅行記録を自動生成する機能を実装しました。要件定義書の F-006（旅行自動生成）に基づき、EXIF情報の抽出、時系列整列、クラスタリング、逆ジオコーディングを実装しています。

## 実装された機能

### 1. EXIF情報抽出 (`lib/exif-utils.ts`)

- **機能**: 写真ファイルからGPS座標と撮影日時を抽出
- **実装状況**: 基本実装完了（簡易版）
- **改善推奨**: 
  - 本番環境では`exifr`または`exif-js`ライブラリの使用を推奨
  - 現状は`File.lastModified`を使用した簡易実装

```bash
# 推奨ライブラリのインストール
pnpm add exifr
```

### 2. クラスタリングアルゴリズム (`lib/exif-utils.ts`)

- **距離閾値**: 200メートル
- **時間閾値**: 30分
- **アルゴリズム**: Haversine formulaを使用した距離計算
- **処理フロー**:
  1. GPS情報を持つ写真を時系列でソート
  2. 距離または時間が閾値を超えたら新しいクラスタを作成
  3. クラスタごとに中心座標と到着・出発時刻を算出

### 3. 逆ジオコーディング (`lib/geocoding.ts`)

- **API**: Mapbox Geocoding API
- **機能**: GPS座標からスポット名と住所を取得
- **言語**: 日本語
- **設定方法**: 
  - `.env.local`に`NEXT_PUBLIC_MAPBOX_TOKEN`を設定
  - Mapboxアカウントが必要

### 4. 旅行記録生成サービス (`lib/trip-generator.ts`)

- **処理フロー**:
  1. EXIF情報抽出
  2. クラスタリング
  3. 逆ジオコーディング
  4. 旅行記録データ生成
- **進捗通知**: コールバック関数で進捗を通知

### 5. API エンドポイント (`app/api/trips/generate/route.ts`)

- **エンドポイント**: `POST /api/trips/generate`
- **入力**: FormDataで複数の写真ファイル
- **出力**: 生成された旅行記録データ + 警告メッセージ
- **制限**: 一度に最大500枚まで

### 6. データストレージ (`lib/trip-storage.ts`)

- **現在の実装**: localStorage
- **将来の実装**: PostgreSQLなどのデータベース
- **機能**: 
  - 旅行記録の保存・取得・更新・削除
  - MyLogueページでの一覧表示

## 環境変数設定

`.env.local`に以下を追加してください:

```env
# Mapbox API Token (逆ジオコーディング用)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

## 使用方法

1. **写真のアップロード**
   - `/upload`ページで写真を選択
   - GPS情報付きの写真を推奨

2. **旅行記録の自動生成**
   - 「この旅を生成する」ボタンをクリック
   - 進捗表示を確認しながら生成

3. **生成結果の確認**
   - タイムライン表示でスポットを確認
   - 地図表示でルートを確認

4. **保存と管理**
   - 自動的にlocalStorageに保存
   - MyLogueページで一覧表示

## 改善の推奨事項

### 1. EXIF抽出の強化

```bash
pnpm add exifr
```

```typescript
// lib/exif-utils.tsの改善例
import exifr from 'exifr'

export async function extractExifAdvanced(file: File): Promise<ExifData> {
  const exif = await exifr.parse(file, {
    gps: true,
    exif: true,
  })
  
  return {
    latitude: exif?.latitude || null,
    longitude: exif?.longitude || null,
    timestamp: exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : null,
    fileName: file.name,
  }
}
```

### 2. 画像のアップロード

現状はObjectURLを使用していますが、本番環境ではS3などのストレージサービスへのアップロードを実装してください。

```typescript
// 例: AWS S3へのアップロード
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

async function uploadToS3(file: File, tripId: string): Promise<string> {
  const s3Client = new S3Client({ region: 'ap-northeast-1' })
  const key = `trips/${tripId}/${file.name}`
  
  await s3Client.send(new PutObjectCommand({
    Bucket: 'your-bucket-name',
    Key: key,
    Body: file,
    ContentType: file.type,
  }))
  
  return `https://your-bucket-name.s3.ap-northeast-1.amazonaws.com/${key}`
}
```

### 3. データベース連携

PostgreSQL + PostGISでの実装例:

```sql
-- テーブル定義例
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  cover_image TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255),
  spot_count INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  arrival_time TIMESTAMPTZ NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  representative_photo TEXT
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 認証との連携

現在は認証なしで動作しますが、Auth0などと連携してユーザー管理を実装してください。

### 5. パフォーマンス最適化

- 画像の圧縮・リサイズ
- サムネイル生成
- バッチ処理の最適化
- キャッシュの活用

## テスト方法

1. GPS情報付きの写真を準備
2. `/upload`ページにアクセス
3. 写真を選択してアップロード
4. 生成ボタンをクリック
5. 生成結果を確認

## トラブルシューティング

### GPS情報が検出されない

- 写真にGPS情報が含まれているか確認
- exifrライブラリの導入を検討

### 逆ジオコーディングが失敗する

- Mapbox APIトークンが正しく設定されているか確認
- APIのレート制限を確認

### 生成が遅い

- 写真数を減らす
- 画像圧縮を実装
- バッチ処理の最適化

## 参考資料

- [要件定義書](../docs/output/detailed_requirements_specification.md)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [exifr ドキュメント](https://github.com/MikeKovarik/exifr)
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula)
