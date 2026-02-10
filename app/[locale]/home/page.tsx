'use client'

import { usePathname } from "next/navigation"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { UplogueLogo } from "@/components/uplogue-logo"
import { MemoryCard } from "@/components/home/memory-card"
import { RecentHighlight } from "@/components/home/recent-highlight"
import { RelatedExperiences } from "@/components/home/related-experiences"
import { LingeringMoment } from "@/components/home/lingering-moment"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function HomePage() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ja'

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg safe-top">
        <div className="flex h-11 items-center justify-between px-5">
          <UplogueLogo size={20} showText />
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="h-7 w-7 overflow-hidden rounded-full bg-muted">
              <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted-foreground">
                T
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <MemoryCard />
        <RecentHighlight />
        <RelatedExperiences />
        <LingeringMoment />
      </main>

      <BottomTabBar />
    </div>
  )
}
