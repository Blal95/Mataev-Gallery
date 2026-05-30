export function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center px-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
    </div>
  )
}
