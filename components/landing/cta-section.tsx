import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center md:px-16 md:py-24">
        <p className="text-sm font-medium tracking-widest uppercase text-gold">
          Start Your Journey
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold text-primary-foreground md:text-4xl">
          あなたの旅を、
          <span className="text-gold">記録</span>
          しませんか？
        </h2>
        <p className="mx-auto mt-4 max-w-md text-pretty text-primary-foreground/70">
          写真をアップするだけで、旅の思い出が美しいストーリーに。
          今すぐ無料で始めましょう。
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button
            size="lg"
            className="bg-gold px-10 text-base font-semibold text-primary hover:bg-gold/90"
          >
            無料アカウントを作成
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
