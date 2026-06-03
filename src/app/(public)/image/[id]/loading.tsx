export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* indeterminate progress bar */}
      <div className="absolute inset-x-0 top-0 z-50 h-[2px] overflow-hidden">
        <div
          className="h-full w-1/3 bg-amber"
          style={{ animation: "loading-slide 1.2s ease-in-out infinite" }}
        />
      </div>

      {/* fake header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="h-3 w-28 animate-pulse rounded bg-line-2/40" />
        <div className="flex items-center gap-2">
          <span className="h-7 w-16 animate-pulse rounded-full bg-line-2/40" />
          <span className="h-7 w-7 animate-pulse rounded-full bg-line-2/40" />
        </div>
      </div>

      {/* center stage skeleton */}
      <div className="relative flex flex-1 items-center justify-center px-4">
        <div className="h-full max-h-[80vh] w-full max-w-3xl animate-pulse rounded bg-line/30" />
      </div>

      {/* filmstrip skeleton */}
      <div className="flex gap-2 border-t border-line bg-bg px-4 py-3 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="h-[52px] w-[68px] shrink-0 animate-pulse rounded-[2px] bg-line-2/30" />
        ))}
      </div>

      <style>{`
        @keyframes loading-slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(200%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
