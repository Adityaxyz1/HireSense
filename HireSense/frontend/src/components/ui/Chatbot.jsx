import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', reply: "Enter a candidate's name or a skill to find them in the system.", results: [] }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSearch = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', reply: input.trim(), results: [] };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.reply }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'model', reply: data.reply, results: data.results || [] }]);
        } catch {
            setMessages(prev => [...prev, { role: 'model', reply: "Sorry, the search failed. Please try again.", results: [] }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const navigateToCandidate = (matchId) => {
        setOpen(false);
        if (matchId) {
            navigate('/results', { state: { matchData: { id: matchId } } });
        } else {
            // If no match ID, send them to the recruiter board to see the raw resume
            navigate('/recruiter');
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setOpen(!open)}
                className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: open ? '0 0 0 0 rgba(255,255,255,0)' : '0 0 30px rgba(255,255,255,0.15)' }}
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X className="w-5 h-5" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                            <Search className="w-5 h-5" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed bottom-28 right-8 z-50 w-96 h-[500px] flex flex-col
                                   border border-border bg-background/95 backdrop-blur-xl
                                   shadow-[0_0_60px_rgba(0,0,0,0.3)]"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center mr-3">
                                    <Users className="w-4 h-4 text-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-[11px] tracking-[0.2em] uppercase font-medium text-foreground">Candidate Finder</h3>
                                    <p className="text-[9px] tracking-[0.1em] text-text-secondary uppercase">Local Search</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0.1 : 0 }}
                                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`max-w-[85%] px-4 py-3 text-[12px] leading-relaxed mb-2 ${msg.role === 'user'
                                            ? 'bg-foreground text-background'
                                            : 'border border-border text-foreground bg-foreground/5'
                                        }`}>
                                        {msg.reply}
                                    </div>

                                    {/* Render Candidate Link Results */}
                                    {msg.results && msg.results.length > 0 && (
                                        <div className="w-full space-y-2 mb-4">
                                            {msg.results.map((candidate, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => navigateToCandidate(candidate.match_id)}
                                                    className="w-[85%] text-left border border-border p-3 hover:border-foreground transition-colors group bg-background"
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[11px] font-medium tracking-[0.05em] uppercase truncate">{candidate.name}</span>
                                                        <ArrowRight className="w-3 h-3 text-text-secondary group-hover:text-foreground transition-colors" />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9px] text-text-secondary tracking-wider uppercase mb-2">
                                                        <span>{candidate.job_title}</span>
                                                        {candidate.match_score !== null && (
                                                            <span>Match: {Math.round(candidate.match_score <= 1 ? candidate.match_score * 100 : candidate.match_score)}%</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-text-secondary/80 line-clamp-2 leading-relaxed lowercase">
                                                        "{candidate.summary}"
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="border border-border px-4 py-3 bg-foreground/5">
                                        <div className="flex space-x-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-border bg-background">
                            <div className="flex items-center border border-border">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search by name or keyword..."
                                    className="flex-1 bg-transparent px-4 py-3 text-[12px] text-foreground placeholder-text-secondary/50 focus:outline-none"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={loading || !input.trim()}
                                    className="px-4 py-3 text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
