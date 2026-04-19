import React, { useState, useEffect } from 'react';
import { 
  Star, GitFork, Users, ExternalLink, RefreshCw, 
  Calendar, BookOpen, User as UserIcon, Info,
  Briefcase, MessageSquare, Award, MapPin, Building2, 
  GraduationCap, BadgeCheck, ThumbsUp, MessageCircle,
  Share2, Clock, MoreHorizontal
} from 'lucide-react';
const GithubIcon = ({ size = 20, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const LinkedinIcon = ({ size = 20, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

import useOSStore from '../store/osStore';
import { motion } from 'framer-motion';

const SocialWidget = () => {
  const { unlockAchievement } = useOSStore();
  const [activeTab, setActiveTab] = useState('github');
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // LinkedIn data state (static, no loading needed)
  const [linkedinData, setLinkedinData] = useState(null);
  
  const githubUsername = 'abhi-deotech';
  const linkedinUsername = 'abhimanyu-saxena-b656a4183';

  useEffect(() => {
    const fetchGithubData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first
        const cacheKey = `github_data_${githubUsername}`;
        const errorKey = `github_error_${githubUsername}`;
        const cached = sessionStorage.getItem(cacheKey);
        const cachedError = sessionStorage.getItem(errorKey);

        if (cachedError) {
          const { message, timestamp } = JSON.parse(cachedError);
          const isExpired = Date.now() - timestamp > 60000; // 1 min lock for errors
          if (!isExpired) {
             setError(message);
             setLoading(false);
             return;
          }
        }

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > 10 * 60 * 1000; // 10 min cache
          if (!isExpired) {
            setGithubData(data);
            setLoading(false);
            return;
          }
        }
        
        // Clear previous error if we're retrying
        sessionStorage.removeItem(errorKey);
        
        // Fetch User Data
        const userRes = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (!userRes.ok) {
          if (userRes.status === 403) throw new Error('GitHub API rate limit exceeded. Please try again later.');
          throw new Error('Failed to fetch GitHub profile');
        }
        const userData = await userRes.json();

        // Fetch Repos (Top by stars or just recent)
        const reposRes = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`);
        const reposData = await reposRes.json();
        
        const totalStars = reposData.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);

        // Fetch Events separately with proper error handling
        let recentEvents = [];
        try {
          const eventsRes = await fetch(`https://api.github.com/users/${githubUsername}/events/public?per_page=5`);
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            recentEvents = eventsData.filter(e => e.type === 'PushEvent' || e.type === 'WatchEvent').slice(0, 3);
          }
        } catch (e) {
          console.warn('Failed to fetch GitHub events', e);
        }

        const finalData = {
          username: userData.login,
          avatar: userData.avatar_url,
          repos: userData.public_repos,
          followers: userData.followers,
          stars: totalStars,
          lastPush: userData.updated_at ? new Date(userData.updated_at).toLocaleDateString() : 'N/A',
          bio: userData.bio,
          topRepo: reposData[0]?.name || 'No repositories found',
          recentEvents
        };

        // Save to cache
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: finalData,
          timestamp: Date.now()
        }));

        setGithubData(finalData);
      } catch (err) {
        console.error(err);
        const errorKey = `github_error_${githubUsername}`;
        
        // Cache the error for 1 minute to avoid loops
        sessionStorage.setItem(errorKey, JSON.stringify({
          message: err.message,
          timestamp: Date.now()
        }));
        
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGithubData();
  }, [githubUsername]);

  // Simple load - no API needed since LinkedIn blocks scraping
  useEffect(() => {
    if (activeTab === 'linkedin') {
      const LINKEDIN_PROFILE = {
        name: 'Abhimanyu Saxena',
        headline: 'Software Engineer | Team Lead',
        location: 'Noida, India',
        connections: '500+',
        avatar: `https://github.com/${githubUsername}.png`,
        company: 'Deotechsolutions',
        title: 'Team Lead',
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'MongoDB']
      };
      setLinkedinData(LINKEDIN_PROFILE);
    }
  }, [activeTab, githubUsername]);

  const renderGithub = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12 opacity-50">
          <RefreshCw className="text-os-primary animate-spin mb-4" size={40} />
          <p className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">Syncing GitHub Pulse...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
          <p className="text-red-500 text-sm font-bold mb-3">Sync Failed</p>
          <p className="text-white/40 text-xs leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 text-xs font-bold transition-all"
          >
            Retry Sync
          </button>
        </div>
      );
    }

    if (!githubData) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full gap-4"
      >
        <div className="flex items-center gap-5 py-2">
          <div className="relative">
            <img src={githubData.avatar} alt="Avatar" className="w-16 h-16 rounded-2xl border-2 border-os-primary/20 pointer-events-none p-0.5" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black border border-white/10 rounded-lg flex items-center justify-center">
               <GithubIcon size={12} className="text-os-primary" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-white tracking-tight">@{githubData.username}</span>
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1 truncate max-w-[180px]">{githubData.bio || 'Developer'}</span>
          </div>
          <a 
            href={`https://github.com/${githubUsername}`} 
            target="_blank" 
            rel="noreferrer" 
            onClick={() => unlockAchievement('socialite')}
            className="ml-auto p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-os-primary hover:bg-os-primary/10 transition-all"
          >
            <ExternalLink size={18} />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Star, val: githubData.stars, label: 'Stars', color: 'text-yellow-400' },
            { icon: GitFork, val: githubData.repos, label: 'Repos', color: 'text-os-primary' },
            { icon: Users, val: githubData.followers, label: 'Fans', color: 'text-blue-400' }
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 hover:bg-white/[0.05] transition-colors">
              <item.icon size={18} className={item.color} />
              <span className="text-sm font-black text-white">{item.val}</span>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
           <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-white/30 uppercase tracking-[0.15em]">Contribution Matrix</span>
              <span className="text-[10px] font-bold text-os-primary/60 uppercase tracking-widest font-mono">6 Months</span>
           </div>
           <div className="p-4 sm:p-5 bg-white rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3/1' }}>
                  <img
                    src={`https://ghchart.rshah.org/22c55e/${githubUsername}`}
                    alt="GitHub Contributions"
                    className="absolute inset-0 h-full w-auto max-w-none object-cover object-right"
                    style={{ width: '200%', marginLeft: '-100%' }}
                  />              </div>
           </div>
        </div>

        {/* Recent Activity List */}
        <div className="space-y-3 overflow-hidden">
           <span className="text-xs font-black text-white/30 uppercase tracking-[0.15em] px-1">Recent Pulses</span>
           <div className="flex flex-col gap-2">
              {githubData.recentEvents?.map((event, i) => (
                 <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5 text-sm">
                    <div className={`w-2 h-2 rounded-full ${event.type === 'PushEvent' ? 'bg-os-primary shadow-[0_0_8px_var(--os-primary-rgb)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`} />
                    <span className="text-white/50 font-bold">{event.type === 'PushEvent' ? 'Pushed to' : 'Starred'}</span>
                    <span className="text-white font-black truncate max-w-[180px]">{event.repo.name.split('/')[1]}</span>
                 </div>
              ))}
              {(!githubData.recentEvents || githubData.recentEvents.length === 0) && (
                 <p className="text-sm text-white/30 italic px-2">No recent pulses detected...</p>
              )}
           </div>
        </div>
      </motion.div>
    );
  };

  const renderLinkedin = () => {
    if (!linkedinData) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full"
      >
        {/* Compact Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-white/5">
          <div className="relative flex-shrink-0">
            <img 
              src={linkedinData.avatar} 
              alt="Avatar" 
              className="w-16 h-16 rounded-2xl border-2 border-[#0077b5]/30 pointer-events-none"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0077b5] rounded-full flex items-center justify-center">
              <BadgeCheck size={12} className="text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white tracking-tight">{linkedinData.name}</h2>
            <p className="text-sm text-white/60 mt-0.5">{linkedinData.headline}</p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-white/40">
              <MapPin size={12} />
              <span>{linkedinData.location}</span>
              <span>·</span>
              <span>{linkedinData.connections} connections</span>
            </div>
          </div>
          
          <a 
            href={`https://linkedin.com/in/${linkedinUsername}`} 
            target="_blank" 
            rel="noreferrer"
            onClick={() => unlockAchievement('socialite')}
            className="flex-shrink-0 p-2 rounded-lg bg-[#0077b5] text-white hover:bg-[#008de4] transition-all"
          >
            <LinkedinIcon size={18} />
          </a>
        </div>

        {/* Skills */}
        <div className="py-4 border-b border-white/5">
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Top Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {linkedinData.skills?.map((skill, i) => (
              <span key={i} className="px-2 py-1 bg-white/5 rounded-md text-xs text-white/70">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Current Role */}
        <div className="py-4">
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Current</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0077b5]/20 to-[#0077b5]/5 flex items-center justify-center border border-[#0077b5]/20">
              <Briefcase size={18} className="text-[#70b5f9]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{linkedinData.title}</p>
              <p className="text-xs text-[#70b5f9]">{linkedinData.company}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full p-5 md:p-6 bg-gradient-to-br from-[#121212] to-[#080808] rounded-3xl border border-white/5 overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full transition-all duration-500 ${activeTab === 'github' ? 'bg-os-primary/5' : 'bg-[#0077b5]/10'}`} />
      
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] rounded-2xl border border-white/5 mb-5 relative z-10 w-fit mx-auto">
        <button
          onClick={() => setActiveTab('github')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'github' 
              ? 'bg-os-primary text-black shadow-lg shadow-os-primary/20' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <GithubIcon size={16} />
          GitHub
        </button>
        <button
          onClick={() => setActiveTab('linkedin')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'linkedin' 
              ? 'bg-[#0077b5] text-white shadow-lg shadow-[#0077b5]/20' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <LinkedinIcon size={16} />
          LinkedIn
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-1">
        {activeTab === 'github' ? renderGithub() : renderLinkedin()}
      </div>

      {/* Footer Branding */}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-black text-white/20 uppercase tracking-[0.2em]">
        <span>Networking Hub</span>
        <span>v1.2.0</span>
      </div>
    </div>
  );
};

export default SocialWidget;
