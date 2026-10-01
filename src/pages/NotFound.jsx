import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home as HomeIcon } from 'lucide-react'
import { buttonVariants } from '../components/ui/Button'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export function NotFound() {
  useDocumentMeta({
    title: 'Page not found — Harshit Raj',
    description: 'The page you were looking for could not be found.',
  })

  return (
    <section className="flex min-h-[80vh] items-center justify-center px-5 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <p className="font-mono text-sm text-primary">404 — not found</p>
        <h1 className="mt-4 text-7xl font-bold tracking-tight text-gradient">404</h1>
        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border bg-surface p-4 text-left font-mono text-sm">
          <span className="text-emerald-400">➜</span>{' '}
          <span className="text-accent-cyan">~</span> cd{' '}
          <span className="text-foreground">{typeof window !== 'undefined' ? window.location.pathname : '/'}</span>
          <br />
          <span className="text-red-400">bash: no such file or directory</span>
        </div>
        <p className="mt-6 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <HomeIcon className="h-4 w-4" />
            Back home
          </Link>
          <Link to="/#projects" className={buttonVariants({ variant: 'outline', size: 'md' })}>
            <ArrowLeft className="h-4 w-4" />
            View projects
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
