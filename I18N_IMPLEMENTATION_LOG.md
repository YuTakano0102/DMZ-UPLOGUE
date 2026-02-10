# 言語切り替え機能実装ログ

## 実施日時
2026年2月10日

## 目的
Next.js 16アプリケーションに日本語と英語の言語切り替え機能を実装する
- ベース言語: 日本語
- 追加言語: 英語
- 実装方法: `next-intl` v4.8.2を使用

---

## 実装手順

### 1. パッケージのインストール

```bash
npm install next-intl
```

**インストールされたパッケージ:**
- `next-intl@4.8.2`
- 関連する依存パッケージ約23個

### 2. ファイル構造の作成

以下のファイル・フォルダを新規作成:

```
DMZ-UPLOGUE/
├── i18n/
│   ├── config.ts          # ロケール設定（ja, en）
│   └── request.ts         # next-intlのリクエスト設定
├── messages/
│   ├── ja.json           # 日本語翻訳
│   └── en.json           # 英語翻訳
├── middleware.ts         # ロケール検出・ルーティング
├── types/
│   └── next-intl.d.ts    # TypeScript型定義
├── components/
│   └── language-switcher.tsx  # 言語切り替えコンポーネント
└── app/
    └── [locale]/         # 動的ロケールルート
        ├── layout.tsx
        ├── page.tsx
        ├── login/
        ├── register/
        ├── home/
        ├── mylogue/
        ├── maplogue/
        ├── upload/
        ├── profile/
        └── trips/[id]/
```

### 3. 主要ファイルの設定

#### `i18n/config.ts`
```typescript
export type Locale = 'ja' | 'en';
export const locales: Locale[] = ['ja', 'en'];
export const defaultLocale: Locale = 'ja';
```

#### `i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default getRequestConfig(async ({ locale }) => {
  const locales = ['ja', 'en'];
  if (!locales.includes(locale as string)) {
    notFound();
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

#### `middleware.ts`
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // または 'as-needed'
  localeDetection: true
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)',]
};
```

#### `next.config.mjs`
```javascript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  // ... 既存の設定
}

export default withNextIntl(nextConfig);
```

#### `app/[locale]/layout.tsx`
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### `app/[locale]/page.tsx`
```typescript
"use client"

