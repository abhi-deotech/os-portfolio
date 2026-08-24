import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, ExternalLink, Layers, Search, Filter,
  ArrowRight, Sparkles, Hammer
} from 'lucide-react';
import useOSStore from '../store/osStore';
import { useVizPalette } from '../theme/useColorway';
import { PROJECTS, PROJECT_CATEGORIES, PROJECT_TOTALS } from '../config/projects';

const GithubIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

/**
 * Peer cards that have to be told apart is exactly the categorical case, so a card's identity is
 * its slot in the active colorway's own series rather than a fixed hex. The six hexes that used to
 * live on the records were the retired legacy-neon palette, which meant every card rendered the same
 * six colours on all sixteen colorways — including the ten light ones, where #9effc8 measures under
 * 1.5:1 on the plane. Position is taken in PROJECTS, not in the filtered list, so filtering does not
 * shuffle the colours; `cat` ships five entries, which the registry is sized to match exactly.
 */
const seriesColor = (viz, i) => (viz.cat?.length ? viz.cat[i % viz.cat.length] : null);

const LINK_CLASS =
  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50';

const ProjectCard = ({ project, series }) => {
  const openBrowser = useOSStore((state) => state.openBrowser);
  const glyph = series || 'var(--sdl-accent)';
  const wash = series ? `${series}15` : 'var(--sdl-soft)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8 }}
      className="p-6 rounded-[2.5rem] bg-veil/[0.03] border border-hairline/5 hover:border-os-primary/40 transition-all group relative overflow-hidden flex flex-col h-full shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-veil/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-os-primary/5 blur-[80px] rounded-full group-hover:bg-os-primary/10 transition-all" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="p-4 rounded-2xl flex items-center justify-center border border-hairline/5 shadow-xl" style={{ backgroundColor: wash }}>
          <project.icon size={28} style={{ color: glyph }} />
        </div>
        <div className="flex items-center gap-4">
           {project.featured && (
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-os-primary/10 border border-os-primary/20 text-[10px] font-black uppercase tracking-widest text-os-primary shadow-[0_0_15px_rgb(var(--os-primary-rgb)_/_0.2)]">
                <Sparkles size={10} />
                Featured
             </div>
           )}
           {/* Was a star count. There were no stars — the number was written by hand, and so were
               the other five. A date range read off the repository's own git log can be checked. */}
           <div className="text-[10px] font-bold text-os-onSurfaceVariant/40 uppercase tracking-widest whitespace-nowrap">
              {project.period}
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        <h3 className="text-2xl font-black text-sdl-ink group-hover:text-os-primary transition-colors tracking-tight">
          {project.title}
        </h3>
        <p className="text-sm text-os-onSurfaceVariant leading-relaxed font-medium line-clamp-3">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {project.tags.map(tag => (
            <span key={tag} className="px-3 py-1 rounded-lg bg-veil/5 border border-hairline/10 text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/*
        Footer links render only where they resolve. Every card used to get both buttons
        unconditionally, which was fine while the six projects were invented and their URLs
        therefore always "existed". Against real work the two cases diverge: the client platforms
        are live but their repositories are private under an org a visitor cannot see, and the
        personal repositories are public but have nothing deployed. A Code button that 404s costs
        more trust than the missing button does, so the surviving button takes the whole row.
      */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-hairline/5">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className={`${LINK_CLASS} flex-1 bg-veil/5 border border-hairline/10 hover:bg-veil/10`}
          >
            <GithubIcon size={14} />
            Code
          </a>
        )}
        {project.demo && (
          // Opens INSIDE the OS — Flow-Net, not a new tab. A portfolio that simulates a desktop
          // should be able to show you a shipped product without leaving the desktop.
          <button
            type="button"
            onClick={() => openBrowser(project.demo)}
            title={`Open ${project.title} in Flow-Net`}
            className={`${LINK_CLASS} flex-1 bg-os-primary text-sdl-onAccent hover:scale-105 shadow-lg shadow-os-primary/20`}
          >
            <ExternalLink size={14} />
            Live Demo
          </button>
        )}
        {!project.github && !project.demo && (
          <div className={`${LINK_CLASS} flex-1 bg-veil/5 border border-hairline/10 text-os-onSurfaceVariant/50 cursor-default`}>
            <Hammer size={14} />
            {project.status || 'Unreleased'}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Projects = () => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const viz = useVizPalette();

  const categories = PROJECT_CATEGORIES;

  const filteredProjects = PROJECTS.filter(p => {
    const matchesFilter = filter === 'All' || p.category === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-full w-full bg-sdl-plane/60 text-os-onSurface overflow-y-auto scrollbar-hide">
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 text-os-primary mb-2">
                 <Code size={24} />
                 <span className="text-xs font-black uppercase tracking-[0.4em]">Development Log</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-sdl-ink underline decoration-os-primary/30 underline-offset-8">
                FEATURED <span className="text-os-primary">PROJECTS</span>
              </h1>
              <p className="text-lg text-os-onSurfaceVariant max-w-xl font-medium">
                Platforms I&apos;ve shipped and systems I&apos;m building — from booking and B2B commerce
                running in production to the desktop you&apos;re reading this on. Live ones open right
                here, in Flow-Net.
              </p>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-os-onSurfaceVariant group-focus-within:text-os-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter by tech or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Filter projects by tech or name"
                  className="pl-12 pr-6 py-4 bg-veil/5 border border-hairline/10 rounded-2xl text-sm text-sdl-ink placeholder:text-os-onSurfaceVariant/50 focus:outline-none focus:border-os-primary/40 focus:bg-veil/10 focus-visible:ring-2 focus-visible:ring-os-primary/50 transition-all w-full md:w-64"
                />
              </div>
           </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
           <div className="flex items-center gap-2 p-1.5 bg-veil/5 rounded-2xl border border-hairline/10 backdrop-blur-md">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  aria-pressed={filter === cat}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${
                    filter === cat
                      ? 'bg-os-primary text-sdl-onAccent shadow-lg shadow-os-primary/20'
                      : 'text-os-onSurfaceVariant hover:bg-veil/5 hover:text-sdl-ink'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
           <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-os-onSurfaceVariant/30 uppercase tracking-[0.2em] whitespace-nowrap">
              <Filter size={12} />
              Refining nodes
           </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <AnimatePresence mode="popLayout">
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  series={seriesColor(viz, PROJECTS.indexOf(project))}
                />
              ))}
           </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-96 flex flex-col items-center justify-center text-center space-y-4"
          >
             <Layers size={64} className="text-os-onSurfaceVariant/20" />
             <h3 className="text-xl font-bold text-os-onSurface">No matching nodes found</h3>
             <p className="text-sm text-os-onSurfaceVariant max-w-xs mx-auto italic">Try adjusting your filters to explore other parts of the technical log.</p>
             <button onClick={() => {setFilter('All'); setSearch('');}} className="text-os-primary font-black uppercase tracking-widest text-[10px] mt-4 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50">Reset Search</button>
          </motion.div>
        )}

        {/* Footer Stats */}
        <div className="pt-24 pb-12 flex flex-col md:flex-row items-center justify-between border-t border-hairline/5 gap-8">
           {/*
             These read "Total Deployments 24 / GitHub Commits 1.2K+ / Happy Clients 15" — three
             figures with no source behind them, which is also why they could never go stale.
             PROJECT_TOTALS derives from the registry, so the counters cannot disagree with the
             cards directly above them.
           */}
           <div className="flex gap-12">
              <div>
                 <p className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest mb-1">Live in Production</p>
                 <p className="text-3xl font-black text-sdl-ink">{PROJECT_TOTALS.live}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest mb-1">Open Source</p>
                 <p className="text-3xl font-black text-os-secondary">{PROJECT_TOTALS.openSource}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest mb-1">Technologies</p>
                 <p className="text-3xl font-black text-os-tertiary">{PROJECT_TOTALS.technologies}</p>
              </div>
           </div>
           
           <button 
            onClick={() => useOSStore.getState().openWindow('terminal')}
            className="flex items-center gap-3 px-8 py-4 bg-veil/5 border border-hairline/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-os-primary hover:border-os-primary hover:text-sdl-onAccent transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
           >
              Explore via Terminal <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Projects;
