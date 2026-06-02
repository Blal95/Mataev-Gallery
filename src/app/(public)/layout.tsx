import { Wordmark } from "@/components/Wordmark"
import { Footer } from "@/components/Footer"

export default function PublicLayout({
  children, modal,
}: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Wordmark />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <Footer />
      {modal}
    </div>
  )
}
