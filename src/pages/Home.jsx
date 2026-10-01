import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/sections/Hero'
import { About } from '../components/sections/About'
import { Skills } from '../components/sections/Skills'
import { Experience } from '../components/sections/Experience'
import { Projects } from '../components/sections/Projects'
import { Certifications } from '../components/sections/Certifications'
import { Contact } from '../components/sections/Contact'

export function Home() {
  const { hash } = useLocation()

  // When arriving with a hash (e.g. navigating from a project page to /#contact),
  // scroll to the target section once the page has mounted.
  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      // rAF lets layout settle before scrolling.
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [hash])

  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Experience />
      <Projects />
      <Certifications />
      <Contact />
    </>
  )
}
