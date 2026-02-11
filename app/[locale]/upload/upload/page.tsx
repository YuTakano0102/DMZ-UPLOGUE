"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Camera,
  X,
  Loader2,
  CheckCircle2,
  MapPin,
  Calendar,
  ImageIcon,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { extractExifSimple, extractExifFromImage, type ExifData } from "@/lib/exif-utils"
import type { Trip } from "@/lib/mock-data"

interface MemoryPhoto {
  id: string
  file: File
  preview: string
  hasGps: boolean
  timestamp: Date
  exif: ExifData // ✅ EXIF情報を保持
}

type FlowStep = "import" | "detecting" | "review" | "generating" | "done"

/** Simulate time-of-day bucket */
function getTimeOfDay(date: Date): "morning" | "afternoon" | "night" {
  const h = date.getHours()
  if (h < 12) return "morning"
  if (h < 18) return "afternoon"
  return "night"
}

/**
 * 画像を圧縮してファイルサイズを削減
 * Vercelのペイロード制限対策
 */
async function compressImage(file: File, maxSize = 1600, quality = 0.72): Promise<File> {
  // HEICはブラウザがdecodeできないことがあるので、その場合はそのまま返す
  const isHeic = /\.(heic|heif)$/i.test(file.name)
  if (isHeic) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    )

    if (!blob) return file

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
  } catch (error) {
    console.error("Image compression failed:", error)
    return file // 圧縮失敗時は元ファイルを返す
  }
}

const timeLabels = {
  morning: { label: "朝", icon: Sun },
  afternoon: { label: "午後", icon: Sunset },
  night: { label: "夜", icon: Moon },
} as const

