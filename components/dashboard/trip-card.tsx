'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, Camera, Calendar, Globe, Lock } from "lucide-react"
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

export function TripCard({ trip }: { trip: Trip }) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'
  
  return (
    <Link
      href={`/${locale}/trips/${trip.id}`}
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
    </Link>
  )
}
