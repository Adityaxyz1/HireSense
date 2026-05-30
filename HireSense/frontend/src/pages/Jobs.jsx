import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit3, FileText, Users, Trash2, PlusCircle, UploadCloud, RefreshCw, CheckCircle, Play, AlertCircle } from 'lucide-react';

function CountUp({ target }) {
    const ref = useRef(null);
    useEffect(() => {
        let n = 0; const st = target / 55;
        const iv = setInterval(() => {
            n += st;
            if (n >= target) { if (ref.current) ref.current.textContent = target; clearInterval(iv); }
            else if (ref.current) ref.current.textContent = Math.floor(n);
        }, 16);
        return () => clearInterval(iv);
    }, [target]);
    return <span ref={ref}>0</span>;
}

export default function Jobs() {
    const { isDark } = useTheme();
    const [jobs, setJobs] = useState([]);
    const [results, setResults] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [expandedJobId, setExpandedJobId] = useState(null);
    
    // Create state
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newText, setNewText] = useState('');
    const [creatingProgress, setCreatingProgress] = useState(false);

    // Edit state
    const [editMode, setEditMode] = useState(null); 
    const [editTitle, setEditTitle] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editText, setEditText] = useState('');
    
    // Tab state
    const [activeTab, setActiveTab] = useState('details'); // details, documents, candidates

    const [uploadingDocJob, setUploadingDocJob] = useState(null);
    const [matchingJob, setMatchingJob] = useState(null);

    const { isMobile } = useBreakpoint();

    const fetchData = () => {
        api.getJobs().then(r => setJobs(r || [])).catch(() => {});
        api.getResults().then(r => setResults(r || [])).catch(() => {});
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (jobId, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this job description?")) return;
        setDeletingId(jobId);
        try {
            await api.deleteJob(jobId);
            setJobs(prev => prev.filter(j => j.id !== jobId));
            if (expandedJobId === jobId) setExpandedJobId(null);
        } catch (e) {
            console.error('Job deletion failed:', e);
        }
        setDeletingId(null);
    };

    const handleCreateJob = async () => {
        if (!newText.trim()) return alert("Job text is required.");
        setCreatingProgress(true);
        try {
            await api.uploadJob(newText, newTitle);
            fetchData();
            setIsCreating(false);
            setNewTitle('');
            setNewText('');
        } catch(e) {
            alert(e.message || "Failed to create job");
        }
        setCreatingProgress(false);
    };

    const startEditing = (j, e) => {
        e.stopPropagation();
        setEditMode(j.id);
        setEditTitle(j.title || '');
        setEditStatus(j.status || 'active');
        setEditText(j.job_text || '');
    };

    const saveEditing = async (jId) => {
        try {
            await api.updateJob(jId, { title: editTitle, status: editStatus, job_text: editText });
            setEditMode(null);
            fetchData();
        } catch(e) {
            alert("Update failed: " + e.message);
        }
    };

    const handleFileUpload = async (e, jobId) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDocJob(jobId);
        try {
            await api.uploadJobDocument(jobId, file);
            fetchData();
        } catch(err) {
            alert(err.message || "Upload failed. PDFs over 10MB will be compressed automatically.");
        }
        setUploadingDocJob(null);
        e.target.value = ''; // reset
    };

    const handleTriggerMatch = async (jobId) => {
        setMatchingJob(jobId);
        try {
            await api.triggerJobMatch(jobId);
            alert("Match re-run started. Candidates will be evaluated in the background.");
            setTimeout(fetchData, 3000);
        } catch(err) {
            alert(err.message || "Failed to trigger match");
        }
        setMatchingJob(null);
    };

    const toggleExpand = (jobId) => {
        if (expandedJobId === jobId) {
            setExpandedJobId(null);
        } else {
            setExpandedJobId(jobId);
            setActiveTab('details');
            setEditMode(null);
        }
    };

    const totalOpenings = jobs.length;

    return (
        <div className="pb-20">
            <div className="section-head" style={{ marginBottom: 16 }}>
                <div>
                    <div className="title" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>Job Roles</div>
                    <div className="subtitle" style={{ fontSize: 13, color: 'var(--text3)' }}>Create roles, attach documents, and run the match engine</div>
                </div>
            </div>

            {/* Stats */}
            <div className="bento stagger" style={{ marginBottom: 20 }}>
                {[
                    { color: 'var(--text)', label: 'Total Job Roles', value: totalOpenings },
                    { color: '#9c6f4a', label: 'Active Roles', value: jobs.filter(j => j.status !== 'closed').length },
                    { color: '#c08a35', label: 'Total Matches', value: results.length },
                ].map((s, i) => (
                    <div key={i} className="card-modern hover-lift-sm col-4" style={{
                        '--i': i,
                        display: 'flex', alignItems: 'stretch',
                        padding: 0, overflow: 'hidden',
                    }}>
                        <div style={{ width: 6, background: s.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: '20px' }}>
                            <div style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}><CountUp target={s.value} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create New Job Role Inline Card */}
            <motion.div layout className="mb-6 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-white dark:from-[#11111a] dark:to-[#0a0a0c] shadow-lg">
                {!isCreating ? (
                    <div 
                        onClick={() => setIsCreating(true)}
                        className="p-6 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 transition-all"
                    >
                        <PlusCircle className="w-6 h-6 text-indigo-500" />
                        <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">Create New Job Role</span>
                    </div>
                ) : (
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Job Description</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                                <input 
                                    type="text" 
                                    value={newTitle} 
                                    onChange={e => setNewTitle(e.target.value)}
                                    placeholder="e.g. Senior Frontend Engineer"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Description</label>
                                <textarea 
                                    value={newText} 
                                    onChange={e => setNewText(e.target.value)}
                                    placeholder="Paste full job description, requirements, and responsibilities..."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-y"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    onClick={() => setIsCreating(false)}
                                    className="px-5 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateJob}
                                    disabled={creatingProgress}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creatingProgress && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    Create Role
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Job list */}
            <div className="space-y-4">
                {jobs.map((j, i) => {
                    const isDeleting = deletingId === j.id;
                    const isExpanded = expandedJobId === j.id;
                    const isEditing = editMode === j.id;
                    const jobResults = results.filter(r => r.job_id === j.id);

                    return (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={j.id}
                            className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-2xl shadow-indigo-500/10' : 'shadow-sm hover:shadow-md hover-lift-sm'}`}
                            style={{ background: isDark ? (isExpanded ? '#121215' : '#1a1a1c') : '#ffffff', opacity: isDeleting ? 0.5 : 1 }}
                        >
                            {/* Card Header (Clickable to expand) */}
                            <div 
                                onClick={() => toggleExpand(j.id)}
                                className="p-5 flex items-center justify-between cursor-pointer group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                            {j.title || `Job Description #${i + 1}`}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            j.status === 'closed' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {j.status || 'active'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {(j.text || j.job_text || '').slice(0, 100)}…
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex space-x-4 text-sm text-gray-500 mr-2 hidden sm:flex">
                                        <div className="flex items-center gap-1"><FileText className="w-4 h-4"/> {(j.recruitment_docs || []).length}</div>
                                        <div className="flex items-center gap-1"><Users className="w-4 h-4"/> {jobResults.length}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(j.id, e)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <div className="p-2 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Workspace */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0d0d0f]"
                                    >
                                        {/* Tabs */}
                                        <div className="flex px-6 pt-4 space-x-6 border-b border-gray-200 dark:border-gray-800">
                                            {[
                                                { id: 'details', label: 'Details & Editor', icon: Edit3 },
                                                { id: 'documents', label: 'Recruitment Docs', icon: FileText, count: (j.recruitment_docs || []).length },
                                                { id: 'candidates', label: 'Matched Candidates', icon: Users, count: jobResults.length },
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-medium text-sm transition-all ${
                                                        activeTab === tab.id 
                                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                    }`}
                                                >
                                                    <tab.icon className="w-4 h-4" />
                                                    {tab.label}
                                                    {tab.count !== undefined && (
                                                        <span className="bg-gray-200 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full ml-1">
                                                            {tab.count}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="p-6">
                                            {/* DETAILS TAB */}
                                            {activeTab === 'details' && (
                                                <div className="space-y-4">
                                                    {!isEditing ? (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-semibold text-gray-900 dark:text-white">Job Description</h4>
                                                                <button onClick={(e) => startEditing(j, e)} className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                                                    <Edit3 className="w-4 h-4" /> Edit Details
                                                                </button>
                                                            </div>
                                                            <div className="bg-white dark:bg-[#1a1a1c] p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                                                                {j.job_text || j.text}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="space-y-4 bg-white dark:bg-[#1a1a1c] p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-inner">
                                                            <div className="flex gap-4">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                                                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white outline-none focus:border-indigo-500" />
                                                                </div>
                                                                <div className="w-40">
                                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                                                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ colorScheme: isDark ? 'dark' : 'light' }} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white outline-none focus:border-indigo-500">
                                                                        <option value="active" style={{ background: 'var(--input)', color: 'var(--text)' }}>Active</option>
                                                                        <option value="closed" style={{ background: 'var(--input)', color: 'var(--text)' }}>Closed</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Description (Editing recalculates embeddings)</label>
                                                                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={8} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white outline-none focus:border-indigo-500 resize-y" />
                                                            </div>
                                                            <div className="flex justify-end gap-2 pt-2">
                                                                <button onClick={() => setEditMode(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
                                                                <button onClick={() => saveEditing(j.id)} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md">Save Changes</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* DOCUMENTS TAB */}
                                            {activeTab === 'documents' && (
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-sm text-gray-500">Upload guidelines, interview rubrics, or internal notes (PDF, DOCX). PDFs &gt; 10MB will be auto-compressed.</p>
                                                    </div>
                                                    
                                                    {/* Upload Zone */}
                                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center bg-white dark:bg-[#1a1a1c] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative">
                                                        <input 
                                                            type="file" 
                                                            onChange={(e) => handleFileUpload(e, j.id)}
                                                            accept=".pdf,.doc,.docx,.txt"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            disabled={uploadingDocJob === j.id}
                                                        />
                                                        {uploadingDocJob === j.id ? (
                                                            <div className="flex flex-col items-center justify-center text-indigo-500">
                                                                <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                                                                <span className="font-medium">Uploading and Processing...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                                                <UploadCloud className="w-10 h-10 mb-3 text-indigo-400" />
                                                                <span className="font-medium text-gray-900 dark:text-white">Click or drag document to upload</span>
                                                                <span className="text-xs mt-1">Supports PDF (auto-compression), DOCX, TXT</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Doc List */}
                                                    {j.recruitment_docs && j.recruitment_docs.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {j.recruitment_docs.map((doc, idx) => (
                                                                <a 
                                                                    key={idx} 
                                                                    href={doc.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1c] hover:border-indigo-300 transition-colors group"
                                                                >
                                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 flex-shrink-0">
                                                                        <FileText className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{doc.filename}</div>
                                                                        <div className="text-xs text-gray-500">{doc.size_mb ? `${doc.size_mb} MB` : 'Document'}</div>
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                                                            <AlertCircle className="w-4 h-4"/> No documents uploaded yet.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* CANDIDATES TAB */}
                                            {activeTab === 'candidates' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-xl">
                                                        <div>
                                                            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300">Match Engine</h4>
                                                            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">Force re-evaluation of all candidates against this job description. Useful if you updated the job text.</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleTriggerMatch(j.id)}
                                                            disabled={matchingJob === j.id}
                                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors disabled:opacity-50"
                                                        >
                                                            {matchingJob === j.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                            {matchingJob === j.id ? 'Running...' : 'Run Match Engine'}
                                                        </button>
                                                    </div>

                                                    <div className="mt-6">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                            Evaluated Candidates ({jobResults.length})
                                                        </h4>
                                                        {jobResults.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {jobResults.sort((a,b) => b.final_score - a.final_score).map((r, idx) => (
                                                                    <div key={r.id || idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1c] flex items-center justify-between shadow-sm">
                                                                        <div className="min-w-0 pr-4">
                                                                            <div className="font-medium text-gray-900 dark:text-white truncate">{r.candidate_name || 'Anonymous Candidate'}</div>
                                                                            <div className="text-xs text-gray-500 mt-1 capitalize">{r.candidate_status || 'Pending'}</div>
                                                                        </div>
                                                                        <div className={`px-3 py-1 rounded-lg font-bold text-lg flex items-center justify-center shadow-sm ${
                                                                            r.final_score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 
                                                                            r.final_score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' : 
                                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                                                                        }`}>
                                                                            {Math.round(r.final_score)}%
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-[#1a1a1c]/50">
                                                                <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                                <p className="text-gray-500 text-sm">No candidates have been evaluated for this job yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
