export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      {/* Background Subtle Grid Texture */}
      <div className="bg-grid-pattern absolute inset-0 opacity-70" />

      {/* Floating Animated Gradient Orbs */}
      {/* Orb 1: Signature Electric Lime Glow (Top-Left) */}
      <div className="animate-float-slow absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-[#B9FF66]/25 blur-[120px] dark:bg-[#B9FF66]/15" />

      {/* Orb 2: Soft Cosmic Violet Glow (Top-Right / Middle) */}
      <div className="dark:bg-purple-600/18 animate-float-reverse absolute -right-32 top-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-[140px]" />

      {/* Orb 3: Deep Cyan / Ocean Blue Glow (Bottom-Left) */}
      <div className="animate-float-gentle absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[130px] dark:bg-cyan-500/15" />

      {/* Orb 4: Warm Rose / Coral Accent Pulse (Bottom-Right) */}
      <div className="dark:bg-pink-600/12 animate-pulse-glow absolute -bottom-20 -right-20 h-[450px] w-[450px] rounded-full bg-rose-400/15 blur-[120px]" />

      {/* Top Ambient Radial Spotlight */}
      <div className="absolute left-1/2 top-0 h-[350px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-[#B9FF66]/10 via-transparent to-transparent opacity-60 blur-3xl" />
    </div>
  );
}
