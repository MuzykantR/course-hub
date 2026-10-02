export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      {/* Background Subtle Grid Texture */}
      <div className="bg-grid-pattern absolute inset-0 opacity-70" />

      {/* Floating gradient orbs: lime (the accent), violet and cyan. These are the only
          places violet and cyan appear. */}
      <div className="animate-float-slow absolute -left-40 -top-48 h-[640px] w-[640px] rounded-full bg-[#B9FF66]/45 blur-[110px] dark:bg-[#B9FF66]/15" />
      <div className="animate-float-reverse absolute -right-44 top-[15%] h-[680px] w-[680px] rounded-full bg-violet-500/25 blur-[130px] dark:bg-violet-500/25" />
      <div className="animate-float-gentle absolute -bottom-40 left-1/4 h-[560px] w-[560px] rounded-full bg-cyan-400/20 blur-[130px] dark:bg-cyan-400/15" />
    </div>
  );
}
