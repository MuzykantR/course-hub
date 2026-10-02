export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      {/* Background Subtle Grid Texture */}
      <div className="bg-grid-pattern absolute inset-0 opacity-70" />

      {/* Floating gradient orbs in HSE brand colors */}
      {/* Orb 1: accent yellow (top-left) */}
      <div className="animate-float-slow absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-hse-yellow/25 blur-[120px] dark:bg-hse-yellow/10" />

      {/* Orb 2: brand blue (top-right / middle) */}
      <div className="animate-float-reverse absolute -right-32 top-1/4 h-[600px] w-[600px] rounded-full bg-hse-blue/20 blur-[140px] dark:bg-hse-blue/30" />

      {/* Orb 3: sky blue (bottom-left) */}
      <div className="animate-float-gentle absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-hse-sky/20 blur-[130px] dark:bg-hse-sky/15" />

      {/* Orb 4: violet pulse (bottom-right) */}
      <div className="animate-pulse-glow absolute -bottom-20 -right-20 h-[450px] w-[450px] rounded-full bg-hse-violet/15 blur-[120px] dark:bg-hse-violet/20" />

      {/* Top ambient spotlight */}
      <div className="absolute left-1/2 top-0 h-[350px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-hse-yellow/10 via-transparent to-transparent opacity-60 blur-3xl" />
    </div>
  );
}
