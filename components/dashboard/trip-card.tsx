import Image from "next/image"
import Link from "next/link"
import { MapPin, Camera, Calendar, Globe, Lock } from "lucide-react"
import type { Trip } from "@/lib/mock-data"

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  if (start === end) {
    return s.toLocaleDateString("ja-JP", { ...opts, year: "numeric" })
  }
  return `${s.toLocaleDateString("ja-JP", { ...opts, year: "numeric" })} - ${e.toLocaleDateString("ja-JP", opts)}`
}

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-3 active:bg-muted"
    >
      {/* Thumbnail */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={trip.coverImage || "/placeholder.svg"}
          alt={trip.title}
          fill
          className="object-cover"
        />
        <span
          className="absolute right-1 top-1 rounded-full bg-card/90 p-1"
          title={trip.isPublic ? "公開" : "非公開"}
        >
          {trip.isPublic ? (
            <Globe className="h-3 w-3 text-gold" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 overflow-hidden">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {trip.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {formatDateRange(trip.startDate, trip.endDate)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {trip.spotCount}
          </span>
          <span className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {trip.photoCount}
          </span>
          <span className="truncate">{trip.location}</span>
        </div>
      </div>
    </Link>
  )
}
