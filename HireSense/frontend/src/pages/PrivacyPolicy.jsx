import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Database, Brain, Cpu, CheckCircle } from 'lucide-react';
import TwirlBackground from '../components/ui/TwirlBackground';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--text)',
            position: 'relative',
            overflow: 'hidden',
            padding: '60px 20px',
            fontFamily: 'var(--font)',
        }}>
            {/* Background effects */}
            <TwirlBackground />

            {/* Content Container */}
            <div style={{
                maxWidth: 800,
                margin: '0 auto',
                position: 'relative',
                zIndex: 10,
            }}>
                {/* Header Navigation */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 40,
                    }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="nb"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            background: 'var(--surface)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 10,
                            color: 'var(--text2)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border2)';
                            e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.color = 'var(--text2)';
                        }}
                    >
                        <ArrowLeft size={16} />
                        <span>Go Back</span>
                    </button>

                    {/* Logo */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        height: 32,
                        border: '1.5px solid var(--border2)',
                        borderRadius: 6,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: 'var(--logo-bg)',
                            padding: '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            <span style={{
                                fontWeight: 800,
                                fontSize: 12,
                                color: 'var(--logo-fg)',
                                letterSpacing: '.14em',
                            }}>HIRE</span>
                        </div>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            borderLeft: '1.5px solid var(--border)',
                        }}>
                            <span style={{
                                fontWeight: 800,
                                fontSize: 12,
                                color: 'var(--text)',
                                letterSpacing: '.14em',
                            }}>SENSE</span>
                        </div>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    style={{
                        textAlign: 'center',
                        marginBottom: 48,
                    }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 54,
                        height: 54,
                        borderRadius: 14,
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1.5px solid rgba(99, 102, 241, 0.2)',
                        color: '#6366f1',
                        marginBottom: 20,
                    }}>
                        <Shield size={26} />
                    </div>
                    <h1 style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: 12,
                        background: 'linear-gradient(135deg, var(--text) 30%, var(--text2) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>Privacy Policy</h1>
                    <p style={{
                        fontSize: 14,
                        color: 'var(--text2)',
                        letterSpacing: '0.02em',
                    }}>Last updated: May 21, 2026</p>
                </motion.div>

                {/* Core content block */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.7 }}
                    style={{
                        background: 'var(--surface)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 20,
                        padding: '40px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 36,
                    }}
                >
                    {/* Introduction */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>1. Introduction</h2>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            At <strong>HireSense</strong>, we take the confidentiality and privacy of recruiters, hiring managers, and candidates seriously. 
                            This Privacy Policy details how we collect, process, secure, and share personal data when you utilize our AI-driven talent acquisition 
                            suite, ATS checker, and profile analysis platforms.
                        </p>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            By using HireSense, you consent to the processing practices described herein. If you do not agree with these practices, please 
                            discontinue your use of the website and platform services immediately.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Database size={18} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>2. Information We Collect</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            To deliver premium candidate-sourcing algorithms and ATS checks, we collect three primary categories of data:
                        </p>
                        <ul style={{
                            paddingLeft: 20,
                            color: 'var(--text2)',
                            fontSize: 13,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            lineHeight: '1.5'
                        }}>
                            <li>
                                <strong>User Account Information:</strong> Email addresses, display names, passwords, profile pictures, and recruiter metadata provided during sign-up or profile customization.
                            </li>
                            <li>
                                <strong>Candidate Data:</strong> Resumes, CVs, cover letters, portfolios, professional credentials, work history, skill arrays, and education records uploaded by recruiters or parsed through files.
                            </li>
                            <li>
                                <strong>Usage Metrics & System logs:</strong> Browser characteristics, IP addresses, session duration, click rates, search queries within the Finder, and tool configuration settings.
                            </li>
                        </ul>
                    </section>

                    {/* AI Processing and Algorithms */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Brain size={18} style={{ color: '#818cf8' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>3. AI Processing & Recommendation Systems</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            HireSense is an artificial intelligence-supported platform. We utilize advanced machine learning algorithms, natural language 
                            processing (NLP), and large language models (LLMs) to perform:
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                            marginTop: 8,
                        }}>
                            <div style={{
                                background: 'var(--bg2)',
                                border: '1.5px solid var(--border)',
                                padding: 16,
                                borderRadius: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Cpu size={14} style={{ color: '#6366f1' }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>ATS Check & Scoring</span>
                                </div>
                                <p style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: '1.5' }}>
                                    Evaluating resumes against specific job descriptions to compute matching scores, keyword coverage metrics, and formatting checks.
                                </p>
                            </div>
                            <div style={{
                                background: 'var(--bg2)',
                                border: '1.5px solid var(--border)',
                                padding: 16,
                                borderRadius: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Eye size={14} style={{ color: '#22c55e' }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>AI Finder & Sourcing</span>
                                </div>
                                <p style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: '1.5' }}>
                                    Applying semantic search and profile indexing algorithms to isolate matches from the uploaded talent pool database.
                                </p>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5, marginTop: 8 }}>
                            <strong>Decision Support Disclaimer:</strong> HireSense's AI features are strictly intended to serve as analytical decision-support tools. 
                            Final selection, assessment, recruitment decisions, and hiring actions are executed exclusively by human recruiters. 
                            We do not engage in fully automated binding candidate rejection.
                        </p>
                    </section>

                    {/* Data Security and Supabase */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle size={18} style={{ color: '#22c55e' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>4. Security, Infrastructure & Partners</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            We partner with premium cloud infrastructure services to secure candidate databases:
                        </p>
                        <ul style={{
                            paddingLeft: 20,
                            color: 'var(--text2)',
                            fontSize: 13,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            lineHeight: '1.5'
                        }}>
                            <li>
                                <strong>Supabase & PostgreSQL:</strong> All user credentials, application states, profiles, and candidate relational rows are stored in secure PostgreSQL databases encrypted at rest and transit via SSL.
                            </li>
                            <li>
                                <strong>Row-Level Security (RLS):</strong> PostgreSQL Row-Level Security parameters ensure that a recruiter can never view, alter, or access the talent pipeline or applicant profiles of another organization.
                            </li>
                            <li>
                                <strong>Temporary Processing:</strong> File uploads sent for automated parsers are handled in memory and immediate bucket storage with strict expiration limits.
                            </li>
                        </ul>
                    </section>

                    {/* Candidate Rights and Consent */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>5. Candidate Rights (GDPR & CCPA Compliant)</h2>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            Under data protection laws like the GDPR and California's CCPA/CPRA, candidates whose credentials are uploaded into HireSense 
                            have rights to govern their personal records:
                        </p>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            background: 'var(--bg2)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            fontSize: 12.5,
                            color: 'var(--text2)',
                        }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ color: 'var(--text)' }}>✓</span>
                                <span><strong>Right to Access:</strong> Request a complete export of files and processed records linked to their name.</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ color: 'var(--text)' }}>✓</span>
                                <span><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request instant, irreversible removal of all parsed metrics, records, and resume drafts from the recruitment workspace.</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ color: 'var(--text)' }}>✓</span>
                                <span><strong>Right to Restrict AI Processing:</strong> Reject automated profile scoring or search visibility.</span>
                            </div>
                        </div>
                    </section>

                    {/* Contact Info */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>6. Contact & Support</h2>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            For privacy audits, standard contract clauses, or candidate deletion requests, please contact our data safety division:
                        </p>
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1.5px dashed var(--border)',
                            borderRadius: 10,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            color: 'var(--text2)',
                            alignSelf: 'flex-start',
                        }}>
                            Email: privacy@hiresense.xyz<br />
                            Advisory division: aditya.poddar3698@gmail.com
                        </div>
                    </section>
                </motion.div>

                {/* Bottom navigation */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    style={{
                        textAlign: 'center',
                        marginTop: 32,
                        fontSize: 12,
                        color: 'var(--text3)',
                    }}
                >
                    © {new Date().getFullYear()} HireSense. All rights reserved.
                </motion.p>
            </div>
        </div>
    );
}
