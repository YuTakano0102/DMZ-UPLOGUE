import { Upload, MapPin, Clock, Share2 } from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "写真をアップするだけ",
    description:
      "複数の写真を選択・ドラッグ&ドロップ。EXIF情報（GPS、撮影日時）を自動で読み取ります。",
  },
  {
    icon: Clock,
    title: "AIがタイムラインを自動生成",
    description:
      "撮影日時と位置情報から、旅の行程を時系列に自動整列。スポットごとに美しくまとめます。",
  },
  {
    icon: MapPin,
    title: "地図で旅のルートを可視化",
    description:
      "訪れた場所がピンで地図上にプロット。旅のルートをビジュアルに振り返れます。",
  },
  {
    icon: Share2,
    title: "ワンクリックで共有",
    description:
      "URLを共有するだけで、友人や家族に旅の記録をシェア。OGP対応で美しいプレビュー。",
  },
]

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center">
        <p className="text-sm font-medium tracking-widest uppercase text-gold">
          How It Works
        </p>
        <h2 className="mt-3 text-balance text-3xl font-bold text-foreground md:text-4xl">
          旅の記録を、もっと簡単に。
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          面倒な整理作業はAIにおまかせ。写真をアップするだけで、あなたの旅がストーリーになります。
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-gold/30 hover:shadow-lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
