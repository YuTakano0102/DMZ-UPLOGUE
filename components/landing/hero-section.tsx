import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-background" />
      </div>

      <div className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="mb-4 text-sm font-medium tracking-widest uppercase text-gold">
          AI Travel Log Platform
        </p>
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight text-primary-foreground md:text-6xl md:leading-tight">
          あなたの旅の記録が、
          <br />
          <span className="text-gold">誰かの次の旅</span>になる。
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-primary-foreground/80">
          写真をアップするだけで、AIが旅のタイムラインと地図を自動生成。
          面倒な記録作業から解放されて、旅の体験を美しく残しましょう。
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gold px-8 text-base font-semibold text-primary hover:bg-gold/90"
            >
              無料で始める
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              ログイン
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
          {[
            { value: "3", unit: "ステップ", label: "で記録完了" },
            { value: "AI", unit: "", label: "自動タイムライン" },
            { value: "URL", unit: "", label: "ワンクリック共有" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-gold md:text-3xl">
                {stat.value}
                <span className="text-lg">{stat.unit}</span>
              </div>
              <div className="mt-1 text-xs text-primary-foreground/60 md:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