import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('landing.hero.title')}</h1>
      {/* ... */}
    </div>
  );
}
```

### 4. 翻訳ファイルの作成

#### `messages/ja.json`
```json
{
  "common": {
    "login": "ログイン",
    "register": "旅をはじめる",
    // ...
  },
  "landing": {
    "hero": {
      "title": "あなたの旅の記録が、\n誰かの次の旅になる。",
      // ...
    }
  }
}
```

#### `messages/en.json`
```json
{
  "common": {
    "login": "Login",
    "register": "Start Your Journey",
    // ...
  },
  "landing": {
    "hero": {
      "title": "Your travel memories\nbecome someone's next journey.",
      // ...
    }
  }
}
```

---

## 発生した問題と対処

### エラー1: `params.locale is a Promise`

**エラー内容:**
```
Error: Route "/[locale]" used params.locale. 
params is a Promise and must be unwrapped with await
```

**原因:**
Next.js 15+では、dynamic route parametersが`Promise`として扱われる

**修正:**
```typescript
// Before
export default async function LocaleLayout({
  params: { locale }
}: ...) {

// After
export default async function LocaleLayout({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
```

### エラー2: `Cannot find module '../messages/undefined.json'`

**エラー内容:**
```
Error: Cannot find module '../messages/undefined.json'
```

**原因:**
`getMessages()`に`locale`パラメータが渡されていなかった

**修正:**
```typescript
// Before
const messages = await getMessages();

// After
const messages = await getMessages({ locale });
```

### エラー3: `No locale was returned from 'getRequestConfig'`

**エラー内容:**
```
Runtime Error: No locale was returned from 'getRequestConfig'
```

**原因:**
`i18n/request.ts`の設定が不完全

**修正:**
`notFound()`とロケール検証を追加

### エラー4: `Export createSharedPathnamesNavigation doesn't exist`

**エラー内容:**
```
Export createSharedPathnamesNavigation doesn't exist in target module
```

**原因:**
`next-intl` v4.8.2のAPIが古い、または使用方法が間違っている

**対処:**
`i18n/routing.ts`を削除し、`middleware.ts`で直接設定

### エラー5: 持続的な404エラー

**症状:**
- ブラウザで`http://localhost:3000/`にアクセス → 404
- ブラウザで`http://localhost:3000/ja`にアクセス → 404
- サーバーログ: `GET /ja 404 in XXXms`
- コンパイルは成功 (`✓ Compiled in XXXms`)

**試した対処法:**

1. **`localePrefix`の変更**
   - `'as-needed'` → `'always'`
   - `'always'` → `'as-needed'`
   - 結果: 変化なし

2. **`middleware.ts`のmatcherを調整**
   ```typescript
   // 試したパターン
   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
   matcher: ['/((?!api|_next|.*\\..*).*)',]
   ```
   - 結果: 変化なし

3. **`generateStaticParams`の追加・削除**
   ```typescript
   export async function generateStaticParams() {
     return locales.map((locale) => ({ locale }));
   }
   ```
   - 結果: 変化なし

4. **`dynamic = 'force-dynamic'`の設定**
   ```typescript
   export const dynamic = 'force-dynamic';
   ```
   - 結果: 変化なし

5. **完全な再起動（複数回実施）**
   - Node.jsプロセスの強制終了
   - `.next`ディレクトリの削除
   - `npm install`の再実行
   - 開発サーバーの再起動
   - ブラウザのハードリフレッシュ（Ctrl+Shift+R）
   - 結果: すべて変化なし

6. **シンプルなテストページの作成**
   ```typescript
   export default function TestPage() {
     return <div>Test Page - Routing Works!</div>;
   }
   ```
   - `app/[locale]/page.tsx`を最小限のコードに置き換え
   - 結果: 404は継続

7. **`app/page.tsx`でのリダイレクト追加**
   ```typescript
   import { redirect } from 'next/navigation';
   
   export default function RootPage() {
     redirect('/ja');
   }
   ```
   - `GET / 200`が一度出たが、リダイレクト先の`/ja`が404

8. **メッセージの読み込み方法の変更**
   ```typescript
   // getMessages()を使わず直接import
   const messages = (await import(`../../messages/${locale}.json`)).default;
   ```
   - 結果: 変化なし

**サーバーログの分析:**
```
✓ Starting...
⚠ The "middleware" file convention is deprecated. 
  Please use "proxy" instead.
✓ Ready in 9.7s
○ Compiling /[locale] ...
GET /ja 404 in 3.5s (compile: 2.7s, proxy.ts: 20ms, 
                      generate-params: 1559ms, render: 800ms)
✓ Compiled in 8.6s
GET /ja 404 in 1208ms (compile: 679ms, proxy.ts: 51ms, 
                       generate-params: 22ms, render: 479ms)
```

- `Compiling /[locale]`は成功
- `generate-params`が実行されている（1559ms, 22msなど）
- レンダリングも実行されている（800ms, 479msなど）
- しかし最終的に404が返される

### エラー6: PowerShellのパスエンコーディング問題

**症状:**
```
Set-Location : パス 'C:\Users\twask\OneDrive\チEクトップ\DMZ-UPLOGUE' が
存在しないため見つかりません。
```

**原因:**
日本語を含むパス（"デスクトップ"）がPowerShellで正しくエンコードされない

**影響:**
- `cd`コマンドが常に失敗
- しかし、`npm install`や`git`コマンドは動作する場合がある
- ターミナルでの操作が不安定

**対処:**
パスの問題はあるが、実際には多くのコマンドが相対パスや既存のワーキングディレクトリで動作していた

---

## キャッシュ問題への対処

### 試みた方法

1. **開発サーバーの完全再起動**
   ```bash
   Get-Process -Name node | Stop-Process -Force
   npm run dev
   ```

2. **`.next`キャッシュの削除**
   ```bash
   Remove-Item -Path ".next" -Recurse -Force
   ```

3. **ブラウザキャッシュのクリア**
   - ハードリフレッシュ（Ctrl+Shift+R / Ctrl+F5）
   - キャッシュとCookieの完全削除

4. **`node_modules`の再インストール**
   ```bash
   Remove-Item -Path "node_modules" -Recurse -Force
   npm install
   ```

すべて試したが、404エラーは解消されなかった。

---

## 根本原因の分析

### 最も可能性の高い原因

**Next.js 16 (Turbopack) と `next-intl` v4.8.2 の互換性問題**

#### 証拠:

1. **Next.js 16はTurbopackをデフォルトで使用**
   - `package.json`: `"dev": "next dev --turbo"`
   - サーバーログ: `▲ Next.js 16.1.6 (Turbopack)`

2. **middleware.tsの非推奨警告**
   ```
   ⚠ The "middleware" file convention is deprecated. 
     Please use "proxy" instead.
   ```
   - Next.js 16では`middleware.ts`から`proxy.ts`への移行が推奨されている
   - しかし`next-intl`はまだ`middleware.ts`を使用する設計

3. **動的ルートセグメント `[locale]` の認識問題**
   - ファイル自体は存在し、コンパイルも成功
   - しかしルーティング時に正しくマッチしない
   - `generate-params`は実行されているが、実際のページにルーティングされない

4. **Next.js 16のリリース時期**
   - Next.js 16は比較的新しいバージョン（2025年末リリース）
   - `next-intl` v4.8.2はそれより前にリリースされており、完全な対応が不十分な可能性

5. **Windowsファイルシステムの角括弧問題（可能性は低い）**
   - `[locale]`のような角括弧を含むフォルダ名の扱い
   - ただし、他の`[id]`などは動作していたため、これが主原因ではない

### 他に試せなかったこと

1. **Turbopackの無効化**
   - `package.json`の`"dev": "next dev"`に変更
   - Next.js 16の従来のビルドシステムを使用

2. **Next.js 15へのダウングレード**
   - `next-intl`との互換性が確認されているバージョン

3. **`next-intl`の最新版へのアップデート**
   - v4.8.2より新しいバージョンで修正されている可能性

4. **App Routerの代わりにPages Routerを使用**
   - ただし、アプリ全体の構造変更が必要

---

## 実装後の状態（ロールバック前）

### ファイル変更
- **変更されたファイル**: 6個
  - `app/layout.tsx`（削除 or 最小化）
  - `app/page.tsx`（リダイレクト用に変更）
  - `app/upload/page.tsx`（一部翻訳対応）
  - `next.config.mjs`（next-intlプラグイン追加）
  - `package.json`（next-intl依存追加）
  - `package-lock.json`（自動更新）

- **新規追加されたファイル/フォルダ**:
  - `i18n/` ディレクトリ（2ファイル）
  - `messages/` ディレクトリ（2ファイル）
  - `types/` ディレクトリ（1ファイル）
  - `components/language-switcher.tsx`
  - `middleware.ts`
  - `app/[locale]/` ディレクトリ（全ページコピー）
  - `I18N_README.md`

### 依存パッケージ
- 追加: `next-intl@4.8.2` + 関連パッケージ約23個

---

## ロールバック手順

### 実施したコマンド

```bash
# 1. 開発サーバーの停止
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 変更されたファイルを元に戻す
git restore app/layout.tsx app/page.tsx app/upload/page.tsx 
git restore next.config.mjs package.json package-lock.json

# 3. 追加されたファイル・フォルダを削除
Remove-Item I18N_README.md
Remove-Item middleware.ts
Remove-Item components/language-switcher.tsx
Remove-Item -Recurse -Force app/[locale]
Remove-Item -Recurse -Force i18n
Remove-Item -Recurse -Force messages
Remove-Item -Recurse -Force types

# 4. 依存パッケージの再インストール（next-intl削除）
npm install
# 結果: removed 23 packages

# 5. 開発サーバーの再起動
npm run dev
# 結果: ✓ Ready in 4.8s
```

### ロールバック後の状態
- すべてのファイルが元の状態に戻った
- `next-intl`とその依存パッケージが削除された
- 開発サーバーが正常に起動（`http://localhost:3000`）
- アプリケーションは元の日本語専用の状態で動作

---

## 結論と今後の推奨事項

### 結論

**Next.js 16 (Turbopack) + `next-intl` v4.8.2の組み合わせでは、`[locale]`動的ルートセグメントが正しく機能しない。**

- 設定は正しく、ファイル構造も適切
- コンパイルは成功するが、実際のルーティングが動作しない
- これはNext.js 16の新機能（Turbopack、middleware→proxyの移行）と`next-intl`の互換性問題と推測される

### 今後の選択肢

#### オプション1: Turbopackを無効化 ⭐ 推奨
**手順:**
```json
// package.json
{
  "scripts": {
    "dev": "next dev",  // --turboを削除
    "build": "next build",
    "start": "next start"
  }
}
```

**メリット:**
- Next.js 16を使い続けられる
- `next-intl`との互換性が向上する可能性が高い
- 最小限の変更で済む

**デメリット:**
- Turbopackの高速ビルドの恩恵を受けられない
- 開発サーバーの起動が少し遅くなる可能性

#### オプション2: Next.js 15にダウングレード
**手順:**
```bash
npm install next@15 react@19 react-dom@19
npm install next-intl
```

**メリット:**
- `next-intl`との互換性が確認されている
- より安定した環境

**デメリット:**
- Next.js 16の新機能が使えない
- 後でアップグレードする必要がある

#### オプション3: 代替ライブラリの使用
**候補: `react-i18next`**

**メリット:**
- クライアントサイドのみのシンプルな実装
- Next.jsのバージョンに依存しない
- 豊富なドキュメントとコミュニティ

**デメリット:**
- SSR/SSGでのSEO最適化が限定的
- URLベースのロケール切り替えが複雑

#### オプション4: Next.js 16のアップデートを待つ
**待機内容:**
- Next.js 16.2+でのmiddleware問題の修正
- `next-intl`の次期バージョン（v5.x）でのNext.js 16対応

**メリット:**
- 将来的に最も安定した実装が可能

**デメリット:**
- いつ解決されるか不明
- すぐに実装できない

---

## 学んだこと

1. **Next.jsの最新バージョンは注意が必要**
   - エッジケースでライブラリとの互換性問題が発生しやすい
   - 安定版（1-2バージョン前）の使用が推奨される

2. **Turbopackはまだ発展途上**
   - 高速だが、一部のミドルウェアやルーティングで問題が発生する可能性
   - プロダクション環境では慎重に検討すべき

3. **動的ルートセグメントのデバッグは難しい**
   - コンパイルが成功しても、ルーティングが動作しないケースがある
   - ログだけでは原因特定が困難

4. **徹底的なキャッシュクリアが必要**
   - `.next`、ブラウザキャッシュ、Node.jsプロセスの完全クリア
   - ただし、今回はキャッシュ問題ではなかった

5. **ロールバック戦略の重要性**
   - Gitでの変更管理が重要
   - 実装前にブランチを切るべきだった

---

## 参考リンク

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [next-intl Documentation](https://next-intl.dev/)
- [Next.js App Router with i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Next.js Middleware → Proxy Migration Guide](https://nextjs.org/docs/messages/middleware-to-proxy)

---

## タイムライン

| 時刻 | アクション | 結果 |
|-----|----------|------|
| 開始 | `npm install next-intl` | 成功 |
| +10分 | ファイル構造作成、設定ファイル作成 | 完了 |
| +20分 | 翻訳ファイル作成（ja.json, en.json） | 完了 |
| +30分 | `app/[locale]`フォルダ作成、ページ移動 | 完了 |
| +40分 | 初回起動 → 404エラー | エラー発生 |
| +50分 | `params.locale is a Promise`エラー修正 | エラー解消 |
| +60分 | `undefined.json`エラー修正 | エラー解消 |
| +70分 | 404エラー継続、`localePrefix`変更 | 変化なし |
| +80分 | 完全再起動（1回目） | 変化なし |
| +90分 | `generateStaticParams`追加・削除 | 変化なし |
| +100分 | 完全再起動（2回目） | 変化なし |
| +110分 | テストページ作成 | 404継続 |
| +120分 | 完全再起動（3回目） | 変化なし |
| +130分 | ロールバック決定 | - |
| +140分 | Git restore、ファイル削除 | 成功 |
| +145分 | `npm install`、サーバー起動 | 正常動作 |

**総実施時間: 約2時間30分**

---

## 添付ファイル

- スクリーンショット: ブラウザの404エラー画面
- サーバーログ: `terminals/723654.txt`など
- 削除されたファイル: Gitで管理されていない新規ファイル
