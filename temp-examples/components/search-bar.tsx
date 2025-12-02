"use client"

import { useState } from "react"

export default function SearchBar() {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className="relative w-96"
      style={{
        transition: "all 0.3s ease",
      }}
    >
      <div
        className="bg-black/30 backdrop-blur-xl border border-cyan-400/30 rounded-full px-6 py-3 flex items-center gap-3"
        style={{
          boxShadow: focused
            ? "0 0 30px rgba(34, 211, 238, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)"
            : "0 0 15px rgba(34, 211, 238, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <span className="text-cyan-400/60">🔍</span>
        <input
          type="text"
          placeholder="Search files semantically..."
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="bg-transparent text-white placeholder-gray-500 outline-none w-full text-sm font-mono"
        />
      </div>

      {/* Glow effect when focused */}
      {focused && (
        <div
          className="absolute -inset-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 rounded-full pointer-events-none blur-xl"
          style={{
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}
    </div>
  )
}
