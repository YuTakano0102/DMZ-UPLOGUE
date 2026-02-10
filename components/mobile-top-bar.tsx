"use client"

import React from "react"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"

interface MobileTopBarProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
  showLanguageSwitcher?: boolean
}

export function MobileTopBar({
  title,
  showBack = false,
  rightAction,
  showLanguageSwitcher = true,
}: MobileTopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg safe-top">
      <div className="flex h-11 items-center justify-between px-4">
        <div className="flex w-10 items-center">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground active:bg-muted"
              aria-label={locale === 'ja' ? '戻る' : 'Back'}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        {title && (
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        )}
        <div className="flex items-center gap-2 justify-end">
          {showLanguageSwitcher && <LanguageSwitcher locale={locale} />}
          {rightAction}
        </div>
      </div>
    </header>
  )
}
