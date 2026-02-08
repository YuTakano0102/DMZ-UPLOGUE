"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Globe, Plus, BookOpen, User } from "lucide-react"

const tabs = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/maplogue", icon: Globe, label: "MapLogue" },
  { href: "/upload", icon: Plus, label: "UpLogue", isCenter: true },
  { href: "/mylogue", icon: BookOpen, label: "MyLogue" },
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom"
      aria-label="Tab navigation"
    >
      <div className="flex items-end justify-around px-1 pb-1 pt-1.5">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/")

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 px-2"
              >
                <div className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold shadow-lg shadow-gold/25 active:scale-95 active:bg-gold/90">
                  <Plus className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-medium text-gold">
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <tab.icon
                className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : ""}`}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
