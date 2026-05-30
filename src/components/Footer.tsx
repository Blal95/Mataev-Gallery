import { site } from "@/config/site"

export function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
      <a href={site.links.portfolio} className="hover:text-cyan">mataev.no</a>
      <a href={site.links.github} target="_blank" rel="noopener noreferrer" className="hover:text-cyan">GitHub</a>
      <a href={`mailto:${site.links.email}`} className="hover:text-cyan">{site.links.email}</a>
    </footer>
  )
}
