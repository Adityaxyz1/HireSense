import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, Download, MessageCircle, Search, Send, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const pct = (value) => {
    if (value == null || value === '') return 'N/A';
    const n = Number(value);
    if (Number.isNaN(n)) return 'N/A';
    return `${Math.round(n <= 1 ? n * 100 : n)}%`;
};

export default function Chatbot() {
    const { user, role } = useAuth();
    const { isMobile } = useBreakpoint();
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloadId, setDownloadId] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'model',
            reply: 'Ask about a candidate, skill, email, or a job role: "who applied for React Developer?"',
            results: [],
            job_applicants: [],
        },
    ]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    // Recruiter-only tool — never surface the candidate finder to applicants.
    if (!user || role === 'applicant' || location.pathname === '/login' || location.pathname === '/reset-password') return null;

    const handleSearch = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', reply: text, results: [], job_applicants: [] };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const data = await api.chatAssistant(text, messages.slice(-6));
            setMessages(prev => [...prev, {
                role: 'model',
                reply: data.reply,
                results: data.results || [],
                job_applicants: data.job_applicants || [],
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'model',
                reply: err.message || 'Assistant search failed. Please try again.',
                results: [],
                job_applicants: [],
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (job) => {
        if (!job?.job_id) return;
        setDownloadId(job.job_id);
        try {
            await api.downloadJobApplicationsExcel(job.job_id, job.job_title);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'model',
                reply: err.message || 'Could not download the applicant workbook.',
                results: [],
                job_applicants: [],
            }]);
        } finally {
            setDownloadId('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const openCandidate = (candidate) => {
        setOpen(false);
        if (candidate.match_id) {
            navigate('/results', { state: { matchData: { id: candidate.match_id } } });
        } else {
            navigate(`/candidates?highlight=${candidate.id}`);
        }
    };

    return (
        <>
            <motion.button
                type="button"
                onClick={() => setOpen(!open)}
                title={open ? 'Close assistant' : 'Open assistant'}
                aria-label={open ? 'Close assistant' : 'Open assistant'}
                className="nb"
                style={{
                    position: 'fixed',
                    right: isMobile ? 16 : 24,
                    bottom: isMobile ? 74 : 24,
                    zIndex: 1200,
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: '1.5px solid var(--border2)',
                    background: 'var(--btn)',
                    color: 'var(--btn-fg)',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.span key="x" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} style={{ display: 'flex' }}>
                            <X size={20} />
                        </motion.span>
                    ) : (
                        <motion.span key="chat" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} style={{ display: 'flex' }}>
                            <MessageCircle size={21} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed',
                            right: isMobile ? 10 : 24,
                            bottom: isMobile ? 136 : 88,
                            zIndex: 1200,
                            width: isMobile ? 'calc(100vw - 20px)' : 420,
                            height: isMobile ? 'min(560px, calc(100vh - 160px))' : 560,
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 14,
                            boxShadow: '0 22px 70px rgba(0,0,0,0.34)',
                            overflow: 'hidden',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        <div style={{ padding: '15px 16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--nav-on)', color: 'var(--nav-on-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Candidate Assistant</div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Candidate details and job applicant lists</div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {messages.map((msg, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                                    <div style={{
                                        maxWidth: '88%',
                                        padding: '10px 12px',
                                        borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                        background: msg.role === 'user' ? 'var(--btn)' : 'var(--bg2)',
                                        color: msg.role === 'user' ? 'var(--btn-fg)' : 'var(--text)',
                                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                                        fontSize: 12.5,
                                        lineHeight: 1.5,
                                    }}>
                                        {msg.reply}
                                    </div>

                                    {msg.results?.length > 0 && (
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {msg.results.map(candidate => (
                                                <button
                                                    key={`${candidate.id}-${candidate.match_id || candidate.job_title}`}
                                                    type="button"
                                                    onClick={() => openCandidate(candidate)}
                                                    className="nb hover-lift-sm"
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: 12,
                                                        borderRadius: 10,
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card)',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                        <span style={{ fontSize: 12.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</span>
                                                        <ArrowRight size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                                                    </div>
                                                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--text3)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                                                        <span>{candidate.job_title || 'Candidate'}</span>
                                                        <span>Match {pct(candidate.match_score)}</span>
                                                        <span>ATS {pct(candidate.ats_score)}</span>
                                                        {candidate.status && <span>{candidate.status}</span>}
                                                    </div>
                                                    <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.45 }}>{candidate.summary}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {msg.job_applicants?.length > 0 && (
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {msg.job_applicants.map(job => (
                                                <div key={job.job_id} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.job_title}</div>
                                                            <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2 }}>{job.applicants.length} applicants</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownload(job)}
                                                            disabled={downloadId === job.job_id}
                                                            className="nb"
                                                            title="Download Excel"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                border: '1px solid var(--border)',
                                                                borderRadius: 999,
                                                                padding: '7px 10px',
                                                                fontSize: 10.5,
                                                                fontWeight: 800,
                                                                color: 'var(--text)',
                                                                background: 'var(--bg2)',
                                                                cursor: downloadId === job.job_id ? 'wait' : 'pointer',
                                                                opacity: downloadId === job.job_id ? 0.65 : 1,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <Download size={12} /> XLSX
                                                        </button>
                                                    </div>
                                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                                        {job.applicants.slice(0, 5).map(applicant => (
                                                            <div key={applicant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11.5, color: 'var(--text2)' }}>
                                                                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{applicant.applicant_name || applicant.applicant_email || 'Candidate'}</span>
                                                                <span style={{ color: 'var(--text3)', flexShrink: 0 }}>Match {pct(applicant.match_score)}</span>
                                                            </div>
                                                        ))}
                                                        {job.applicants.length > 5 && (
                                                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>+{job.applicants.length - 5} more in the Excel file</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 12 }}>
                                    <Search size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    Searching records...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: 12, borderTop: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 11, background: 'var(--input)', overflow: 'hidden' }}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about candidates or job applicants..."
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        color: 'var(--text)',
                                        padding: '12px 13px',
                                        fontSize: 12.5,
                                        fontFamily: 'var(--font)',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={loading || !input.trim()}
                                    className="nb"
                                    title="Send"
                                    style={{
                                        width: 42,
                                        alignSelf: 'stretch',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text)',
                                        cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                                        opacity: loading || !input.trim() ? 0.35 : 1,
                                    }}
                                >
                                    <Send size={15} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
