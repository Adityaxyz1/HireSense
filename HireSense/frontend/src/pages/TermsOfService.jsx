import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, AlertTriangle, Key, Terminal, Scale, ShieldAlert } from 'lucide-react';
import TwirlBackground from '../components/ui/TwirlBackground';

export default function TermsOfService() {
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
                        color: '#a87f4c',
                        marginBottom: 20,
                    }}>
                        <BookOpen size={26} />
                    </div>
                    <h1 style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: 12,
                        background: 'linear-gradient(135deg, var(--text) 30%, var(--text2) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>Terms of Service</h1>
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
                    {/* Agreement to Terms */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>1. Agreement to Terms</h2>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            Welcome to <strong>HireSense</strong> (the "Platform", "SaaS"). By registering for an account, deploying recruitment portals, 
                            parsing candidate databases, or accessing any AI-supported feature (the "Services"), you agree to be bound by these Terms of Service. 
                            These terms represent a legally binding agreement between you or the corporate entity you represent ("Company", "Recruiter", "User") 
                            and the HireSense founders and operators.
                        </p>
                    </section>

                    {/* Account Security & Supabase Auth */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Key size={18} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>2. Registration & Account Security</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            To access our platform tools, you must register through our secure, passwordless or multi-factor authentication modules 
                            powered by Supabase. You are solely responsible for:
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
                            <li>Maintaining the strict secrecy of your login tokens and password parameters.</li>
                            <li>The safety and legitimate operations of all team members and sub-recruiter profile seats added under your workspace billing limits.</li>
                            <li>Notifying the administration immediately at <em>aditya.poddar3698@gmail.com</em> upon discovering any compromised credentials or system hacks.</li>
                        </ul>
                    </section>

                    {/* Acceptable Use and Platform Safety */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Terminal size={18} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>3. Acceptable & Legitimate Use</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            HireSense is designed to elevate the recruitment experience through predictive parsing and structured applicant search. 
                            Under these Terms, you agree NOT to:
                        </p>
                        <div style={{
                            background: 'var(--bg2)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            fontSize: 12.5,
                            color: 'var(--text2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: '#c0563a' }}>✕</span>
                                <span>Upload files containing malware, trojans, or automated scripts intended to interfere with our database structures.</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: '#c0563a' }}>✕</span>
                                <span>Inject artificial profiles, synthetic resumes, or scraping bots to manipulate search indexes or deplete server resources.</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: '#c0563a' }}>✕</span>
                                <span>Employ HireSense's ATS scoring parameters for unlawful bias or discriminatory screening practices under global labor regulations.</span>
                            </div>
                        </div>
                    </section>

                    {/* AI Scoring and Limits */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={18} style={{ color: '#c08a35' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>4. AI Scoring Accuracy & Disclaimer</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            Our artificial intelligence assessment engine, large language models, and ATS checkers calculate match margins based on 
                            statistical semantic similarity. 
                        </p>
                        <div style={{
                            padding: '14px 18px',
                            background: 'rgba(245, 158, 11, 0.04)',
                            border: '1.5px solid rgba(245, 158, 11, 0.15)',
                            borderRadius: 12,
                            color: 'var(--text2)',
                            fontSize: 12.5,
                            lineHeight: '1.5',
                        }}>
                            <strong style={{ color: '#c08a35', display: 'block', marginBottom: 4 }}>Notice Regarding Algorithmic Matching:</strong>
                            You acknowledge and agree that automated scores are purely advisory recommendations to increase recruiter efficiency. 
                            HireSense does NOT guarantee candidate fit, verification of resumes, or placement suitability. Recruiters must perform standard 
                            background verification and human screening prior to contracting.
                        </div>
                    </section>

                    {/* Subscriptions, Billing, and Cancellations */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>5. Subscriptions, Payments & Cancellations</h2>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            Access to specific processing thresholds (e.g., matching large numbers of candidates, bulk ATS parsing) requires an active 
                            monthly or annual subscription:
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
                                <strong>Billing & Renewal:</strong> Payments are processed via secure partner gateways and automatically renew at the end of each cycles.
                            </li>
                            <li>
                                <strong>Cancellations:</strong> Users can terminate subscription billing plans at any time through their dashboard settings. Access remains active until the end of the paid term.
                            </li>
                            <li>
                                <strong>Refunds:</strong> All transaction fees and subscriptions are non-refundable unless explicitly stated by the regional customer care desk.
                            </li>
                        </ul>
                    </section>

                    {/* Limitation of Liability */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Scale size={18} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>6. Limitation of Liability</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            To the maximum extent permitted by applicable laws, HireSense, its developers, and affiliates shall NOT be held liable for any 
                            indirect, incidental, or consequential damages resulting from:
                        </p>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13, paddingLeft: 10, borderLeft: '3px solid var(--border)' }}>
                            <em>
                                hiring choices, missed employment opportunities, system down-times, database loss, parsing mistakes, candidate failure, 
                                or accuracy variances of matching metrics.
                            </em>
                        </p>
                    </section>

                    {/* Termination & Governing Law */}
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldAlert size={18} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>7. Termination & Amendments</h2>
                        </div>
                        <p style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: 13.5 }}>
                            We reserve the right to suspend accounts or terminate service instantenously if we detect a breach of security, violation of 
                            acceptable use policies, or default in due payments. We may modify these terms at any time, posting the updated version on 
                            this route. Continuing to utilize the platform signifies your acceptance of any revisions.
                        </p>
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
