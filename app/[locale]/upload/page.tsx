"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslations } from 'next-intl'
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
  PencilLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { extractExifSimple, extractExifFromImage, type ExifData } from "@/lib/exif-utils"
import type { Trip } from "@/lib/mock-data"
import type { UplogueTag } from "@/lib/uplogue-lexicon"
import type { TitleSuggestion } from "@/lib/title-generator"

interface MemoryPhoto {
  id: string
  file: File
  preview: string
  hasGps: boolean
  timestamp: Date
  exif: ExifData // ✅ EXIF情報を保持
}

type FlowStep = "import" | "detecting" | "review" | "generating" | "tags" | "title" | "done"

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
  morning: { icon: Sun },
  afternoon: { icon: Sunset },
  night: { icon: Moon },
} as const

export default function UploadPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'
  const t = useTranslations('upload')
  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [step, setStep] = useState<FlowStep>("import")
  const [progress, setProgress] = useState(0)
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  
  // タイトル生成フロー用のstate
  const [uplogueTags, setUplogueTags] = useState<UplogueTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string>("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)

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
      location: gpsCount > 0 ? t('review.location') : t('review.locationUnknown'),
      locationConfidence: gpsCount > 0 ? t('review.locationConfidence') : t('review.locationNone'),
      photoCount: photos.length,
      gpsCount,
    }
  }, [photos, t])

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
          throw new Error(t('errors.noFiles'))
        }
        
        // HEICファイルの警告
        const heicFiles = fileArray.filter(f => 
          f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.heif')
        )
        if (heicFiles.length > 0) {
          console.warn(`⚠ ${heicFiles.length} HEIC files detected. GPS extraction may be limited.`)
        }
        
        const newPhotos: MemoryPhoto[] = []
        let heicWarningShown = false

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
              
              // HEIC形式でGPS情報がない場合の警告
              if (!heicWarningShown && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
                heicWarningShown = true
              }
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
        
        // HEIC形式の警告メッセージを設定
        if (heicWarningShown) {
          const gpsCount = newPhotos.filter(p => p.hasGps).length
          if (gpsCount === 0) {
            setError(t('errors.heicGps'))
          }
        }
        
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
        const errorMessage = err instanceof Error ? err.message : t('errors.loadFailed')
        setError(errorMessage)
        setStep("import")
      }
    },
    [t]
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
      // ✅ 写真を圧縮してからFormDataを作成
      console.log('Compressing images before upload...')
      const formData = new FormData()
      
      // ✅ EXIF情報を配列にまとめる（圧縮で失われるため）
      const exifDataArray: ExifData[] = []
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        console.log(`Compressing ${i + 1}/${photos.length}: ${photo.file.name} (${(photo.file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        const compressedFile = await compressImage(photo.file)
        console.log(`  → Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        console.log(`  → EXIF: lat=${photo.exif.latitude}, lng=${photo.exif.longitude}`)
        
        formData.append("photos", compressedFile)
        formData.append("photoIds", photo.id)
        exifDataArray.push(photo.exif)
      }
      
      // ✅ EXIF情報をJSON化して送信
      formData.append("exifData", JSON.stringify(exifDataArray))
      
      // ✅ ロケール情報を送信
      formData.append("locale", locale)
      
      console.log('All images compressed successfully')

      // 進捗シミュレーション
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 200)

      console.log('Starting trip generation API call...')
      const startTime = Date.now()

      // APIリクエスト（タイムアウト90秒）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('API call timeout after 90 seconds')
        controller.abort()
      }, 90000)

      try {
        const response = await fetch("/api/trips/generate", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        clearInterval(progressInterval)
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`API call completed in ${duration}s`)

        // ✅ エラー時の詳細を表示
        if (!response.ok) {
          const text = await response.text()
          console.error("Generate API error:", response.status, text)
          try {
            const j = JSON.parse(text)
            throw new Error(j.error || t('errors.generateFailed'))
          } catch {
            throw new Error(text || t('errors.generateFailed'))
          }
        }

        const result = await response.json()
        
        console.log('Trip generation result:', result)
        
        // ✅ クライアント側で photoId → preview(URL) に解決する
        const previewMap = new Map(photos.map(p => [p.id, p.preview]))

        // spots の photos が photoId 配列になってる前提
        const tripWithUrls = {
          ...result.trip,
          coverImage: "", // ✅ 先に初期化
          spots: result.trip.spots.map((s: any) => {
            const urls = (s.photos ?? []).map((id: string) => previewMap.get(id)).filter(Boolean)
            return {
              ...s,
              photos: urls,
              representativePhoto: urls[0] ?? "",
            }
          }),
        }
        
        // ✅ coverImageを最初のスポットの代表写真に設定
        tripWithUrls.coverImage = tripWithUrls.spots[0]?.representativePhoto ?? ""
        
        // 生成された旅行記録を一時保存
        setGeneratedTrip(tripWithUrls)
        setWarnings(result.warnings || [])
        setProgress(100)

        // Uplogueタグを取得
        console.log('Received Uplogue tags:', result.tags)
        setUplogueTags(result.tags || [])

        await new Promise((r) => setTimeout(r, 500))
        
        // タグがある場合はタグ選択画面へ（ウィザードフロー）
        if (result.tags && result.tags.length >= 5) {
          setStep("tags")
        } else {
          // タグが不足している場合は旅行記録を保存して完了画面へ
          const { saveTrip } = await import("@/lib/trip-storage")
          saveTrip(tripWithUrls)
          setStep("done")
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        clearInterval(progressInterval)
        
        if (fetchError.name === 'AbortError') {
          throw new Error(t('errors.timeout'))
        }
        throw fetchError
      }
    } catch (err) {
      console.error("Trip generation error:", err)
      setError(err instanceof Error ? err.message : t('errors.generateFailed'))
      setStep("review")
      setProgress(0)
    }
  }

  const formatDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`

  // タグ選択のハンドラ（IDベース）
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((t) => t !== tagId)
      } else if (prev.length < 3) {
        return [...prev, tagId]
      }
      return prev
    })
  }

  // タイトル生成のハンドラ（ローカル生成）
  const handleGenerateTitle = async () => {
    if (selectedTagIds.length !== 3) {
      setError(t('errors.selectThreeTags'))
      return
    }

    setError(null)
    setProgress(0)

    try {
      // 選択されたタグを取得
      const selectedTags = uplogueTags.filter((tag) => selectedTagIds.includes(tag.id))
      console.log('Generating titles from selected tags:', selectedTags)

      // ローカルでタイトル生成（テンプレートベース）
      const { generateTitleSuggestions } = await import("@/lib/title-generator")
      const suggestions = generateTitleSuggestions(selectedTags, locale)
      
      console.log('Generated title suggestions:', suggestions)

      setTitleSuggestions(suggestions)
      setSelectedTitle(suggestions[0]?.title || "")
      setProgress(100)

      await new Promise((r) => setTimeout(r, 300))
      setStep("title")
    } catch (err) {
      console.error("Title generation error:", err)
      setError(err instanceof Error ? err.message : t('errors.titleGenerateFailed'))
      setProgress(0)
    }
  }

  // タイトル確定のハンドラ
  const handleConfirmTitle = async () => {
    if (!generatedTrip) return

    // タイトルを更新（選択されたタグIDも保存）
    const updatedTrip = {
      ...generatedTrip,
      title: selectedTitle || generatedTrip.title,
      // @ts-ignore: optional field
      selectedTagIds: selectedTagIds,
      // @ts-ignore: タイトル確定済みフラグ
      titleConfirmed: true,
    }

    // localStorageに保存
    const { saveTrip } = await import("@/lib/trip-storage")
    saveTrip(updatedTrip)

    setGeneratedTrip(updatedTrip)
    setStep("done")
  }

  // タグ選択をスキップして完了画面へ
  const handleSkipTagSelection = async () => {
    if (!generatedTrip) return

    // タグ選択をスキップしてそのまま保存（タイトル未確定として保存）
    const updatedTrip = {
      ...generatedTrip,
      // @ts-ignore: タイトル未確定フラグ
      titleConfirmed: false,
    }
    
    const { saveTrip } = await import("@/lib/trip-storage")
    saveTrip(updatedTrip)

    setStep("done")
  }

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
              {t('import.title')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {t('import.subtitle')}
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
                {t('import.selectButton')}
              </div>
            </label>

            <p className="mt-4 text-xs text-muted-foreground">
              {t('import.hint')}
            </p>
            
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {t('import.heicWarning')}
              </p>
            </div>
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
              {t('detecting.title')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('detecting.subtitle', { count: photos.length })}
            </p>
            {photos.length === 0 && (
              <p className="mt-2 text-xs text-orange-500">
                {t('detecting.loading')}
              </p>
            )}
            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gold" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t('detecting.wait')}
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
              {t('generating.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('generating.subtitle')}
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
                { label: t('generating.steps.arrange'), done: progress > 30 },
                { label: t('generating.steps.identify'), done: progress > 60 },
                { label: t('generating.steps.compose'), done: progress > 90 },
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

  /* ─── Step: Tags (タグ選択) ─── */
  if (step === "tags") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" showBack />

        <main className="flex flex-1 flex-col px-6 pt-8">
          <div className="flex flex-col">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>

            <h2 className="text-xl font-bold text-foreground">
              {t('tags.title')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('tags.subtitle')}
            </p>

            {/* Reality Anchor */}
            {generatedTrip && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  {generatedTrip.location} / {new Date(generatedTrip.startDate).getFullYear()}年
                  {new Date(generatedTrip.startDate).getMonth() + 1}月
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* タグリスト */}
            <div className="mt-6 flex flex-col gap-3">
              {uplogueTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id)
                
                // カテゴリーバッジの色
                // カテゴリーラベル
              const categoryLabel = {
                place: "場所",
                season: "季節",
                time: "時間",
                motion: "歩き方",
                mood: "空気感",
              }[tag.category]

              // カテゴリーバッジの色
              const categoryColor = {
                place: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                season: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                time: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                motion: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                mood: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
              }[tag.category]

                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all
                      ${
                        isSelected
                          ? "border-gold bg-gold/10"
                          : "border-border bg-card hover:border-gold/50"
                      }
                    `}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-foreground">
                          {tag.label}
                        </p>
                        {tag.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tag.reason}
                          </p>
                        )}
                      </div>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                        isSelected 
                          ? "border-gold bg-gold" 
                          : "border-border bg-background"
                      }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 選択数表示 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('tags.selectedCount', { count: selectedTagIds.length })}
              </p>
            </div>
          </div>
        </main>

        {/* タイトル生成ボタン */}
        <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4">
          <Button
            onClick={handleGenerateTitle}
            disabled={selectedTagIds.length !== 3}
            className="h-13 w-full rounded-2xl bg-gold text-base font-semibold text-primary hover:bg-gold/90 disabled:opacity-50"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {t('tags.generateButton')}
          </Button>
          <button
            onClick={handleSkipTagSelection}
            className="mt-3 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('tags.skipButton')}
          </button>
        </div>
      </div>
    )
  }

  /* ─── Step: Title (タイトル選択・編集) ─── */
  if (step === "title") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <MobileTopBar title="" showBack />

        <main className="flex flex-1 flex-col px-6 pt-8">
          {titleSuggestions.length > 0 ? (
            <div className="flex flex-col">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <CheckCircle2 className="h-6 w-6 text-gold" />
              </div>

              <h2 className="text-xl font-bold text-foreground">
                {t('title.title')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('title.subtitle')}
              </p>

              {/* Reality Anchor */}
              {generatedTrip && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {generatedTrip.location} / {new Date(generatedTrip.startDate).getFullYear()}年
                    {new Date(generatedTrip.startDate).getMonth() + 1}月
                  </span>
                </div>
              )}

              {/* タイトル候補リスト */}
              <div className="mt-6 flex flex-col gap-3">
                {titleSuggestions.map((suggestion, index) => {
                  const isSelected = selectedTitle === suggestion.title
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedTitle(suggestion.title)
                        setIsEditingTitle(false)
                      }}
                      className={`
                        flex flex-col gap-1 rounded-xl border-2 px-4 py-4 text-left transition-all
                        ${
                          isSelected
                            ? "border-gold bg-gold/10"
                            : "border-border bg-card hover:border-gold/50"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-foreground">
                          {suggestion.title}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-gold" />
                        )}
                      </div>
                      {suggestion.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.subtitle}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* カスタム編集 */}
              <div className="mt-6 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <PencilLine className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">
                    {t('title.customLabel')}
                  </p>
                </div>
                <input
                  type="text"
                  value={isEditingTitle ? selectedTitle : ""}
                  onChange={(e) => {
                    setSelectedTitle(e.target.value)
                    setIsEditingTitle(true)
                  }}
                  onFocus={() => setIsEditingTitle(true)}
                  placeholder={t('title.customPlaceholder')}
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-gold"
                  maxLength={80}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t('title.customMaxLength')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              <p className="mt-4 text-sm text-muted-foreground">
                タイトルを生成中...
              </p>
              <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </main>

        {/* 確定ボタン */}
        {titleSuggestions.length > 0 && (
          <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <button
                onClick={() => setStep("tags")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t('title.backToTags')}
              </button>
            </div>
            <Button
              onClick={handleConfirmTitle}
              disabled={!selectedTitle}
              className="h-13 w-full rounded-2xl bg-gold text-base font-semibold text-primary hover:bg-gold/90 disabled:opacity-50"
            >
              このタイトルで保存
            </Button>
          </div>
        )}
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
              {t('done.title')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('done.subtitle', { 
                photoCount: photos.length, 
                spotCount: generatedTrip?.spotCount || 0 
              })}
            </p>

            {warnings.length > 0 && (
              <div className="mt-4 w-full rounded-lg border border-orange-200 bg-orange-50 p-3 text-left dark:border-orange-800 dark:bg-orange-950">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                      {t('done.warnings')}
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
              {t('done.viewButton')}
            </Button>
            <button
              onClick={() => router.push("/mylogue")}
              className="mt-3 text-sm font-medium text-muted-foreground active:text-foreground"
            >
              {t('done.backButton')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  /* ─── Step: Review (trip detected) ─── */
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <MobileTopBar title={t('title')} showBack />

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
                {t('review.tripDetected')}
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
                  <p className="text-xs text-muted-foreground">{t('review.period')}</p>
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
                      ` (${t('review.photoCount', { count: detectedTrip.gpsCount })})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('review.photoCount', { count: detectedTrip.photoCount })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('review.photos')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Microcopy */}
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          {t('review.description')}
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
                    {t(`review.${period}`)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {t('review.photoCount', { count: group.length })}
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
          {t('review.generateButton')}
        </Button>
      </div>

      <BottomTabBar />
    </div>
  )
}
