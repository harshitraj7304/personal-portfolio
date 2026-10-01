// Skills grouped into meaningful categories (no fabricated proficiency %).
// `icon` is a lucide-react icon name resolved in the Skills component.
// `color` is a brand-ish accent used for the badge dot / hover glow.

export const skillGroups = [
  {
    id: 'languages',
    label: 'Languages',
    icon: 'Code2',
    accent: '#f59e0b',
    skills: [
      { name: 'Java', icon: 'Coffee', color: '#e76f00' },
      { name: 'JavaScript (ES6+)', icon: 'Braces', color: '#f7df1e' },
      { name: 'SQL', icon: 'Database', color: '#e38c00' },
      { name: 'HTML5', icon: 'Code', color: '#e34f26' },
      { name: 'CSS3', icon: 'Palette', color: '#1572b6' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: 'MonitorSmartphone',
    accent: '#38bdf8',
    skills: [
      { name: 'React.js', icon: 'Atom', color: '#61dafb' },
      { name: 'React Router', icon: 'Route', color: '#f44250' },
      { name: 'Tailwind CSS', icon: 'Wind', color: '#38bdf8' },
      { name: 'Vite', icon: 'Zap', color: '#bd34fe' },
      { name: 'shadcn/ui', icon: 'Component', color: '#e7e7f0' },
      { name: 'Responsive UI', icon: 'LayoutDashboard', color: '#a78bfa' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    icon: 'Server',
    accent: '#34d399',
    skills: [
      { name: 'Node.js', icon: 'Hexagon', color: '#5fa04e' },
      { name: 'Express.js', icon: 'Network', color: '#9ca3af' },
      { name: 'REST APIs', icon: 'Webhook', color: '#22d3ee' },
      { name: 'Java Servlets', icon: 'FileCode', color: '#007396' },
      { name: 'JSP', icon: 'FileCode2', color: '#0a7ea4' },
      { name: 'MVC Architecture', icon: 'Layers', color: '#a78bfa' },
    ],
  },
  {
    id: 'databases',
    label: 'Databases',
    icon: 'Database',
    accent: '#22c55e',
    skills: [
      { name: 'MongoDB', icon: 'Leaf', color: '#47a248' },
      { name: 'MySQL', icon: 'Database', color: '#4479a1' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Platforms',
    icon: 'Wrench',
    accent: '#fb7185',
    skills: [
      { name: 'Git', icon: 'GitBranch', color: '#f05032' },
      { name: 'GitHub', icon: 'Github', color: '#e7e7f0' },
      { name: 'VS Code', icon: 'Code2', color: '#007acc' },
      { name: 'Postman', icon: 'Send', color: '#ff6c37' },
      { name: 'Vercel', icon: 'Triangle', color: '#e7e7f0' },
      { name: 'Netlify', icon: 'Globe', color: '#00c7b7' },
      { name: 'Supabase', icon: 'Zap', color: '#3ecf8e' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Concepts',
    icon: 'Sparkles',
    accent: '#a78bfa',
    skills: [
      { name: 'Generative AI', icon: 'Sparkles', color: '#a78bfa' },
      { name: 'AI API Integration', icon: 'Cpu', color: '#22d3ee' },
      { name: 'JWT Authentication', icon: 'ShieldCheck', color: '#fb015b' },
      { name: 'CRUD Operations', icon: 'RefreshCw', color: '#60a5fa' },
      { name: 'Oracle Cloud (OCI)', icon: 'Cloud', color: '#f80000' },
    ],
  },
]
