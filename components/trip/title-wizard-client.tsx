"use client"

import { useState } from "react"
import type { Trip } from "@/lib/mock-data"
import { TitleWizard } from "./title-wizard"

export function TitleWizardClient({ trip }: { trip: Trip }) {
  const [localTrip, setLocalTrip] = useState(trip)
  return <TitleWizard trip={localTrip} onUpdated={setLocalTrip} />
}
