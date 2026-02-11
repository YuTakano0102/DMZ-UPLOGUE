"use client"

import { useEffect, useState } from "react"
import { MapPin, Camera, BookOpen, X } from "lucide-react"
import { TripCard } from "@/components/dashboard/trip-card"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { mockTrips } from "@/lib/mock-data"
import { getAllTrips, deleteTrip } from "@/lib/trip-storage"
import type { Trip } from "@/lib/mock-data"
import { useTranslations } from 'next-intl'

export default function MyLoguePage() {
  const t = useTranslations('mylogue')
  const [trips, setTrips] = useState<Trip[]>([])
  const [userTripIds, setUserTripIds] = useState<Set<string>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 保存された旅行記録とモックデータを結合
  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      const storedTrips = await getAllTrips()
      // 配列保証
      const safeStoredTrips = Array.isArray(storedTrips) ? storedTrips : []
      const allTrips = [...safeStoredTrips, ...mockTrips]
      
      // IDで重複を除去
      const uniqueTrips = allTrips.filter(
        (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
      )
      
      // ユーザーが作成した旅行のIDを保持
      setUserTripIds(new Set(safeStoredTrips.map(t => t.id)))
      setTrips(uniqueTrips)
    } catch (error) {
      console.error('Failed to load trips:', error)
      // エラー時はモックデータのみ表示
      setTrips(mockTrips)
    }
  }

  const handleDeleteRequest = (tripId: string) => {
    setDeleteConfirmId(tripId)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    
    try {
      await deleteTrip(deleteConfirmId)
      setDeleteConfirmId(null)
      await loadTrips() // リロード
    } catch (error) {
      console.error('Failed to delete trip:', error)
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
  }

  // 配列保証
  const safeTrips = Array.isArray(trips) ? trips : []
  const totalTrips = safeTrips.length
  const totalPhotos = safeTrips.reduce((sum, t) => sum + t.photoCount, 0)
  const totalSpots = safeTrips.reduce((sum, t) => sum + t.spotCount, 0)

  const stats = [
    { icon: BookOpen, value: totalTrips, label: t('trips') },
    { icon: MapPin, value: totalSpots, label: t('spots') },
    { icon: Camera, value: totalPhotos, label: t('photos') },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <MobileTopBar title={t('title')} />

      <main className="flex-1 px-4 pt-5">
        {/* Stats */}
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

        {/* Trip archive list */}
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('yourArchive')}
          </h2>
          {safeTrips.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {t('noTrips')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('noTripsSubtitle')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {safeTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip}
                  isDeletable={userTripIds.has(trip.id)}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('deleteConfirm')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('deleteMessage')}
                </p>
              </div>
              <button
                onClick={handleDeleteCancel}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted active:scale-95"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 active:scale-95"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  )
}
