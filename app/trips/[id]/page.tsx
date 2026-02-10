import {redirect} from 'next/navigation';
import { use } from "react"

export default function TripDetailRoot({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  redirect(`/ja/trips/${id}`)
}
