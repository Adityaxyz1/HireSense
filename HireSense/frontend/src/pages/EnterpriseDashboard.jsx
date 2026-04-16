import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ui/ThemeToggle'; // Adjust path if necessary based on your folder structure

// Custom easing for executive-level motion
const premiumEase = [0.16, 1, 0.3, 1];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: premiumEase },
    },
};

const AnimatedCounter = ({ value, suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime;
        const duration = 1200;
        const target = parseInt(value, 10);

        if (isNaN(target)) return;

        const animate = (time) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            // custom cubic-bezier ease-out
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(easeProgress * target));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue}{suffix}</span>;
};

const candidates = [
    { id: '01', name: 'Alexander Sterling', role: 'VP Engineering', match: '96%', risk: 'Low', status: 'Interviewing' },
    { id: '02', name: 'Victoria Chen', role: 'Principal Architect', match: '92%', risk: 'Low', status: 'Screening' },
    { id: '03', name: 'Jonathan Hayes', role: 'Senior Developer', match: '88%', risk: 'Medium', status: 'Pending Review' },
    { id: '04', name: 'Elena Rostova', role: 'Lead Data Scientist', match: '85%', risk: 'Low', status: 'Screening' },
];

export default function EnterpriseDashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background flex flex-col overflow-x-hidden transition-colors duration-300">

            {/* 1. Thin minimal top navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: premiumEase }}
                className="w-full px-10 md:px-20 py-6 flex justify-between items-center border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300"
            >
                <div className="flex items-center space-x-4">
                    <div className="w-5 h-5 border border-foreground bg-transparent flex items-center justify-center transition-colors duration-300">
                        <div className="w-1.5 h-1.5 bg-foreground transition-colors duration-300"></div>
                    </div>
                    <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-foreground transition-colors duration-300">
                        HireSense <span className="text-text-secondary ml-1 transition-colors duration-300">Enterprise</span>
                    </span>
                </div>
                <div className="flex items-center space-x-10">
                    <button className="text-[10px] uppercase tracking-[0.2em] text-text-secondary hover:text-foreground transition-colors duration-300">
                        Portfolios
                    </button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-text-secondary hover:text-foreground transition-colors duration-300">
                        Analytics
                    </button>
                    <ThemeToggle />
                    <div className="w-10 h-10 border border-border bg-transparent overflow-hidden flex items-center justify-center cursor-pointer hover:border-foreground transition-colors duration-300">
                        <span className="text-[10px] font-medium tracking-widest text-foreground transition-colors duration-300">JD</span>
                    </div>
                </div>
            </motion.nav>

            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex-1 w-full"
            >
                {/* 2. Large hero section */}
                <motion.section variants={itemVariants} className="px-10 md:px-20 pt-32 pb-24">
                    <div className="max-w-4xl">
                        <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-secondary mb-8 transition-colors duration-300">
                            Recruitment Intelligence
                        </p>
                        <h1 className="text-6xl md:text-8xl font-light tracking-tight text-foreground mb-10 leading-none transition-colors duration-300">
                            <AnimatedCounter value="87" suffix="%" /> Match
                            <br />Confidence
                        </h1>
                        <p className="text-lg md:text-xl text-text-secondary font-light max-w-2xl leading-relaxed transition-colors duration-300">
                            Institutional grade semantic analysis confirms strong alignment with target profile parameters. Risk metrics remain strictly within acceptable thresholds.
                        </p>

                        <div className="mt-20 flex items-center space-x-6">
                            <button className="px-10 py-5 border border-border text-foreground text-[10px] uppercase tracking-[0.2em] transition-all duration-300 hover:bg-foreground hover:text-background">
                                Deploy Offer
                            </button>
                            <button className="px-10 py-5 border border-transparent text-text-secondary hover:text-foreground hover:border-border text-[10px] uppercase tracking-[0.2em] transition-all duration-300">
                                View Full Audit
                            </button>
                        </div>

                        <div className="mt-28 w-full h-[0.5px] bg-border transition-colors duration-300"></div>
                    </div>
                </motion.section>

                {/* 3. Horizontal KPI strip */}
                <motion.section variants={itemVariants} className="px-10 md:px-20 py-16 border-b border-border transition-colors duration-300">
                    <div className="flex flex-col md:flex-row md:space-x-48 space-y-16 md:space-y-0">
                        <div className="group">
                            <p className="text-[9px] uppercase font-medium tracking-[0.3em] text-text-secondary mb-6 group-hover:text-foreground transition-colors duration-300">Resume Strength</p>
                            <p className="text-5xl font-light text-foreground transition-colors duration-300"><AnimatedCounter value="94" /> <span className="text-2xl text-text-secondary">/ 100</span></p>
                        </div>
                        <div className="group">
                            <p className="text-[9px] uppercase font-medium tracking-[0.3em] text-text-secondary mb-6 group-hover:text-foreground transition-colors duration-300">Skill Overlap</p>
                            <p className="text-5xl font-light text-foreground transition-colors duration-300"><AnimatedCounter value="91" suffix="%" /></p>
                        </div>
                        <div className="group">
                            <p className="text-[9px] uppercase font-medium tracking-[0.3em] text-text-secondary mb-6 group-hover:text-foreground transition-colors duration-300">Risk Flags</p>
                            <p className="text-5xl font-light text-foreground transition-colors duration-300"><AnimatedCounter value="0" /></p>
                        </div>
                    </div>
                </motion.section>

                {/* 4. Institutional ranked candidates table */}
                <motion.section variants={itemVariants} className="px-10 md:px-20 py-24">
                    <div className="flex justify-between items-end mb-16">
                        <h2 className="text-2xl font-light text-foreground tracking-wide transition-colors duration-300">Candidate Index</h2>
                        <button className="text-[10px] uppercase tracking-[0.2em] text-text-secondary hover:text-foreground border border-border px-6 py-3 transition-colors duration-300">
                            Export CSV
                        </button>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium w-16 transition-colors duration-300">Rank</th>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium transition-colors duration-300">Candidate</th>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium transition-colors duration-300">Target Role</th>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium transition-colors duration-300">Status</th>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium text-right transition-colors duration-300">Risk</th>
                                    <th className="pb-8 border-b border-border text-[9px] uppercase tracking-[0.3em] text-foreground font-medium text-right transition-colors duration-300">Match</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((candidate, index) => (
                                    <motion.tr
                                        key={candidate.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1, ease: premiumEase }}
                                        whileHover={{ backgroundColor: 'var(--border-color)', opacity: 0.7 }}
                                        className="border-b border-border transition-colors duration-300 cursor-pointer group"
                                    >
                                        <td className="py-8 text-[11px] font-medium text-text-secondary pl-2 transition-colors duration-300 group-hover:text-foreground">{candidate.id}</td>
                                        <td className="py-8 text-sm font-light text-foreground tracking-wide transition-colors duration-300">{candidate.name}</td>
                                        <td className="py-8 text-[13px] font-light text-text-secondary transition-colors duration-300">{candidate.role}</td>
                                        <td className="py-8 text-[13px] font-light text-text-secondary transition-colors duration-300">{candidate.status}</td>
                                        <td className="py-8 text-[13px] font-light text-text-secondary text-right transition-colors duration-300">{candidate.risk}</td>
                                        <td className="py-8 text-sm font-medium text-foreground text-right pr-2 transition-colors duration-300">{candidate.match}</td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.section>
            </motion.main>
        </div>
    );
}
