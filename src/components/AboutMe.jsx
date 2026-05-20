import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, Briefcase, GraduationCap, Code, Award, Calendar, Globe, Languages } from 'lucide-react';
import useOSStore from '../store/osStore';

const GithubIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const LinkedinIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const TwitterIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const AboutMe = () => {
  const socialLinks = [
    { icon: GithubIcon, label: 'GitHub', href: 'https://github.com/abhi-deotech', color: '#ffffff' },
    { icon: LinkedinIcon, label: 'LinkedIn', href: 'https://linkedin.com/in/abhimanyu-saxena-b656a4183', color: '#0077b5' },
    { icon: TwitterIcon, label: 'Twitter', href: 'https://twitter.com/abhi_deotech', color: '#1da1f2' },
    { icon: Mail, label: 'Email', href: 'mailto:contact@abhi.dev', color: '#ea4335' }
  ];

  return (
    <div className="h-full w-full bg-[#060e20]/60 text-os-onSurface overflow-y-auto scrollbar-hide">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] bg-gradient-to-br from-os-primary to-os-secondary p-1 shadow-2xl shadow-os-primary/20">
              <div className="w-full h-full rounded-[2.8rem] bg-[#091328] flex items-center justify-center overflow-hidden">
                <User size={80} className="text-os-primary/40" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-green-500 border-4 border-[#091328] flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            </div>
          </motion.div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2 underline decoration-os-primary/30 underline-offset-8">
                ABHIMANYU <span className="text-os-primary">SAXENA</span>
              </h1>
              <p className="text-xl md:text-2xl font-bold text-os-onSurfaceVariant">
                Software Engineer | Team Lead
              </p>
            </motion.div>

            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center md:justify-start gap-4"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">
                <MapPin size={16} className="text-os-secondary" />
                <span>Kota, Rajasthan, India</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">
                <Briefcase size={16} className="text-os-tertiary" />
                <span>Team Lead @ Deotechsolutions</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center md:justify-start gap-4 pt-4"
            >
              {socialLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-os-primary/20 hover:border-os-primary/40 hover:scale-110 transition-all group"
                  title={link.label}
                >
                  <link.icon size={20} className="group-hover:text-white transition-colors" />
                </a>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bio Section */}
        <motion.section 
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-os-primary">Objective</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-os-primary/30 to-transparent" />
          </div>
          <p className="text-lg md:text-xl text-os-onSurfaceVariant leading-relaxed font-medium">
            Passionate and versatile Software Engineer with a strong background in computer science. 
            Targeting opportunities in Software Development, exploring roles in Electronics, IoT, 
            and other technology domains. Proficient full stack developer with nearly 3 years of 
            industry experience in end-to-end application development, deployment, and maintenance.
          </p>
        </motion.section>

        {/* Experience & Education Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-6 p-8 rounded-3xl bg-white/[0.03] border border-white/5 shadow-xl"
          >
            <div className="flex items-center gap-3 text-os-secondary">
              <Briefcase size={24} />
              <h3 className="text-xl font-black uppercase tracking-widest">Experience</h3>
            </div>
            <div className="space-y-6">
              {[
                { title: 'Software Engineer | Team Lead', company: 'Deotechsolutions', year: 'July 2025 - Present', desc: 'Led development teams in building scalable web applications and established coding standards.' },
                { title: 'Software Engineer', company: 'LendFoundry', year: 'Sep 2021 - July 2024', desc: 'Developed and maintained web-based applications using modern JavaScript frameworks.' }
              ].map((job, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-os-secondary/20 group hover:border-os-secondary transition-colors">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-os-secondary shadow-[0_0_10px_rgba(0,210,253,0.5)] scale-0 group-hover:scale-100 transition-transform" />
                  <h4 className="font-bold text-white">{job.title}</h4>
                  <p className="text-sm text-os-onSurfaceVariant font-medium">{job.company}</p>
                  <p className="text-[10px] text-os-onSurfaceVariant/50 font-black tracking-widest mt-1 uppercase">{job.year}</p>
                  <p className="text-xs text-os-onSurfaceVariant/70 mt-2 line-clamp-2">{job.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-6 p-8 rounded-3xl bg-white/[0.03] border border-white/5 shadow-xl"
          >
            <div className="flex items-center gap-3 text-os-tertiary">
              <GraduationCap size={24} />
              <h3 className="text-xl font-black uppercase tracking-widest">Education</h3>
            </div>
            <div className="space-y-6">
              {[
                { title: 'B.Tech in Computer Science', school: 'SRM Institute of Science & Technology', year: '2020' },
                { title: 'Full Stack Web Development', school: 'Udacity Nanodegree', year: 'Jan 2021' }
              ].map((edu, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-os-tertiary/20 group hover:border-os-tertiary transition-colors">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-os-tertiary shadow-[0_0_10px_rgba(0,245,160,0.5)] scale-0 group-hover:scale-100 transition-transform" />
                  <h4 className="font-bold text-white">{edu.title}</h4>
                  <p className="text-sm text-os-onSurfaceVariant font-medium">{edu.school}</p>
                  <p className="text-[10px] text-os-onSurfaceVariant/50 font-black tracking-widest mt-1 uppercase">{edu.year}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Technical Arsenal */}
        <motion.section 
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4">
             <div className="h-px flex-1 bg-gradient-to-l from-os-secondary/30 to-transparent" />
             <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-os-secondary">Technical Arsenal</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Languages', skills: ['JavaScript', 'Golang', 'C++', 'Python'] },
              { label: 'Frontend', skills: ['React.js', 'Vite', 'Tailwind', 'Framer Motion'] },
              { label: 'Tools & IoT', skills: ['Docker', 'Git', 'IoT', 'Linux'] },
              { label: 'Competencies', skills: ['Requirement Analysis', 'API Integration', 'Full Stack', 'Agile'] }
            ].map((cat, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-os-secondary mb-4">{cat.label}</h4>
                <ul className="space-y-2">
                  {cat.skills.map((skill, sIdx) => (
                    <li key={sIdx} className="flex items-center gap-2 text-xs font-bold text-os-onSurfaceVariant">
                      <div className="w-1.5 h-1.5 rounded-full bg-os-secondary/50" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Details & Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-6"
            >
                <div className="flex items-center gap-3 text-os-primary">
                    <Award size={24} />
                    <h3 className="text-xl font-black uppercase tracking-widest">Achievements</h3>
                </div>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-os-primary mt-1.5 shrink-0" />
                        <p className="text-sm text-os-onSurfaceVariant">Received <strong>SPOT Award</strong> at Lend Foundry for outstanding project delivery and collaboration.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-os-primary mt-1.5 shrink-0" />
                        <p className="text-sm text-os-onSurfaceVariant">Conducted multiple peer training and mentoring sessions during onboarding cycles.</p>
                    </li>
                </ul>
            </motion.div>

            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-6"
            >
                <div className="flex items-center gap-3 text-os-tertiary">
                    <Languages size={24} />
                    <h3 className="text-xl font-black uppercase tracking-widest">System Info</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">D.O.B</p>
                        <p className="text-sm font-bold text-white">17 Feb 1998</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Languages</p>
                        <p className="text-sm font-bold text-white">English, Hindi</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Location</p>
                        <p className="text-sm font-bold text-white">1-C-27 S.F.S Talwandi, Kota, RJ</p>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Footer CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center pt-12 pb-24"
        >
          <p className="text-os-onSurfaceVariant font-bold uppercase tracking-widest text-xs mb-8">Ready to sync workflows?</p>
          <button 
            onClick={() => useOSStore.getState().openWindow('mail')}
            className="px-12 py-5 bg-gradient-to-r from-os-primary to-os-secondary text-[#060e20] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            Initiate Contact
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutMe;
