export interface Spot {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  arrivalTime: string
  departureTime: string
  photos: string[]
  representativePhoto: string
}

export interface Trip {
  id: string
  title: string
  coverImage: string
  startDate: string
  endDate: string
  location: string
  spotCount: number
  photoCount: number
  isPublic: boolean
  spots: Spot[]
}

export const mockTrips: Trip[] = [
  {
    id: "trip-kyoto-2025",
    title: "京都・秋の古都巡り",
    coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
    startDate: "2025-11-15",
    endDate: "2025-11-17",
    location: "京都府",
    spotCount: 5,
    photoCount: 87,
    isPublic: true,
    spots: [
      {
        id: "spot-1",
        name: "伏見稲荷大社",
        address: "京都市伏見区深草藪之内町68",
        lat: 34.9671,
        lng: 135.7727,
        arrivalTime: "2025-11-15T09:30:00",
        departureTime: "2025-11-15T11:00:00",
        photos: [
          "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
          "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
          "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80",
        ],
        representativePhoto: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
      },
      {
        id: "spot-2",
        name: "錦市場",
        address: "京都市中京区錦小路通",
        lat: 35.005,
        lng: 135.7649,
        arrivalTime: "2025-11-15T12:00:00",
        departureTime: "2025-11-15T13:30:00",
        photos: [
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
          "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800&q=80",
        ],
        representativePhoto: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
      },
      {
        id: "spot-3",
        name: "金閣寺",
        address: "京都市北区金閣寺町1",
        lat: 35.0394,
        lng: 135.7292,
        arrivalTime: "2025-11-16T09:00:00",
        departureTime: "2025-11-16T10:30:00",
        photos: [
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
          "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80",
        ],
        representativePhoto: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
      },
      {
        id: "spot-4",
        name: "嵐山竹林",
        address: "京都市右京区嵯峨天龍寺芒ノ馬場町",
        lat: 35.0173,
        lng: 135.672,
        arrivalTime: "2025-11-16T11:30:00",
        departureTime: "2025-11-16T13:00:00",
        photos: [
          "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
          "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80",
        ],
        representativePhoto: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
      },
      {
        id: "spot-5",
        name: "清水寺",
        address: "京都市東山区清水1丁目294",
        lat: 34.9949,
        lng: 135.785,
        arrivalTime: "2025-11-17T09:00:00",
        departureTime: "2025-11-17T11:00:00",
        photos: [
          "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
        ],
        representativePhoto: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80",
      },
    ],
  },
  {
    id: "trip-okinawa-2025",
    title: "沖縄・青い海と島時間",
    coverImage: "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=1200&q=80",
    startDate: "2025-08-10",
    endDate: "2025-08-13",
    location: "沖縄県",
    spotCount: 8,
    photoCount: 124,
    isPublic: true,
    spots: [],
  },
  {
    id: "trip-hokkaido-2025",
    title: "北海道・夏のラベンダー畑",
    coverImage: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80",
    startDate: "2025-07-20",
    endDate: "2025-07-23",
    location: "北海道",
    spotCount: 6,
    photoCount: 95,
    isPublic: false,
    spots: [],
  },
  {
    id: "trip-tokyo-2025",
    title: "東京・ネオンと下町散歩",
    coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
    startDate: "2025-06-01",
    endDate: "2025-06-02",
    location: "東京都",
    spotCount: 4,
    photoCount: 52,
    isPublic: true,
    spots: [],
  },
  {
    id: "trip-kamakura-2025",
    title: "鎌倉・古都の風を感じて",
    coverImage: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=80",
    startDate: "2025-05-15",
    endDate: "2025-05-15",
    location: "神奈川県",
    spotCount: 3,
    photoCount: 34,
    isPublic: true,
    spots: [],
  },
]
