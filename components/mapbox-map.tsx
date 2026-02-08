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
          map.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 10,
            duration: 1500,
          })
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
    console.log('=== Mapbox useEffect triggered ===')
    console.log('mapReady:', mapReady)
    console.log('pins:', pins)
    
    if (!map.current || !mapReady) {
      console.log('Map not ready yet, skipping marker creation')
      return
    }

    console.log('Creating markers for', pins.length, 'pins')

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
      
      // Debug log
      console.log(`Creating marker ${spotNumber}: ${pin.title}`, {
        lng: pin.lng,
        lat: pin.lat,
        coordinates: [pin.lng, pin.lat],
        showPermanentLabels,
        hasImage: !!pin.image,
        willUseCardStyle: showPermanentLabels && !!pin.image
      })
      
      // Custom marker element
      const el = document.createElement("div")
      el.style.cursor = "pointer"
      el.style.position = "relative"
      
      let marker: mapboxgl.Marker
      
      if (showPermanentLabels && pin.image) {
        // Permanent label with image and title - simple structure
        el.style.display = "flex"
        el.style.flexDirection = "column"
        el.style.alignItems = "center"
        el.style.width = "140px"
        
        el.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            overflow: hidden;
            border: 2px solid ${pin.color || "#2E3A59"};
            width: 100%;
            margin-bottom: 4px;
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
                color: #2A2A2A;
                line-height: 1.3;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
              ">${pin.title}</div>
            </div>
          </div>
          <svg width="16" height="8" viewBox="0 0 16 8" style="display: block;">
            <polygon points="8,8 0,0 16,0" fill="${pin.color || "#2E3A59"}"/>
          </svg>
        `
        
        // Set anchor to bottom center
        marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!)
      } else {
        // Regular pin marker with optional number
        el.style.width = "36px"
        el.style.height = "40px"
        el.innerHTML = `
          <svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="16" r="12" fill="${pin.color || "#2E3A59"}" fillOpacity="0.15"/>
            <circle cx="18" cy="16" r="7" fill="${pin.color || "#2E3A59"}"/>
            ${shouldShowNumber ? `<text x="18" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="600" font-family="sans-serif">${spotNumber}</text>` : ''}
            <line x1="18" y1="23" x2="18" y2="40" stroke="${pin.color || "#2E3A59"}" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        `
        
        marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current!)
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
          marker.setPopup(popup)
          marker.togglePopup()
        })
        el.addEventListener("mouseleave", () => {
          marker.togglePopup()
        })

        // Also show on touch
        el.addEventListener("touchstart", () => {
          marker.setPopup(popup)
          if (!marker.getPopup()?.isOpen()) {
            marker.togglePopup()
          }
        })
      }

      markersRef.current.push(marker)
    }
  }, [pins, mapReady, onPinClick])

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
