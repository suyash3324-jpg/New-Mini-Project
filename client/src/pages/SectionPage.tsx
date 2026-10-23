import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SectionPage({ section }: { section: string }) {
  return (
    <section className="section-state">
      <h1>{section}</h1>
      <p>The page you requested does not exist.</p>
      <Link className="back-link" to="/"> <ArrowLeft size={15} /> Back to overview</Link>
    </section>
  )
}
