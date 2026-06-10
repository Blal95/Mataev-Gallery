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
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <div className="h-full max-h-[70vh] w-full max-w-3xl animate-pulse rounded bg-line/30" />
      </div>

      {/* caption strip skeleton */}
      <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-7 lg:hidden">
        <span className="mb-3 block h-5 w-2/3 animate-pulse rounded bg-line-2/40" />
        <div className="flex items-center justify-between">
          <span className="h-3 w-32 animate-pulse rounded bg-line-2/30" />
          <span className="h-3 w-20 animate-pulse rounded bg-line-2/30" />
        </div>
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
