"use client"

'use client'

import { usePathname } from "next/navigation"
import { MapPin, Camera, Map } from "lucide-react"
import { TripCard } from "@/components/dashboard/trip-card"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { UplogueLogo } from "@/components/uplogue-logo"
import { mockTrips } from "@/lib/mock-data"
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from "@/components/language-switcher"

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'
  
  const totalTrips = mockTrips.length
  const totalPhotos = mockTrips.reduce((sum, t) => sum + t.photoCount, 0)
  const totalSpots = mockTrips.reduce((sum, t) => sum + t.spotCount, 0)

  const stats = [
    { icon: Map, value: totalTrips, label: t('trips') },
    { icon: MapPin, value: totalSpots, label: t('spots') },
    { icon: Camera, value: totalPhotos, label: t('photos') },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg safe-top">
        <div className="flex h-11 items-center justify-between px-4">
          <UplogueLogo size={22} showText={true} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="h-8 w-8 overflow-hidden rounded-full bg-primary/10">
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                T
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5">
        {/* Stats row */}
        <div className="flex gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-1 flex-col items-center rounded-xl border border-border bg-card px-2 py-3"
            >
              <stat.icon className="h-4 w-4 text-gold" />
              <span className="mt-1 text-lg font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Trip list */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t('yourTrips')}
          </h2>
          <div className="flex flex-col gap-3">
            {mockTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
