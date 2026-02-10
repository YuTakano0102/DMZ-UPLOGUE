"use client"

import { useEffect, useState } from "react"
import { MapPin, Camera, BookOpen } from "lucide-react"
import { TripCard } from "@/components/dashboard/trip-card"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { mockTrips } from "@/lib/mock-data"
import { getAllTrips } from "@/lib/trip-storage"
import type { Trip } from "@/lib/mock-data"

export default function MyLoguePage() {
  const [trips, setTrips] = useState<Trip[]>([])

  // 保存された旅行記録とモックデータを結合
  useEffect(() => {
    const storedTrips = getAllTrips()
    const allTrips = [...storedTrips, ...mockTrips]
    
    // IDで重複を除去
    const uniqueTrips = allTrips.filter(
      (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
    )
    
    setTrips(uniqueTrips)
  }, [])

  const totalTrips = trips.length
  const totalPhotos = trips.reduce((sum, t) => sum + t.photoCount, 0)
  const totalSpots = trips.reduce((sum, t) => sum + t.spotCount, 0)

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <MobileTopBar title="MyLogue" />

      <main className="flex-1 px-4 pt-5">
        {/* Stats */}
        <div className="flex gap-3">
          {[
            { icon: BookOpen, value: totalTrips, label: "Trips" },
            { icon: MapPin, value: totalSpots, label: "Spots" },
            { icon: Camera, value: totalPhotos, label: "Photos" },
          ].map((stat) => (
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

        {/* Trip archive list */}
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your archive
          </h2>
          {trips.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                まだ旅行記録がありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                写真をアップロードして旅の記録を作りましょう
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
