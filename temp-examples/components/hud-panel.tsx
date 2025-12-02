"use client"

interface HudPanelProps {
  title: string
  value: string | number
  icon?: string
}

export default function HudPanel({ title, value, icon }: HudPanelProps) {
  return (
    <div
      className="bg-black/50 backdrop-blur-xl border border-blue-400/40 rounded-lg p-4 w-56"
      style={{
        boxShadow: "0 0 25px rgba(96, 165, 250, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-blue-300/70 text-xs font-mono uppercase tracking-widest">{title}</p>
          <p className="text-white text-sm font-mono font-semibold mt-2">{value}</p>
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  )
}
