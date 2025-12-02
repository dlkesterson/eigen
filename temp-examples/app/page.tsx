"use client"

import dynamic from "next/dynamic"

const ConstellationDashboard = dynamic(() => import("@/components/constellation-dashboard"), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <ConstellationDashboard />
    </main>
  )
}