export default function UploadPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [step, setStep] = useState<FlowStep>("import")
  const [progress, setProgress] = useState(0)
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  // simulate a detected trip
  const detectedTrip = useMemo(() => {
    if (photos.length === 0) return null
    const sorted = [...photos].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
    const start = sorted[0].timestamp
    const end = sorted[sorted.length - 1].timestamp
    const gpsCount = photos.filter((p) => p.hasGps).length
    return {
      startDate: start,
      endDate: end,
      location: gpsCount > 0 ? "位置情報を検出" : "不明",
      locationConfidence: gpsCount > 0 ? "GPS検出済み" : "位置情報なし",
      photoCount: photos.length,
      gpsCount,
    }
  }, [photos])

  // group photos by time of day
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, MemoryPhoto[]> = {
      morning: [],
      afternoon: [],
      night: [],
    }
    for (const p of photos) {
      groups[getTimeOfDay(p.timestamp)].push(p)
    }
    return groups
  }, [photos])

  const handlePhotoSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        console.log("No files selected")
        return
      }
      
      // エラーをクリア
      setError(null)
      
      console.log("=== Starting photo selection ===")
      console.log("Files count:", files.length)
      
      // まずdetectingステップに移行
      setStep("detecting")
      
      // 少し待ってからEXIF抽出を開始（UIの更新を確実に反映）
      await new Promise((r) => setTimeout(r, 300))
      
      try {
        // 画像ファイルのフィルタリング（MIMEタイプまたは拡張子でチェック）
        const fileArray = Array.from(files).filter((f) => {
          const isImageMime = f.type.startsWith("image/")
          const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".tiff"]
          const hasImageExt = imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
          const isImage = isImageMime || hasImageExt
          
          console.log(`File: ${f.name}, Type: "${f.type}", IsImage: ${isImage}`)
          return isImage
        })
        
        console.log("Filtered image files:", fileArray.length)
        
        if (fileArray.length === 0) {
          throw new Error("画像ファイルが選択されていません。対応形式: JPG, PNG, HEIC等")
        }
        
        const newPhotos: MemoryPhoto[] = []

        // EXIF情報を抽出（exifr使用に切り替え）
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i]
          console.log(`[${i + 1}/${fileArray.length}] Processing: ${file.name} (${file.type || 'unknown type'})`)
          
          try {
            const exif = await extractExifFromImage(file)
            
            const photo: MemoryPhoto = {
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              file,
              preview: URL.createObjectURL(file),
              hasGps: exif.latitude !== null && exif.longitude !== null,
              timestamp: exif.timestamp || new Date(file.lastModified),
              exif, // ✅ EXIF情報を保存
            }
            
            newPhotos.push(photo)
            
            if (photo.hasGps) {
              console.log(`✓ Photo added with GPS: ${photo.id}`, {
                lat: exif.latitude,
                lng: exif.longitude,
                time: photo.timestamp.toISOString(),
              })
            } else {
              console.log(`⚠ Photo added without GPS: ${photo.id}, Time: ${photo.timestamp.toISOString()}`)
            }
          } catch (fileError) {
            console.error(`✗ Failed to process ${file.name}:`, fileError)
            // エラーがあっても続行（GPS情報なしで追加）
            const photo: MemoryPhoto = {
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              file,
              preview: URL.createObjectURL(file),
              hasGps: false,
              timestamp: new Date(file.lastModified),
              exif: { // ✅ 空のEXIF情報
                latitude: null,
                longitude: null,
                timestamp: null,
                fileName: file.name,
              },
            }
            newPhotos.push(photo)
          }
        }

        console.log("=== All photos processed ===")
        console.log("Total processed:", newPhotos.length)
        
        // 写真を状態に追加
        setPhotos((prev) => {
          const updated = [...prev, ...newPhotos]
          console.log("Photos state updated from", prev.length, "to", updated.length)
          return updated
        })

        // reviewing画面に遷移する前に少し待機
        console.log("Waiting before transition to review...")
        await new Promise((r) => setTimeout(r, 1500))
        
        console.log("=== Transitioning to review ===")
        setStep("review")
        
      } catch (err) {
        console.error("=== Photo selection error ===", err)
        const errorMessage = err instanceof Error ? err.message : "写真の読み込みに失敗しました"
        setError(errorMessage)
        setStep("import")
      }
    },
    []
  )

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.preview)
      return prev.filter((x) => x.id !== id)
    })
  }

  const handleGenerate = async () => {
    setStep("generating")
    setError(null)
    setWarnings([])

    try {
      // ===== STEP1: 写真を圧縮してSupabase Storageに直接アップロード =====
      console.log('📤 Uploading images directly to Supabase Storage...')
      
      const { supabase, STORAGE_BUCKETS } = await import("@/lib/supabase")
      
      const uploadedPhotos: Array<{
        id: string
        url: string
        exif: ExifData
      }> = []

      // 進捗シミュレーション
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 3, 85))
      }, 300)
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        console.log(`📸 [${i + 1}/${photos.length}] Compressing: ${photo.file.name} (${(photo.file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        // 圧縮
        const compressedFile = await compressImage(photo.file)
        console.log(`  → Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        
        // Supabase Storageに直接アップロード
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 9)
        const extension = compressedFile.name.split('.').pop() || 'jpg'
        const uniqueFileName = `${timestamp}-${randomStr}-${i}.${extension}`
        
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKETS.PHOTOS)
          .upload(uniqueFileName, compressedFile, {
            cacheControl: '31536000',
            upsert: false,
          })
        
        if (error) {
          console.error(`❌ Upload failed for ${photo.file.name}:`, error)
          throw new Error(`画像のアップロードに失敗しました: ${error.message}`)
        }
        
        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.PHOTOS)
          .getPublicUrl(data.path)
        
        uploadedPhotos.push({
          id: photo.id,
          url: urlData.publicUrl,
          exif: photo.exif,
        })
        
        console.log(`  ✓ Uploaded: ${urlData.publicUrl}`)
      }
      
      console.log(`✅ All ${uploadedPhotos.length} photos uploaded successfully`)

      // ===== STEP2: APIに画像URLだけを送信（軽量なJSONのみ） =====
      console.log('🚀 Sending photo URLs to API...')
      const startTime = Date.now()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('API call timeout after 90 seconds')
        controller.abort()
      }, 90000)

      try {
        const response = await fetch("/api/trips/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photos: uploadedPhotos,
            locale: 'ja',
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        clearInterval(progressInterval)
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`API call completed in ${duration}s`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "旅行記録の生成に失敗しました")
        }

        const result = await response.json()
        
        console.log('Trip generation result:', result)
        
        // 生成された旅行記録を保存(localStorageに保存)
        const { saveTrip } = await import("@/lib/trip-storage")
        saveTrip(result.trip)
        
        setGeneratedTrip(result.trip)
        setWarnings(result.warnings || [])
        setProgress(100)

        await new Promise((r) => setTimeout(r, 500))
        setStep("done")
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        clearInterval(progressInterval)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('処理に時間がかかりすぎました。写真の枚数を減らして再度お試しください。')
        }
        throw fetchError
      }
    } catch (err) {
      console.error("Trip generation error:", err)
      setError(err instanceof Error ? err.message : "旅行記録の生成に失敗しました")
      setStep("review")
      setProgress(0)
    }
  }

  const formatDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`

  /* ─── Step: Import (initial) ─── */
  if (step === "import") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" showBack />

        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
              <Camera className="h-9 w-9 text-gold" />
            </div>

            <h1 className="text-xl font-bold text-foreground">
              あなたの記憶を読み込む
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              カメラロールから写真を選ぶだけ。
              <br />
              Uplouge が旅の瞬間を自動で整理します。
            </p>

            <label className="mt-8 flex w-full cursor-pointer items-center justify-center">
              <input
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                onChange={(e) => handlePhotoSelect(e.target.files)}
                className="sr-only"
              />
              <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-gold font-semibold text-primary active:scale-[0.98] active:bg-gold/90">
                <Camera className="mr-2 h-5 w-5" />
                写真を選ぶ
              </div>
            </label>

            <p className="mt-4 text-xs text-muted-foreground">
              GPS情報付きの写真がおすすめです（JPG, PNG, HEIC対応）
            </p>
          </div>
        </main>

        <BottomTabBar />
      </div>
    )
  }

  /* ─── Step: Detecting ─── */
  if (step === "detecting") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" showBack />

        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <Sparkles className="h-7 w-7 animate-pulse text-gold" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              旅を検出しています...
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {photos.length} 枚の写真から時間と場所を分析中
            </p>
            {photos.length === 0 && (
              <p className="mt-2 text-xs text-orange-500">
                写真を読み込んでいます...
              </p>
            )}
            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gold" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              しばらくお待ちください
            </p>
          </div>
        </main>
      </div>
    )
  }

  /* ─── Step: Generating ─── */
  if (step === "generating") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" showBack />

        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex w-full flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <Loader2 className="h-7 w-7 animate-spin text-gold" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              旅の記録を生成中...
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              あの日の瞬間を、ひとつの物語に
            </p>

            <div className="mt-6 w-full">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
            </div>

            <div className="mt-6 flex w-full flex-col gap-2">
              {[
                { label: "時系列に整列", done: progress > 30 },
                { label: "スポットを特定", done: progress > 60 },
                { label: "旅の物語を構成", done: progress > 90 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 text-gold" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <span
                    className={
                      s.done
                        ? "text-sm font-medium text-foreground"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  /* ─── Step: Done ─── */
  if (step === "done") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" />

        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="flex w-full flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <CheckCircle2 className="h-8 w-8 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              旅の記録が完成しました
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {photos.length} 枚の写真から{generatedTrip?.spotCount || 0}つのスポットを検出
            </p>

            {warnings.length > 0 && (
              <div className="mt-4 w-full rounded-lg border border-orange-200 bg-orange-50 p-3 text-left dark:border-orange-800 dark:bg-orange-950">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                      注意事項
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-orange-700 dark:text-orange-300">
                      {warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                if (generatedTrip) {
                  router.push(`/trips/${generatedTrip.id}`)
                } else {
                  router.push("/mylogue")
                }
              }}
              className="mt-8 h-13 w-full rounded-2xl bg-gold text-base font-semibold text-primary hover:bg-gold/90"
            >
              タイムラインを見る
            </Button>
            <button
              onClick={() => router.push("/mylogue")}
              className="mt-3 text-sm font-medium text-muted-foreground active:text-foreground"
            >
              MyLogueに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  /* ─── Step: Review (trip detected) ─── */
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <MobileTopBar title="旅の記憶" showBack />

      <main className="flex-1 px-4 pt-4">
        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        {/* Detected trip card */}
        {detectedTrip && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                Trip Detected
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(detectedTrip.startDate)}
                    {detectedTrip.startDate.toDateString() !==
                      detectedTrip.endDate.toDateString() &&
                      ` - ${formatDate(detectedTrip.endDate)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">期間</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {detectedTrip.location}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {detectedTrip.locationConfidence}
                    {detectedTrip.gpsCount > 0 &&
                      ` (${detectedTrip.gpsCount}枚)`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {detectedTrip.photoCount} 枚
                  </p>
                  <p className="text-xs text-muted-foreground">写真</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Microcopy */}
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Uplogue が旅の瞬間を自動で整理します
        </p>

        {/* Photos grouped by time of day */}
        <div className="mt-5 flex flex-col gap-5">
          {(["morning", "afternoon", "night"] as const).map((period) => {
            const group = groupedPhotos[period]
            if (group.length === 0) return null
            const TimeIcon = timeLabels[period].icon

            return (
              <section key={period}>
                <div className="mb-2 flex items-center gap-2">
                  <TimeIcon className="h-4 w-4 text-gold" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {timeLabels[period].label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {group.length}枚
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {group.map((p) => (
                    <div
                      key={p.id}
                      className="relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border"
                    >
                      <Image
                        src={p.preview || "/placeholder.svg"}
                        alt="memory"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/60 text-background"
                        aria-label="削除"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {p.hasGps && (
                        <div className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-card">
                          <MapPin className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add more photos */}
                  <label className="flex aspect-square w-24 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border active:border-gold/50 active:bg-gold/5">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.heic,.heif"
                      onChange={(e) => handlePhotoSelect(e.target.files)}
                      className="sr-only"
                    />
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </label>
                </div>
              </section>
            )
          })}
        </div>
      </main>

      {/* Generate CTA - fixed bottom */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-3">
        <Button
          onClick={handleGenerate}
          disabled={photos.length === 0}
          className="h-13 w-full rounded-2xl bg-gold text-base font-semibold text-primary shadow-lg shadow-gold/20 hover:bg-gold/90 disabled:opacity-50"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          この旅を生成する
        </Button>
      </div>

      <BottomTabBar />
    </div>
  )
}
