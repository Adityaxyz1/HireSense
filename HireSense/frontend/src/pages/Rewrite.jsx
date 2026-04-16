import React, { useState } from 'react';
import { FileEdit, X, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

const MODES = [
    { value: 'ats', label: 'ATS Optimized Mode' },
    { value: 'impact', label: 'Impact Focused Mode' },
    { value: 'technical', label: 'Technical Depth Mode' },
];

export default function Rewrite() {
    const [originalText, setOriginalText] = useState('');
    const [rewrittenText, setRewrittenText] = useState('');
    const [changes, setChanges] = useState([]);
    const [scoreBefore, setScoreBefore] = useState(null);
    const [scoreAfter, setScoreAfter] = useState(null);
    const [mode, setMode] = useState('ats');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRewrite = async () => {
        if (!originalText.trim()) {
            setError('Please paste some resume text first.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await api.rewriteText(originalText, mode);
            setRewrittenText(result.rewritten);
            setChanges(result.changes);
            setScoreBefore(result.score_before);
            setScoreAfter(result.score_after);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = () => {
        setRewrittenText('');
        setChanges([]);
        setScoreBefore(null);
        setScoreAfter(null);
    };

    const handleExport = () => {
        const blob = new Blob([rewrittenText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rewritten_resume.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col pt-12">
            {/* Header */}
            <div className="flex justify-between items-end mb-12 border-b-[0.5px] border-border pb-8 transition-colors duration-300">
                <div>
                    <h1 className="text-2xl font-light tracking-[0.1em] text-foreground flex items-center mb-4 transition-colors duration-300">
                        <FileEdit className="w-5 h-5 mr-4 text-text-secondary" /> AI Resume Rewrite
                    </h1>
                    <p className="text-[11px] tracking-[0.15em] uppercase text-text-secondary transition-colors duration-300">Paste your resume text and optimize it with AI-powered rewriting.</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="bg-transparent border border-border text-[10px] tracking-[0.15em] uppercase text-foreground px-6 py-3 cursor-pointer focus:outline-none focus:border-foreground appearance-none transition-colors duration-300"
                    >
                        {MODES.map(m => (
                            <option key={m.value} value={m.value} className="bg-background text-foreground">{m.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleRewrite}
                        disabled={loading || !originalText.trim()}
                        className={`border border-border text-[10px] tracking-[0.15em] uppercase text-foreground px-6 py-3 flex items-center transition-colors duration-300 ${loading || !originalText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-foreground hover:text-background'
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Rewriting...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3 mr-2" />
                                Rewrite
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-[10px] uppercase tracking-[0.1em] text-red-500 mb-4 p-3 border border-red-500/30 text-center">
                    {error}
                </div>
            )}

            {/* Score comparison bar */}
            <AnimatePresence>
                {scoreBefore !== null && scoreAfter !== null && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 flex items-center justify-center gap-12 py-4 border border-border"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] tracking-[0.15em] uppercase text-text-secondary">Before:</span>
                            <span className="text-2xl font-light text-text-secondary">{scoreBefore}</span>
                        </div>
                        <span className="text-text-secondary">→</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] tracking-[0.15em] uppercase text-foreground">After:</span>
                            <span className="text-2xl font-light text-foreground">{scoreAfter}</span>
                        </div>
                        <span className={`text-[10px] tracking-[0.15em] uppercase px-3 py-1 border ${scoreAfter > scoreBefore ? 'text-green-500 border-green-500/30' : 'text-text-secondary border-border'
                            }`}>
                            {scoreAfter > scoreBefore ? `+${scoreAfter - scoreBefore} points` : 'No change'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Editor Panels */}
            <div className="grid grid-cols-2 gap-12 flex-1 min-h-0">
                {/* Original */}
                <div className="bg-transparent border border-border flex flex-col transition-colors duration-300">
                    <div className="p-6 border-b border-border text-[10px] tracking-[0.2em] uppercase text-text-secondary transition-colors duration-300">
                        Original Draft
                    </div>
                    <textarea
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        className="flex-1 w-full bg-transparent p-8 focus:outline-none resize-none text-sm font-light text-foreground placeholder-text-secondary/50 transition-colors duration-300 leading-loose"
                        placeholder="Paste your resume text here...&#10;&#10;Example:&#10;Senior React Developer with 5 years of experience. Built websites and handled state. Managed API calls. Worked on the front page of the main app. Fixed bugs and improved speed."
                    />
                </div>

                {/* Rewritten */}
                <div className="bg-transparent border border-border flex flex-col relative transition-colors duration-300">
                    {rewrittenText && (
                        <div className="absolute top-0 right-0 p-6 z-10">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-foreground border border-foreground px-3 py-1 transition-colors duration-300">
                                AI Rewrite
                            </span>
                        </div>
                    )}
                    <div className="p-6 border-b border-border text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors duration-300">
                        Optimized Revision
                    </div>
                    <div className="flex-1 overflow-auto p-8 text-sm font-light leading-loose transition-colors duration-300">
                        {rewrittenText ? (
                            <div className="space-y-6">
                                <p className="text-foreground whitespace-pre-wrap">{rewrittenText}</p>
                                {changes.length > 0 && (
                                    <div className="border-t border-border pt-6 mt-8">
                                        <h4 className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">Changes Made ({changes.length})</h4>
                                        <ul className="space-y-2">
                                            {changes.map((c, i) => (
                                                <li key={i} className="text-[11px] text-text-secondary flex items-start">
                                                    <span className="text-foreground mr-2">•</span> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-text-secondary/50">
                                {loading ? 'Rewriting...' : 'Paste text on the left and click "Rewrite" to see the optimized version here.'}
                            </p>
                        )}
                    </div>
                    {rewrittenText && (
                        <div className="p-6 border-t border-border flex justify-end gap-6 bg-background/50 backdrop-blur-md transition-colors duration-300">
                            <button
                                onClick={handleDiscard}
                                className="text-[10px] tracking-[0.15em] uppercase text-text-secondary hover:text-foreground flex items-center transition-colors duration-300 py-3"
                            >
                                <X className="w-3 h-3 mr-2" /> Discard
                            </button>
                            <button
                                onClick={handleExport}
                                className="border border-border text-[10px] tracking-[0.15em] uppercase text-foreground px-6 py-3 flex items-center hover:bg-foreground hover:text-background transition-colors duration-300"
                            >
                                <Download className="w-3 h-3 mr-3" /> Export Text
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
