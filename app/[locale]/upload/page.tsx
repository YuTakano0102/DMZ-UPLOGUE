"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { extractExifSimple, extractExifFromImage } from "@/lib/exif-utils"
import type { Trip } from "@/lib/mock-data"

interface MemoryPhoto {
  id: string
  file: File
  preview: string
  hasGps: boolean
  timestamp: Date
}

type FlowStep = "import" | "detecting" | "review" | "generating" | "done"

/** Simulate time-of-day bucket */
function getTimeOfDay(date: Date): "morning" | "afternoon" | "night" {
  const h = date.getHours()
  if (h < 12) return "morning"
  if (h < 18) return "afternoon"
  return "night"
}

const timeLabels = {
  morning: { icon: Sun },
  afternoon: { icon: Sunset },
  night: { icon: Moon },
} as const

export default function UploadPage() {
  const router = useRouter()
  const t = useTranslations('upload')
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
      // FormDataを作成
      const formData = new FormData()
      photos.forEach((photo) => {
        formData.append("photos", photo.file)
        formData.append("photoIds", photo.id) // ✅ IDも一緒に送る
      })

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
        
        // 生成された旅行記録を保存(localStorageに保存)
        const { saveTrip } = await import("@/lib/trip-storage")
        saveTrip(tripWithUrls)
        
        setGeneratedTrip(tripWithUrls)
        setWarnings(result.warnings || [])
        setProgress(100)

        await new Promise((r) => setTimeout(r, 500))
        setStep("done")
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
