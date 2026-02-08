import Image from "next/image"
import Link from "next/link"

export function LingeringMoment() {
  return (
    <section className="px-4 pb-8 pt-12">
      <Link href="/trips/trip-kamakura-2025" className="block">
        <div className="overflow-hidden rounded-2xl">
          {/* Photo with warm vignette */}
          <div className="relative aspect-[16/10]">
            <Image
              src="https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=80"
              alt="鎌倉の記憶"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F7F6F4] via-transparent to-transparent opacity-50" />
          </div>
        </div>

        <div className="px-1 pt-4">
          <p className="text-sm font-light italic leading-relaxed text-foreground/80">
            {"鎌倉の夕暮れ、海沿いの風が穏やかだった。"}
          </p>

          <p className="mt-2 text-[11px] tracking-wide text-muted-foreground/60">
            2025.05.15 — Kamakura
          </p>
        </div>
      </Link>
    </section>
  )
}
