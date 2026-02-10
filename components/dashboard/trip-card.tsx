'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, Camera, Calendar, Globe, Lock, Trash2 } from "lucide-react"
import type { Trip } from "@/lib/mock-data"

function formatDateRange(start: string, end: string, locale: string) {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const localeCode = locale === 'ja' ? "ja-JP" : "en-US"
  if (start === end) {
    return s.toLocaleDateString(localeCode, { ...opts, year: "numeric" })
  }
  return `${s.toLocaleDateString(localeCode, { ...opts, year: "numeric" })} - ${e.toLocaleDateString(localeCode, opts)}`
}

interface TripCardProps {
  trip: Trip
  onDelete?: (tripId: string) => void
  isDeletable?: boolean
}

export function TripCard({ trip, onDelete, isDeletable = false }: TripCardProps) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete) {
      onDelete(trip.id)
    }
  }
  
  return (
    <Link
      href={`/${locale}/trips/${trip.id}`}
      className="group relative flex gap-4 rounded-2xl border border-border bg-card p-3 active:bg-muted"
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
          title={trip.isPublic ? (locale === 'ja' ? "公開" : "Public") : (locale === 'ja' ? "非公開" : "Private")}
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
            {formatDateRange(trip.startDate, trip.endDate, locale)}
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

      {/* Delete button */}
      {isDeletable && onDelete && (
        <button
          onClick={handleDelete}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100 active:scale-95"
          aria-label="削除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </Link>
  )
}
