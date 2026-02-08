"use client"

import dynamic from "next/dynamic"
import type { Spot } from "@/lib/mock-data"
import type { MapPin } from "@/components/mapbox-map"

const MapboxMap = dynamic(
  () => import("@/components/mapbox-map").then((mod) => mod.MapboxMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        地図を読み込み中...
      </div>
    ),
  }
)

export function TripMap({
  spots,
  activeSpotId,
  onSpotClick,
}: {
  spots: Spot[]
  activeSpotId: string | null
  onSpotClick: (spotId: string) => void
}) {
  const pins: MapPin[] = spots.map((spot) => ({
    id: spot.id,
    lng: spot.lng,
    lat: spot.lat,
    title: spot.name,
    subtitle: spot.address,
    color: activeSpotId === spot.id ? "#C6922C" : "#2E3A59",
    arrivalTime: spot.arrivalTime,
    departureTime: spot.departureTime,
  }))

  const center: [number, number] =
    spots.length > 0
      ? [spots[0].lng, spots[0].lat]
      : [139.6917, 35.6895]

  return (
    <div className="h-full w-full" style={{ minHeight: 300 }}>
      <MapboxMap
        pins={pins}
        onPinClick={(pin) => onSpotClick(pin.id)}
        className="h-full w-full"
        useGeolocation={false}
        fallbackCenter={center}
        initialZoom={13}
        showRoute
        routeColor="#C6922C"
      />
    </div>
  )
}
