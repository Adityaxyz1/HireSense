import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

// ─── Glassmorphism Card ──────────────────────────────────────────────
function GlassCard({ children, className = '' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div
            className={`rounded-xl transition-all duration-500 relative ${className}`}
            style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Skill Proficiency Graph ─────────────────────────────────────────
function SkillProficiencyGraph({ skills = [] }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (skills.length === 0) return null;

    // Group by tier
    const high = skills.filter(s => s.tier === 'high');
    const mid = skills.filter(s => s.tier === 'mid');
    const low = skills.filter(s => s.tier === 'low');

    const tierConfig = {
        high: {
            label: 'High Experience',
            color: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            dotColor: '#6366f1',
            items: high,
        },
        mid: {
            label: 'Mid Experience',
            color: 'linear-gradient(90deg, #f59e0b, #f97316)',
            dotColor: '#f59e0b',
            items: mid,
        },
        low: {
            label: 'Least Used',
            color: 'linear-gradient(90deg, #8E8E93, #a1a1aa)',
            dotColor: '#8E8E93',
            items: low,
        },
    };

    const maxMentions = Math.max(...skills.map(s => s.mentions), 1);

    return (
        <GlassCard className="card-modern p-8">
            <h3 className="text-[11px] tracking-[0.25em] font-medium uppercase mb-8"
                style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
            >
                Language & Skill Proficiency
            </h3>

            {/* Tier Legend */}
            <div className="flex gap-6 mb-8">
                {Object.values(tierConfig).map((tier) => (
                    <div key={tier.label} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: tier.dotColor }} />
                        <span className="text-[10px] tracking-[0.15em] uppercase"
                            style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                        >
                            {tier.label} ({tier.items.length})
                        </span>
                    </div>
                ))}
            </div>

            {/* Horizontal Bar Chart */}
            <div className="space-y-3">
                {skills.map((skill, i) => {
                    const tierData = tierConfig[skill.tier];
                    const barWidth = (skill.mentions / maxMentions) * 100;

                    return (
                        <motion.div
                            key={skill.name}
                            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06 * i, duration: 0.5 }}
                        >
                            <div className="flex justify-between sm:justify-end sm:w-20 items-center flex-shrink-0">
                                <span className="text-xs font-medium uppercase tracking-wide"
                                    style={{ color: isDark ? '#F5F5F5' : '#000' }}
                                >
                                    {skill.name}
                                </span>
                                <span className="text-[10px] tracking-[0.1em] sm:hidden"
                                    style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                                >
                                    {skill.mentions}x found
                                </span>
                            </div>

                            <div className="flex-1 h-3 sm:h-5 rounded-full overflow-hidden relative"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                }}
                            >
                                <motion.div
                                    className="h-full rounded-full relative"
                                    style={{ background: tierData.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(barWidth, 8)}%` }}
                                    transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>

                            <span className="text-[10px] w-16 tracking-[0.1em] hidden sm:inline-block"
                                style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                            >
                                {skill.mentions}x found
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

// ─── Main Results Page ──────────────────────────────────────────────
export default function Results() {
    const location = useLocation();
    const passedResult = location.state?.result;
    const [result, setResult] = useState(passedResult || null);
    const [loading, setLoading] = useState(!passedResult);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!passedResult) {
            api.getResults().then(data => {
                if (data && data.length > 0) {
                    const latest = data[0];
                    setResult({
                        // final_score is canonically 0–100; tolerate legacy 0–1 rows.
                        match_percentage: latest.final_score == null ? 0
                            : (latest.final_score <= 1 ? latest.final_score * 100 : latest.final_score),
                        semantic_score: latest.semantic_score * 100,
                        skill_overlap: latest.skill_score * 100,
                        experience_score: latest.experience_score * 100,
                        resume_strength: latest.resume_strength,
                        risk_level: latest.risk_level,
                        skills_found: latest.skills_found || [],
                    });
                }
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [passedResult]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-32">
                <motion.p
                    className="text-[11px] uppercase tracking-[0.15em]"
                    style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    Loading results...
                </motion.p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-8 py-32">
                <AlertTriangle className="w-12 h-12 opacity-20"
                    style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                />
                <p className="text-[11px] uppercase tracking-[0.15em]"
                    style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                >
                    No analysis results yet.
                </p>
                <Link
                    to="/analyze"
                    className="text-[10px] tracking-[0.15em] uppercase px-6 py-3 transition-all duration-300 flex items-center"
                    style={{
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                        color: isDark ? '#F5F5F5' : '#000',
                        borderRadius: 999,
                        fontWeight: 600,
                    }}
                >
                    Run Analysis <ArrowRight className="w-3 h-3 ml-2 inline" />
                </Link>
            </div>
        );
    }

    const atsScore = Math.round(result.match_percentage || 0);
    const semanticScore = Math.round(result.semantic_score || 0);
    const skillScore = Math.round(result.skill_overlap || 0);
    const expScore = Math.round(result.experience_score || 0);
    const strength = result.resume_strength || 0;
    const riskLevel = result.risk_level || 'Unknown';
    const skillsFound = result.skills_found || [];

    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-8 pb-20 pt-12 px-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex justify-between items-end pb-6"
                style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}
            >
                <div>
                    <h1 className="mb-3"
                        style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}
                    >
                        Analysis Results
                    </h1>
                    <p className="flex items-center"
                        style={{ fontSize: 13, color: 'var(--text3)' }}
                    >
                        <CheckCircle className="w-3 h-3 mr-3" style={{ color: '#6366f1' }} />
                        Analysis complete — Risk Level: {riskLevel}
                    </p>
                </div>
            </motion.div>

            {/* Score Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Ring Chart */}
                <GlassCard className="card-modern hover-lift sheen p-8 flex flex-col items-center justify-center relative">
                    <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase absolute top-6 left-6"
                        style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                    >
                        Overall Match
                    </h3>

                    <div className="relative w-52 h-52 mt-8 flex flex-col justify-center items-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle
                                cx="104" cy="104" r="95" strokeWidth="2" fill="transparent"
                                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                            />
                            <motion.circle
                                cx="104" cy="104" r="95" strokeWidth="3" fill="transparent"
                                stroke="#6366f1"
                                strokeDasharray={2 * Math.PI * 95}
                                initial={{ strokeDashoffset: 2 * Math.PI * 95 }}
                                animate={{ strokeDashoffset: (2 * Math.PI * 95) - (2 * Math.PI * 95 * atsScore / 100) }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="text-5xl font-extralight" style={{ color: isDark ? '#F5F5F5' : '#000' }}>
                            {atsScore}%
                        </span>
                        <span className="text-[9px] tracking-[0.2em] uppercase mt-3"
                            style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                        >
                            {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : atsScore >= 40 ? 'Fair' : 'Needs Work'}
                        </span>
                    </div>
                </GlassCard>

                {/* Score Breakdown */}
                <GlassCard className="card-modern hover-lift p-8 flex flex-col justify-center space-y-8">
                    <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase"
                        style={{ color: isDark ? '#8E8E93' : '#6B7280' }}
                    >
                        Score Breakdown
                    </h3>

                    {[
                        { label: 'Semantic Relevance', value: semanticScore, delay: 0.2 },
                        { label: 'Skill Overlap', value: skillScore, delay: 0.4 },
                        { label: 'Experience Match', value: expScore, delay: 0.6 },
                        { label: 'Resume Strength', value: strength, delay: 0.8, suffix: '/100' },
                    ].map((item) => (
                        <div key={item.label}>
                            <div className="flex justify-between text-[10px] tracking-[0.15em] uppercase mb-3">
                                <span style={{ color: isDark ? '#8E8E93' : '#6B7280' }}>{item.label}</span>
                                <span className="font-medium" style={{ color: isDark ? '#F5F5F5' : '#000' }}>
                                    {item.value}{item.suffix || '%'}
                                </span>
                            </div>
                            <div className="w-full h-[2px] rounded-full overflow-hidden"
                                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                            >
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        background: item.value >= 70
                                            ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                            : item.value >= 40
                                                ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                                                : 'linear-gradient(90deg, #ef4444, #f87171)',
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value}%` }}
                                    transition={{ duration: 1, delay: item.delay }}
                                />
                            </div>
                        </div>
                    ))}
                </GlassCard>
            </motion.div>

            {/* ── Language & Skill Proficiency Graph ── */}
            <motion.div variants={itemVariants}>
                <SkillProficiencyGraph skills={skillsFound} />
            </motion.div>

            {/* AI Analysis Summary */}
            <motion.div variants={itemVariants}>
                <GlassCard className="card-modern sheen p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                        <AlertTriangle className="w-32 h-32" style={{ color: isDark ? '#fff' : '#000' }} />
                    </div>
                    <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase mb-6 flex items-center relative z-10"
                        style={{ color: isDark ? '#F5F5F5' : '#000' }}
                    >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center mr-4"
                            style={{ border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}
                        >
                            <AlertTriangle className="w-3 h-3" style={{ color: isDark ? '#8E8E93' : '#6B7280' }} />
                        </span>
                        AI Analysis Summary
                    </h3>
                    <p className="text-sm font-light leading-loose max-w-3xl relative z-10"
                        style={{ color: isDark ? 'rgba(245,245,245,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                        The candidate achieved a{' '}
                        <span className="font-medium" style={{ color: '#6366f1' }}>{atsScore}% overall match</span> score.
                        Semantic analysis scored{' '}
                        <span className="font-medium" style={{ color: isDark ? '#F5F5F5' : '#000' }}>{semanticScore}%</span>,
                        with{' '}
                        <span className="font-medium" style={{ color: isDark ? '#F5F5F5' : '#000' }}>{skillScore}% skill overlap</span> and{' '}
                        <span className="font-medium" style={{ color: isDark ? '#F5F5F5' : '#000' }}>{expScore}% experience match</span>.
                        {skillsFound.length > 0 && (
                            <> The resume contains{' '}
                                <span className="font-medium" style={{ color: '#6366f1' }}>
                                    {skillsFound.filter(s => s.tier === 'high').length} high-proficiency
                                </span>{' '}
                                and{' '}
                                <span className="font-medium" style={{ color: '#f59e0b' }}>
                                    {skillsFound.filter(s => s.tier === 'mid').length} mid-proficiency
                                </span>{' '}
                                skills detected across the candidate's experience.
                            </>
                        )}
                        {riskLevel === 'High' && ' Consider reviewing skill gaps before proceeding.'}
                        {riskLevel === 'Low' && ' This candidate is a strong match for the role.'}
                    </p>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
}
