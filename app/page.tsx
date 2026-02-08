import Link from "next/link"
import Image from "next/image"
import { UplogueLogo } from "@/components/uplogue-logo"

const memories = [
  {
    location: "京都",
    season: "春",
    date: "2024.03",
    caption: "雨上がりの石畳の匂い",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
  },
  {
    location: "沖縄",
    season: "夏",
    date: "2023.08",
    caption: "昼と夜の境目の海",
    image: "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=800&q=80",
  },
  {
    location: "鎌倉",
    season: "秋",
    date: "2023.11",
    caption: "路地裏で見つけた光",
    image: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80",
  },
  {
    location: "北海道",
    season: "冬",
    date: "2024.01",
    caption: "朝の静けさが、まだ耳に残っている",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: "#F7F6F4" }}>
      {/* ── 1. 景色（Hero）── */}
      <section className="relative h-dvh w-full overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 animate-fade-in-slow">
          <Image
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80"
            alt=""
            fill
            className="object-cover"
            priority
          />
          {/* Warm fade overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(247,246,244,0.1) 0%, rgba(247,246,244,0.3) 40%, rgba(247,246,244,0.85) 75%, #F7F6F4 100%)",
            }}
          />
        </div>

        {/* Top bar - white band so logo blends in */}
        <header
          className="relative z-10 flex items-center justify-between px-6 pt-4 pb-3 safe-top"
          style={{
            background: "linear-gradient(to bottom, #F7F6F4 60%, transparent 100%)",
          }}
        >
          <UplogueLogo size={22} showText textColor="text-[#2A2A2A]" />
          <Link
            href="/login"
            className="text-xs tracking-wide"
            style={{ color: "#2A2A2A", opacity: 0.5 }}
          >
            ログイン
          </Link>
        </header>

        {/* Hero copy */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12">
          <h1
            className="animate-fade-in-up-slow animate-delay-300 text-balance text-2xl font-medium leading-relaxed"
            style={{ color: "#2A2A2A", lineHeight: 1.7 }}
          >
            あなたの旅の記録が、
            <br />
            誰かの次の旅になる。
          </h1>

          <p
            className="animate-fade-in-up-slow animate-delay-600 mt-4 text-sm leading-loose"
            style={{ color: "#2A2A2A", opacity: 0.55 }}
          >
            写真をアップロードするだけで、
            <br />
            旅の時間が静かに並びはじめます。
          </p>

          <div className="animate-fade-in-up-slow animate-delay-900 mt-8 flex flex-col gap-3">
            <Link
              href="/register"
              className="flex h-12 items-center justify-center rounded-full text-sm font-medium tracking-wide text-card"
              style={{ backgroundColor: "#C6922C" }}
            >
              旅をはじめる
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 断片（Others' memories）── */}
      <section className="px-6 pt-16 pb-12">
        <p
          className="text-xs tracking-widest"
          style={{ color: "#2A2A2A", opacity: 0.4 }}
        >
          誰かの旅の断片
        </p>

        <div className="mt-8 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {memories.map((memory) => (
            <div
              key={`${memory.location}-${memory.date}`}
              className="group w-56 shrink-0 cursor-default"
            >
              {/* Image */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
                <Image
                  src={memory.image || "/placeholder.svg"}
                  alt={`${memory.location} ${memory.season}`}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* Subtle bottom vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)",
                  }}
                />
                {/* Caption overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-xs font-medium text-card/90">
                    {memory.location} / {memory.season} / {memory.date}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-card">
                    {`「${memory.caption}」`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. 自分も残せる（Soft CTA）── */}
      <section className="px-6 pb-20 pt-8 text-center">
        <p
          className="text-lg font-medium leading-loose"
          style={{ color: "#2A2A2A" }}
        >
          あなたの旅も、
          <br />
          ここに残しませんか。
        </p>

        <Link
          href="/register"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full px-10 text-sm font-medium tracking-wide text-card"
          style={{ backgroundColor: "#C6922C" }}
        >
          旅をはじめる
        </Link>
      </section>

      {/* ── 4. 静かな余白（Footer）── */}
      <footer className="pb-8 pt-4 text-center safe-bottom">
        <p className="text-[10px] tracking-wide" style={{ color: "#2A2A2A", opacity: 0.25 }}>
          &copy; 2025 Uplogue
        </p>
      </footer>
    </div>
  )
}
