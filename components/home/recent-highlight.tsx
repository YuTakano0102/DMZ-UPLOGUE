"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function RecentHighlight() {
  const [tapped, setTapped] = useState(false)

  return (
    <section className="px-4 pt-10">
      <Link
        href="/trips/trip-okinawa-2025"
        className="block"
        onTouchStart={() => setTapped(true)}
        onTouchEnd={() => setTimeout(() => setTapped(false), 1200)}
        onMouseEnter={() => setTapped(true)}
        onMouseLeave={() => setTapped(false)}
      >
        <div className="overflow-hidden rounded-2xl">
          {/* Exhibition-style image — no borders */}
          <div className="relative aspect-[4/5]">
            <Image
              src="https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=1200&q=80"
              alt="沖縄の記憶"
              fill
              className="object-cover"
            />
            {/* Subtle bottom vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

            {/* Poetic title — always visible */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-7">
              <p className="text-lg font-light leading-relaxed text-primary-foreground">
                {"昼と夜のあいだの海だった"}
              </p>

              {/* Secondary info — fades in on tap/hover */}
              <div
                className="mt-2 overflow-hidden transition-all duration-500 ease-out"
                style={{
                  maxHeight: tapped ? "3rem" : "0",
                  opacity: tapped ? 1 : 0,
                }}
              >
                <p className="text-[11px] tracking-wide text-primary-foreground/50">
                  Okinawa — 3 days — 2025.01
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
