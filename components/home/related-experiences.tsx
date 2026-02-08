import Image from "next/image"
import Link from "next/link"

const traces = [
  {
    id: "trace-1",
    location: "嵐山",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
    proximity: "300m先",
  },
  {
    id: "trace-2",
    location: "伏見稲荷",
    image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
    proximity: "同じ夕方",
  },
  {
    id: "trace-3",
    location: "金閣寺",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    proximity: "同じ季節",
  },
]

export function RelatedExperiences() {
  return (
    <section className="pt-12">
      <div className="px-5">
        <p className="text-sm font-light leading-relaxed text-muted-foreground">
          {"この場所に、他にも誰かがいました"}
        </p>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
        {traces.map((trace) => (
          <Link
            key={trace.id}
            href="/maplogue"
            className="flex-shrink-0 active:opacity-80"
          >
            <div className="relative h-32 w-24 overflow-hidden rounded-xl">
              <Image
                src={trace.image || "/placeholder.svg"}
                alt={trace.location}
                fill
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-[10px] font-medium text-primary-foreground">
                  {trace.location}
                </p>
                <p className="mt-0.5 text-[9px] text-primary-foreground/45">
                  {trace.proximity}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
