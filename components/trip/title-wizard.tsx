"use client"

import { useEffect, useMemo, useState } from "react"
import type { Trip } from "@/lib/mock-data"
import type { UplogueTag } from "@/lib/uplogue-lexicon"
import { generateTitleSuggestions } from "@/lib/title-generator"
import { saveTrip } from "@/lib/trip-storage"
import { Sparkles, Check, PencilLine, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  trip: Trip
  onUpdated?: (updated: Trip) => void
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function labelForCategory(category: UplogueTag["category"]) {
  switch (category) {
    case "place":
      return "場所"
    case "season":
      return "季節"
    case "time":
      return "時間"
    case "motion":
      return "歩き方"
    case "mood":
      return "空気感"
    default:
      return "タグ"
  }
}

export function TitleWizard({ trip, onUpdated }: Props) {
  const tags = (trip.tags ?? []) as UplogueTag[]

  // ウィザードの表示状態（デフォルトは折りたたみ、ユーザーが編集ボタンを押したら展開）
  const [isOpen, setIsOpen] = useState(false)
  
  // 選択は最大3
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string>("")
  const [customTitle, setCustomTitle] = useState<string>("")
  const [mode, setMode] = useState<"pickTags" | "pickTitle">("pickTags")

  useEffect(() => {
    // 既存タイトルがあれば初期表示に入れておく（編集しやすい）
    setCustomTitle(trip.title || "")
  }, [trip.title])

  const selectedTags = useMemo(() => {
    const set = new Set(selectedIds)
    return tags.filter((t) => set.has(t.id))
  }, [tags, selectedIds])

  const suggestions = useMemo(() => {
    if (selectedTags.length < 3) return []
    return generateTitleSuggestions(selectedTags)
  }, [selectedTags])

  const canGenerate = selectedIds.length === 3
  const canSave = (selectedTitle.trim().length > 0) || (customTitle.trim().length > 0)

  const toggleTag = (tag: UplogueTag) => {
    setSelectedTitle("")
    const id = tag.id
    setSelectedIds((prev) => {
      const has = prev.includes(id)
      if (has) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev // 3つ超えない
      return [...prev, id]
    })
  }

  const goNext = () => {
    if (!canGenerate) return
    setMode("pickTitle")
  }

  const goBack = () => {
    setMode("pickTags")
  }

  const handleSave = () => {
    const finalTitle = (selectedTitle.trim() || customTitle.trim()).slice(0, 80)
    if (!finalTitle) return

    const updated: Trip = {
      ...trip,
      title: finalTitle,
      // ユーザーの選択を残しておく（あとで再編集に使える）
      // @ts-ignore: optional fields
      selectedTagIds: selectedIds,
    }

    saveTrip(updated)
    onUpdated?.(updated)
    
    // 保存後はウィザードを閉じる
    setIsOpen(false)
    setMode("pickTags")
    setSelectedIds([])
    setSelectedTitle("")
  }

  // ウィザードが閉じている時の表示
  if (!isOpen) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10">
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {trip.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                タイトルを変更できます
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            variant="outline"
            className="h-9 rounded-lg border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
          >
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            編集
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10">
          <Sparkles className="h-4 w-4 text-gold" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            旅のタイトルを、もう少し"Uplogue"に。
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            写真から抽出したタグのうち、あなたが「この旅っぽい」と思う3つを選んでください。
            その3つからタイトル候補を作ります。
          </p>
        </div>
        <button
          onClick={() => {
            setIsOpen(false)
            setMode("pickTags")
            setSelectedIds([])
            setSelectedTitle("")
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="閉じる"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2 py-1", mode === "pickTags" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground")}>
          1. タグを選ぶ
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={cn("rounded-full px-2 py-1", mode === "pickTitle" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground")}>
          2. タイトルを選ぶ
        </span>
      </div>

      {mode === "pickTags" && (
        <>
          {/* Tag list */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            {tags.map((tag) => {
              const selected = selectedIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                    selected ? "border-gold bg-gold/10" : "border-border bg-background hover:bg-muted/40"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{tag.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {labelForCategory(tag.category)}
                      {tag.reason ? ` ・ ${tag.reason}` : ""}
                    </p>
                  </div>
                  <div className={cn(
                    "ml-3 flex h-6 w-6 items-center justify-center rounded-full border",
                    selected ? "border-gold bg-gold text-primary" : "border-border bg-background"
                  )}>
                    {selected ? <Check className="h-4 w-4" /> : <span className="text-xs text-muted-foreground" />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              選択：{selectedIds.length}/3
            </p>
            <Button
              onClick={goNext}
              disabled={!canGenerate}
              className="h-11 rounded-xl bg-gold font-semibold text-primary hover:bg-gold/90 disabled:opacity-50"
            >
              候補を生成
            </Button>
          </div>
        </>
      )}

      {mode === "pickTitle" && (
        <>
          <div className="mt-4 space-y-2">
            {suggestions.map((sug) => {
              const active = selectedTitle === sug.title
              return (
                <button
                  key={sug.title}
                  onClick={() => setSelectedTitle(sug.title)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    active ? "border-gold bg-gold/10" : "border-border bg-background hover:bg-muted/40"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{sug.title}</p>
                  {sug.subtitle ? (
                    <p className="mt-1 text-xs text-muted-foreground">{sug.subtitle}</p>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Manual edit */}
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <PencilLine className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">または編集する</p>
            </div>
            <input
              value={customTitle}
              onChange={(e) => {
                setSelectedTitle("")
                setCustomTitle(e.target.value)
              }}
              placeholder="タイトルを入力…"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-gold"
              maxLength={80}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              80文字まで
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={goBack}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← タグ選択に戻る
            </button>

            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="h-11 rounded-xl bg-gold font-semibold text-primary hover:bg-gold/90 disabled:opacity-50"
            >
              このタイトルで保存
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
