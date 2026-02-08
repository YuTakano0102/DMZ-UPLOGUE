"use client"

import Image from "next/image"
import Link from "next/link"

export function MemoryCard() {
  return (
    <section className="px-4 pt-6">
      <Link href="/trips/trip-kyoto-2025" className="block">
        <div className="relative overflow-hidden rounded-2xl">
          {/* Hero image */}
          <div className="relative aspect-[3/4]">
            <Image
              src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80"
              alt="京都の記憶"
              fill
              className="object-cover"
              priority
            />
            {/* Soft vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-foreground/5" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/15 via-transparent to-transparent" />
          </div>

          {/* Text overlay — fades in softly */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 animate-fade-in-slow animate-delay-300">
            <p className="text-[11px] tracking-widest uppercase text-primary-foreground/50">
              2 years ago today
            </p>

            <h2 className="mt-3 text-xl font-medium leading-relaxed text-primary-foreground">
              春の匂いの朝でした
            </h2>

            <p className="mt-3 text-[11px] tracking-wide text-primary-foreground/40">
              2023.11.15 — Kyoto
            </p>
          </div>
        </div>
      </Link>
    </section>
  )
}
