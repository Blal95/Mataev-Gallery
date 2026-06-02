export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Suppress the mt-16 footer gap from the parent layout on this page only */}
      <style>{`footer { margin-top: 0 !important; }`}</style>
      {children}
    </>
  )
}
