"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, Calendar, Camera, ChevronRight } from "lucide-react"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { MapLogueMap } from "@/components/maplogue/maplogue-map"
import type { MapPin } from "@/components/mapbox-map"
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from "@/components/language-switcher"
import { getAllTrips } from "@/lib/trip-storage"
import type { Trip } from "@/lib/mock-data"

interface MapSpot {
  id: string
  name: string
  location: string
  lat: number
  lng: number
  image: string
  author: string
  isOwn: boolean
  date: string
  photoCount: number
  tripId?: string
}

const mapSpots: MapSpot[] = [
  {
    id: "spot-kyoto",
    name: "京都・秋の古都巡り",
    location: "京都府",
    lat: 35.0116,
    lng: 135.7681,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
    author: "あなた",
    isOwn: true,
    date: "2025.11.15",
    photoCount: 87,
    tripId: "trip-kyoto-2025",
  },
  {
    id: "spot-okinawa",
    name: "沖縄・青い海と島時間",
    location: "沖縄県",
    lat: 26.2124,
    lng: 127.6809,
    image: "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=1200&q=80",
    author: "あなた",
    isOwn: true,
    date: "2025.08.10",
    photoCount: 124,
    tripId: "trip-okinawa-2025",
  },
  {
    id: "spot-hokkaido",
    name: "北海道・夏のラベンダー畑",
    location: "北海道",
    lat: 43.3841,
    lng: 142.3817,
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80",
    author: "あなた",
    isOwn: true,
    date: "2025.07.20",
    photoCount: 95,
    tripId: "trip-hokkaido-2025",
  },
  {
    id: "spot-tokyo",
    name: "東京・ネオンと下町散歩",
    location: "東京都",
    lat: 35.6762,
    lng: 139.6503,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
    author: "あなた",
    isOwn: true,
    date: "2025.06.01",
    photoCount: 52,
    tripId: "trip-tokyo-2025",
  },
  {
    id: "spot-kamakura",
    name: "鎌倉・古都の風を感じて",
    location: "神奈川県",
    lat: 35.3193,
    lng: 139.5466,
    image: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=80",
    author: "あなた",
    isOwn: true,
    date: "2025.05.15",
    photoCount: 34,
    tripId: "trip-kamakura-2025",
  },
  {
    id: "spot-other-1",
    name: "嵐山の朝霧",
    location: "京都府",
    lat: 35.0094,
    lng: 135.6697,
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
    author: "Yuki",
    isOwn: false,
    date: "2025.10.05",
    photoCount: 43,
  },
  {
    id: "spot-other-2",
    name: "伏見の千本鳥居",
    location: "京都府",
    lat: 34.9671,
    lng: 135.7727,
    image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
    author: "Hana",
    isOwn: false,
    date: "2025.09.12",
    photoCount: 28,
  },
]

export default function MapLoguePage() {
  const t = useTranslations('maplogue')
  const pathname = usePathname()
  const locale = pathname.split('/')[1]
  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null)
  const [userTrips, setUserTrips] = useState<Trip[]>([])

  // localStorageから旅行データを読み込む
  useEffect(() => {
    const trips = getAllTrips()
    setUserTrips(trips)
    console.log('Loaded user trips for MapLogue:', trips.length)
  }, [])

  // TripをMapSpotに変換
  const convertTripToMapSpot = (trip: Trip): MapSpot | null => {
    // 最初のスポットの座標を使用
    const firstSpot = trip.spots?.[0]
    if (!firstSpot) {
      console.warn('Trip has no spots:', trip.id)
      return null
    }

    return {
      id: trip.id,
      name: trip.title,
      location: trip.location,
      lat: firstSpot.lat,
      lng: firstSpot.lng,
      image: trip.coverImage,
      author: "あなた",
      isOwn: true,
      date: new Date(trip.startDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\//g, '.'),
      photoCount: trip.photoCount,
      tripId: trip.id,
    }
  }

  // ユーザーの旅行をMapSpotに変換
  const userMapSpots = userTrips
    .map(convertTripToMapSpot)
    .filter((spot): spot is MapSpot => spot !== null)

  // モックデータとユーザーデータを結合
  const allMapSpots = [...userMapSpots, ...mapSpots]

  const pins: MapPin[] = allMapSpots.map((spot) => ({
    id: spot.id,
    lng: spot.lng,
    lat: spot.lat,
    title: spot.name,
    subtitle: spot.location,
    color: spot.isOwn ? "#2E3A59" : "#999999",
    image: spot.image,
    showNumber: false,
  }))

  // Debug: log coordinates
  console.log('MapLogue pins:', pins.map(p => ({ title: p.title, lat: p.lat, lng: p.lng })))

  const handlePinClick = (pin: MapPin) => {
    const spot = allMapSpots.find((s) => s.id === pin.id)
    if (spot) {
      setSelectedSpot(selectedSpot?.id === pin.id ? null : spot)
    }
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Map header */}
      <header className="absolute left-0 right-0 top-0 z-20 safe-top">
        <div className="flex h-11 items-center justify-between px-4">
          <h1 className="text-base font-semibold text-foreground drop-shadow-sm">
            MapLogue
          </h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              {allMapSpots.filter((s) => s.isOwn).length} trips /{" "}
              {allMapSpots.filter((s) => !s.isOwn).length} others
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen Mapbox map with geolocation */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <MapLogueMap pins={pins} onPinClick={handlePinClick} />
      </div>

      {/* Selected spot bottom sheet */}
      {selectedSpot && (
        <div className="fixed bottom-20 left-0 right-0 z-20 px-4 pb-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute right-6 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10"
              aria-label="閉じる"
            >
              <X className="h-3.5 w-3.5 text-foreground" />
            </button>

            <div className="flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                <Image
                  src={selectedSpot.image || "/placeholder.svg"}
                  alt={selectedSpot.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden pr-6">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {selectedSpot.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    {selectedSpot.date}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Camera className="h-3 w-3" />
                    {selectedSpot.photoCount}
                  </span>
                </div>
                <span
                  className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    selectedSpot.isOwn
                      ? "bg-gold/10 text-gold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedSpot.author}
                </span>
              </div>
            </div>

            {selectedSpot.isOwn && selectedSpot.tripId && (
              <Link
                href={`/${locale}/trips/${selectedSpot.tripId}`}
                className="flex items-center justify-between border-t border-border px-4 py-2.5 active:bg-muted"
              >
                <span className="text-xs font-medium text-gold">
                  {locale === 'ja' ? 'この記録を開く' : 'Open this record'}
                </span>
                <ChevronRight className="h-4 w-4 text-gold" />
              </Link>
            )}
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  )
}
