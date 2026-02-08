"use client"

import React from "react"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface MobileTopBarProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export function MobileTopBar({
  title,
  showBack = false,
  rightAction,
}: MobileTopBarProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg safe-top">
      <div className="flex h-11 items-center justify-between px-4">
        <div className="flex w-10 items-center">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground active:bg-muted"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        {title && (
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        )}
        <div className="flex w-10 items-center justify-end">{rightAction}</div>
      </div>
    </header>
  )
}
