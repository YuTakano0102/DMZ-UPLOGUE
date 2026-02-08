import { UplogueLogo } from "@/components/uplogue-logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <UplogueLogo size={24} textColor="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          &copy; 2025 Uplogue. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
