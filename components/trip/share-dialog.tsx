"use client"

import { useState } from "react"
import { Copy, Check, Link2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ShareDialog({
  tripTitle,
  tripId,
  isOpen,
  onClose,
}: {
  tripTitle: string
  tripId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `https://uplogue.app/trips/${tripId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div className="relative z-10 w-full animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card px-5 pb-8 pt-3 safe-bottom">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">旅行を共有</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground active:bg-muted"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          「{tripTitle}」をURLで共有
        </p>

        {/* URL Copy */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-xl border border-border bg-background px-3 py-2.5">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-foreground">{shareUrl}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={`shrink-0 ${copied ? "border-gold text-gold" : ""}`}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* SNS */}
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium text-foreground">SNSで共有</p>
          <div className="flex gap-4">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1DA1F2] text-[#fff] active:opacity-80"
              aria-label="Xで共有"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#06C755] text-[#fff] active:opacity-80"
              aria-label="LINEで共有"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-[#fff] active:opacity-80"
              aria-label="Facebookで共有"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
