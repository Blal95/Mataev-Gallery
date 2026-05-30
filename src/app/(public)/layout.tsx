import { Wordmark } from "@/components/Wordmark"
import { Footer } from "@/components/Footer"

export default function PublicLayout({
  children, modal,
}: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <>
      <Wordmark />
      {children}
      {modal}
      <Footer />
    </>
  )
}
