"use client"

import { useState } from "react"

interface PixelPetProps {
  src?: string
  alt: string
  className?: string
  fallbackQuery?: string
}

export function PixelPet({ src, alt, className = "", fallbackQuery = "cute pixelated pet creature" }: PixelPetProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fallbackSrc = `/placeholder.svg?height=200&width=200&query=${encodeURIComponent(fallbackQuery)}`
  const imageSrc = imageError || !src ? fallbackSrc : src

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        className="w-full h-full object-cover pixelated"
        style={{ imageRendering: "pixelated" }}
        onError={() => setImageError(true)}
        onLoad={() => setIsLoading(false)}
      />
      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-inherit" />}
    </div>
  )
}
