import { useEffect } from 'react'

const DEFAULT_TITLE =
  'Harshit Raj — Full Stack Developer | Java, React, MERN & AI'
const DEFAULT_DESC =
  'Harshit Raj is a Full Stack Developer from Lucknow, India, building modern, scalable web applications with Java, React, Node.js, MongoDB and AI.'

/** Set document title + meta description per route (restores defaults on unmount). */
export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (title) document.title = title
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content')
    if (meta && description) meta.setAttribute('content', description)

    return () => {
      document.title = DEFAULT_TITLE
      if (meta) meta.setAttribute('content', prevDesc ?? DEFAULT_DESC)
    }
  }, [title, description])
}
