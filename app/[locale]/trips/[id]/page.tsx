"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  Share2,
  Calendar,
  MapPin,
  Camera,
  Map,
  List,
} from "lucide-react"
import { Timeline } from "@/components/trip/timeline"
import { TripMap } from "@/components/trip/trip-map"
import { ShareDialog } from "@/components/trip/share-dialog"
import { TitleWizard } from "@/components/trip/title-wizard"
import { mockTrips } from "@/lib/mock-data"
import { getTrip } from "@/lib/trip-storage"
import type { Trip } from "@/lib/mock-data"
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from "@/components/language-switcher"

function formatDateRange(start: string, end: string, locale: string) {
  const s = new Date(start)
  const e = new Date(end)
  const startStr = s.toLocaleDateString(locale === 'ja' ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
  })
  if (start === end) return startStr
  const endStr = e.toLocaleDateString(locale === 'ja' ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
  })
  return `${startStr} - ${endStr}`
}

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = use(params)
  const pathname = usePathname()
  const locale = pathname.split('/')[1]
  const t = useTranslations('trip')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [view, setView] = useState<"timeline" | "map">("timeline")

  // 旅行記録を読み込む(ストレージまたはモックデータから)
  useEffect(() => {
    (async () => {
      const storedTrip = await getTrip(id)
      const tripData = storedTrip || mockTrips.find((t) => t.id === id) || null
      
      setTrip(tripData)
      
      if (tripData?.spots?.length) {
        setActiveSpotId(tripData.spots[0].id)
      } else {
        setActiveSpotId(null)
      }
    })()
  }, [id])

  if (!trip) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Cover image + header overlay */}
      <div className="relative">
        <div className="relative h-52">
          <Image
            src={trip.coverImage || "/placeholder.svg"}
            alt={trip.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-transparent to-primary/70" />
        </div>

        {/* Overlay top bar */}
        <div className="absolute left-0 right-0 top-0 safe-top">
          <div className="flex h-11 items-center justify-between px-3">
            <Link
              href={`/${locale}/mylogue`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/20 text-primary-foreground backdrop-blur-sm active:bg-foreground/30"
              aria-label={t('back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher 
                locale={locale}
                className="text-xs font-medium tracking-wide text-primary-foreground/80"
              />
              <button
                onClick={() => setShareOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/20 text-primary-foreground backdrop-blur-sm active:bg-foreground/30"
                aria-label={t('share')}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Trip info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="text-lg font-bold text-primary-foreground drop-shadow-md">
            {trip.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/80">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(trip.startDate, trip.endDate, locale)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {trip.location}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {trip.photoCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="flex px-4">
          {[
            { key: "timeline" as const, icon: List, label: t('timeline') },
            { key: "map" as const, icon: Map, label: t('map') },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                view === tab.key
                  ? "border-b-2 border-gold text-gold"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">
        {trip.spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {t('noSpots')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('noSpotsSubtitle')}
            </p>
            <Link
              href={`/${locale}/mylogue`}
              className="mt-5 text-sm font-medium text-gold active:underline"
            >
              {t('backToTrips')}
            </Link>
          </div>
        ) : (
          <>
            {view === "timeline" && (
              <div className="px-4 py-5 pb-8">
                {/* タイトルウィザード（タグがある場合のみ表示） */}
                {trip.tags?.length && trip.tags.length >= 5 && (
                  <TitleWizard 
                    trip={trip} 
                    onUpdated={(updatedTrip) => setTrip(updatedTrip)} 
                  />
                )}
                
                <Timeline
                  spots={trip.spots}
                  activeSpotId={activeSpotId}
                  onSpotClick={setActiveSpotId}
                />
              </div>
            )}

            {view === "map" && (
              <div className="h-[calc(100dvh-16rem)]">
                <TripMap
                  spots={trip.spots}
                  activeSpotId={activeSpotId}
                  onSpotClick={setActiveSpotId}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Share dialog (bottom sheet) */}
      <ShareDialog
        tripTitle={trip.title}
        tripId={trip.id}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
