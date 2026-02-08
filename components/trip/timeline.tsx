"use client"

import Image from "next/image"
import { Clock, MapPin } from "lucide-react"
import type { Spot } from "@/lib/mock-data"

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function groupSpotsByDate(spots: Spot[]) {
  const groups: Record<string, Spot[]> = {}
  for (const spot of spots) {
    const dateKey = spot.arrivalTime.split("T")[0]
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(spot)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export function Timeline({
  spots,
  activeSpotId,
  onSpotClick,
}: {
  spots: Spot[]
  activeSpotId: string | null
  onSpotClick: (spotId: string) => void
}) {
  const grouped = groupSpotsByDate(spots)

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([dateKey, daySpots]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
              <Clock className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {formatDate(daySpots[0].arrivalTime)}
            </h3>
          </div>

          {/* Spots */}
          <div className="ml-3.5 flex flex-col gap-3 border-l-2 border-border pl-5">
            {daySpots.map((spot) => (
              <button
                type="button"
                key={spot.id}
                onClick={() => onSpotClick(spot.id)}
                className={`relative w-full text-left rounded-xl border p-3 transition-all active:scale-[0.98] ${
                  activeSpotId === spot.id
                    ? "border-gold bg-accent"
                    : "border-border bg-card"
                }`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[calc(1.25rem+5px)] top-5 h-2 w-2 rounded-full border-2 ${
                    activeSpotId === spot.id
                      ? "border-gold bg-gold"
                      : "border-primary bg-card"
                  }`}
                />

                <div className="flex gap-3">
                  {/* Photo */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={spot.representativePhoto || "/placeholder.svg"}
                      alt={spot.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h4 className="truncate text-sm font-semibold text-foreground">
                      {spot.name}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>
                        {formatTime(spot.arrivalTime)} -{" "}
                        {formatTime(spot.departureTime)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{spot.address}</span>
                    </div>
                    {/* Mini photo strip */}
                    <div className="mt-2 flex gap-1">
                      {spot.photos.slice(0, 3).map((photo, i) => (
                        <div
                          key={`${spot.id}-photo-${i}`}
                          className="relative h-7 w-7 overflow-hidden rounded"
                        >
                          <Image
                            src={photo || "/placeholder.svg"}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {spot.photos.length > 3 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          +{spot.photos.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
