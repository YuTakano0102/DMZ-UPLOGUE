"use client"

import React from "react"
import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"

export interface MapPin {
  id: string
  lng: number
  lat: number
  title: string
  subtitle?: string
  color?: string
  arrivalTime?: string
  departureTime?: string
  image?: string
  showNumber?: boolean
}

interface MapboxMapProps {
  pins?: MapPin[]
  onPinClick?: (pin: MapPin) => void
  className?: string
  style?: React.CSSProperties
  /** If true, centers map on user's current location */
  useGeolocation?: boolean
  /** Fallback center if geolocation is unavailable [lng, lat] */
  fallbackCenter?: [number, number]
  /** Initial zoom level */
  initialZoom?: number
  /** If true, draws a route line connecting pins in order */
  showRoute?: boolean
  /** Route line color */
  routeColor?: string
  /** If true, shows permanent labels with images for pins */
  showPermanentLabels?: boolean
}

export function MapboxMap({
  pins = [],
  onPinClick,
  className = "",
  style,
  useGeolocation = true,
  fallbackCenter = [139.6917, 35.6895], // Tokyo
  initialZoom = 5,
  showRoute = false,
  routeColor = "#C6922C",
  showPermanentLabels = false,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: fallbackCenter,
      zoom: initialZoom,
      attributionControl: false,
      pitchWithRotate: false,
    })

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    )

    map.current.on("load", () => {
      setMapReady(true)
    })

    // Try geolocation
    if (useGeolocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 安全ガード: position.coordsが存在するか確認
          if (position?.coords?.longitude !== undefined && position?.coords?.latitude !== undefined) {
            map.current?.flyTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 10,
              duration: 1500,
            })
          }
        },
        () => {
          // Geolocation denied or failed - stay at fallback
        },
        { enableHighAccuracy: false, timeout: 5000 }
      )
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Add / update pins
  useEffect(() => {
    if (!map.current || !mapReady) {
      return
    }

    // Clear old markers
    for (const m of markersRef.current) {
      m.remove()
    }
    markersRef.current = []

    // Add new markers
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i]
      const spotNumber = i + 1
      const shouldShowNumber = pin.showNumber !== false && showRoute
      
      // Custom marker element
      const el = document.createElement("div")
      el.style.cursor = "pointer"
      
      if (showPermanentLabels && pin.image) {
        // Permanent label with image - card style
        el.style.display = "flex"
        el.style.flexDirection = "column"
        el.style.alignItems = "center"
        el.style.width = "140px"
        
        el.innerHTML = `
          <div style="
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            overflow: hidden;
            border: 2px solid ${pin.color || "#2E3A59"};
            width: 100%;
            backdrop-filter: blur(10px);
          ">
            <img 
              src="${pin.image}" 
              alt="${pin.title}"
              style="
                width: 100%;
                height: 80px;
                object-fit: cover;
                display: block;
              "
            />
            <div style="padding: 8px;">
              <div style="
                font-size: 11px;
                font-weight: 600;
                color: #000;
                line-height: 1.3;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
              ">${pin.title}</div>
              ${pin.subtitle ? `<div style="
                font-size: 11px;
                color: rgba(0,0,0,0.6);
                margin-top: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${pin.subtitle}</div>` : ''}
            </div>
          </div>
          <div style="display: flex; justify-content: center; padding-bottom: 4px;">
            <svg width="16" height="8" viewBox="0 0 16 8">
              <polygon points="8,8 0,0 16,0" fill="${pin.color || "#2E3A59"}"/>
            </svg>
          </div>
        `
        
        // ★ 重要：anchor を 'bottom' に設定
        const marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!)

        markersRef.current.push(marker)
      } else {
        // Regular pin marker with optional number
        el.innerHTML = `
          <svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <circle cx="18" cy="16" r="12" fill="${pin.color || "#2E3A59"}" fill-opacity="0.15"/>
            <circle cx="18" cy="16" r="7" fill="${pin.color || "#2E3A59"}"/>
            ${shouldShowNumber ? `<text x="18" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="600" font-family="sans-serif">${spotNumber}</text>` : ''}
            <line x1="18" y1="23" x2="18" y2="40" stroke="${pin.color || "#2E3A59"}" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `
        
        // ★ 重要：anchor を 'bottom' に設定
        const marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!)

        markersRef.current.push(marker)
      }

      if (onPinClick) {
        el.addEventListener("click", () => onPinClick(pin))
      }

      // Tooltip popup - only for non-permanent labels
      if (!showPermanentLabels) {
        const formatTime = (isoStr: string) => {
          try {
            return new Date(isoStr).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })
          } catch {
            return ""
          }
        }

        const timeRange = pin.arrivalTime && pin.departureTime
          ? `${formatTime(pin.arrivalTime)} - ${formatTime(pin.departureTime)}`
          : ""

        const lastMarker = markersRef.current[markersRef.current.length - 1]
        
        const popup = new mapboxgl.Popup({
          offset: 20,
          closeButton: false,
          closeOnClick: false,
          className: "uplogue-popup",
        }).setHTML(
          `<div style="font-family:sans-serif;padding:4px 0;">
            <div style="font-weight:600;font-size:13px;color:#2A2A2A;">${pin.title}</div>
            ${timeRange ? `<div style="font-size:11px;color:#C6922C;margin-top:2px;font-weight:500;">🕐 ${timeRange}</div>` : ""}
            ${pin.subtitle ? `<div style="font-size:11px;color:#888;margin-top:2px;">${pin.subtitle}</div>` : ""}
          </div>`
        )

        el.addEventListener("mouseenter", () => {
          lastMarker.setPopup(popup)
          lastMarker.togglePopup()
        })
        el.addEventListener("mouseleave", () => {
          lastMarker.togglePopup()
        })

        // Also show on touch
        el.addEventListener("touchstart", () => {
          lastMarker.setPopup(popup)
          if (!lastMarker.getPopup()?.isOpen()) {
            lastMarker.togglePopup()
          }
        })
      }
    }
  }, [pins, mapReady, onPinClick, showPermanentLabels, showRoute])

  // Draw route line connecting pins in order
  useEffect(() => {
    if (!map.current || !mapReady || !showRoute || pins.length < 2) return

    const sourceId = "route-source"
    const layerId = "route-line"

    // Remove existing route if any
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId)
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId)
    }

    const coordinates = pins.map((p) => [p.lng, p.lat])

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    })

    map.current.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": routeColor,
        "line-width": 3,
        "line-opacity": 0.7,
        "line-dasharray": [2, 2],
      },
    })

    // Fit bounds to show entire route
    if (pins.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds()
      for (const pin of pins) {
        bounds.extend([pin.lng, pin.lat])
      }
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 })
    }
  }, [pins, mapReady, showRoute, routeColor])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!token) {
    return (
      <div style={style} className={`flex items-center justify-center bg-muted text-muted-foreground text-sm ${className}`}>
        <p>NEXT_PUBLIC_MAPBOX_TOKEN を設定してください</p>
      </div>
    )
  }

  return <div ref={mapContainer} style={style} className={`${className}`} />
}
