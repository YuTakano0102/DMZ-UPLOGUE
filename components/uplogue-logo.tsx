import Image from "next/image"

interface UploguLogoProps {
  className?: string
  size?: number
  showText?: boolean
  textColor?: string
}

export function UplogueLogo({
  className = "",
  size = 32,
  showText = true,
  textColor = "text-primary",
}: UploguLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/uplogue-logo.png"
        alt="Uplogue"
        width={Math.round(size * 2)}
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <span
          className={`text-lg font-bold tracking-wider uppercase ${textColor}`}
        >
          Uplogue
        </span>
      )}
    </div>
  )
}
