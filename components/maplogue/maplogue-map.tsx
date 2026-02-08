"use client"

import dynamic from "next/dynamic"
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

export function MapLogueMap({
  pins,
  onPinClick,
}: {
  pins: MapPin[]
  onPinClick: (pin: MapPin) => void
}) {
  return (
    <div className="h-full w-full" style={{ minHeight: "100dvh" }}>
      <MapboxMap
        pins={pins}
        onPinClick={onPinClick}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        useGeolocation
        fallbackCenter={[139.6917, 35.6895]}
        initialZoom={5}
        showPermanentLabels={true}
      />
    </div>
  )
}
