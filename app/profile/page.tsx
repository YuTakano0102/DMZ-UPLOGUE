import Link from "next/link"
import {
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  HelpCircle,
  Shield,
} from "lucide-react"
import { MobileTopBar } from "@/components/mobile-top-bar"
import { BottomTabBar } from "@/components/bottom-tab-bar"

const menuItems = [
  { icon: Bell, label: "通知設定", href: "#" },
  { icon: Shield, label: "プライバシー設定", href: "#" },
  { icon: Settings, label: "アカウント設定", href: "#" },
  { icon: HelpCircle, label: "ヘルプ・お問い合わせ", href: "#" },
]

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-20">
      <MobileTopBar title="マイページ" />

      <main className="flex-1 px-4 pt-6">
        {/* User info */}
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl font-bold text-primary">T</span>
          </div>
          <h2 className="mt-3 text-base font-bold text-foreground">
            田中 太郎
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            taro@example.com
          </p>
          <div className="mt-4 flex gap-6">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-foreground">5</span>
              <span className="text-[10px] text-muted-foreground">旅行</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-foreground">26</span>
              <span className="text-[10px] text-muted-foreground">
                スポット
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-foreground">392</span>
              <span className="text-[10px] text-muted-foreground">写真</span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-8 flex flex-col gap-0.5 overflow-hidden rounded-2xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3.5 active:bg-muted ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-destructive active:bg-muted">
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </main>

      <BottomTabBar />
    </div>
  )
}
