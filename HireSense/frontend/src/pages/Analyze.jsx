import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Analyze() {
    const navigate = useNavigate();
    const [analyzing, setAnalyzing] = useState(false);
    const [jobText, setJobText] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [status, setStatus] = useState('');
    const [resumes, setResumes] = useState([]);
    const [selectedResumeId, setSelectedResumeId] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [candidateName, setCandidateName] = useState('');

    useEffect(() => {
        // Load existing resumes to let user pick one
        api.getResumes().then(data => {
            const all = data || [];
            setResumes(all);
            if (all.length > 0) setSelectedResumeId(all[0].id);
        }).catch(console.error);
    }, []);

    const handleAnalyze = async () => {
        if (!selectedResumeId && !uploadFile) {
            setStatus("Please select or upload a resume first.");
            return;
        }
        if (!jobText.trim()) {
            setStatus("Please enter a job description.");
            return;
        }

        setAnalyzing(true);
        setStatus("Processing...");

        try {
            let resumeId = selectedResumeId;

            if (uploadFile && !selectedResumeId) {
                setStatus("Uploading resume...");
                const uploadResult = await api.uploadResume(uploadFile, candidateName);
                resumeId = uploadResult.resume_id;
                setResumes(prev => [...prev, { id: resumeId, candidate_name: candidateName || uploadFile.name }]);
                setSelectedResumeId(resumeId);
                setStatus("Generating embeddings (this may take a moment)...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Upload job description
            setStatus("Processing job description...");
            const jobResult = await api.uploadJob(jobText, jobTitle);

            // Run evaluation
            setStatus("Running deep semantic analysis...");
            const evalResult = await api.evaluate(resumeId, jobResult.job_id);

            setStatus("Analysis complete!");
            navigate('/results', { state: { result: evalResult } });

        } catch (err) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto py-12 transition-colors duration-300">
            <div className="section-head mb-16">
                <h1 className="title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 6 }}>Analyze Candidate</h1>
                <p className="subtitle" style={{ fontSize: 13, color: 'var(--text3)' }}>Upload a resume and job description to get a deep semantic match score.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                {/* Resume Selection */}
                <div className="card-modern transition-colors duration-300 flex flex-col" style={{ borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <div className="p-4 border-b border-border transition-colors duration-300 flex items-center">
                        <UploadCloud className="w-4 h-4 mr-3 text-text-secondary transition-colors duration-300" />
                        <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase text-foreground transition-colors duration-300">Resume</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-auto space-y-3">
                        {/* Drop zone */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.toLowerCase().endsWith('.pdf')) { setUploadFile(f); setSelectedResumeId(''); setCandidateName(''); } }}
                            onClick={() => document.getElementById('analyze-file-input')?.click()}
                            className="hover-lift-sm"
                            style={{
                                border: `1.5px dashed ${uploadFile ? 'var(--border2)' : 'var(--border)'}`,
                                borderRadius: 'var(--r-sm)', padding: '14px 12px', textAlign: 'center',
                                cursor: 'pointer', background: uploadFile ? 'var(--foreground)/5' : 'var(--bg)',
                                transition: 'all .15s',
                            }}
                        >
                            <div style={{ fontSize: 12, color: uploadFile ? 'var(--text)' : 'var(--text3)', fontWeight: uploadFile ? 500 : 400 }}>
                                {uploadFile ? uploadFile.name : 'Drop PDF here or click to browse'}
                            </div>
                            {uploadFile && (
                                <button
                                    onClick={e => { e.stopPropagation(); setUploadFile(null); setCandidateName(''); }}
                                    style={{ marginTop: 4, fontSize: 10, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <input id="analyze-file-input" type="file" accept=".pdf,.PDF" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setSelectedResumeId(''); setCandidateName(''); } e.target.value = ''; }} />

                        {uploadFile && !selectedResumeId && (
                            <input
                                type="text"
                                value={candidateName}
                                onChange={e => setCandidateName(e.target.value)}
                                placeholder="Candidate name (optional)"
                                className="focusable w-full bg-transparent border border-border p-2 focus:outline-none text-[12px] text-foreground transition-colors duration-300"
                                style={{ borderRadius: 'var(--r-sm)' }}
                            />
                        )}

                        {resumes.length > 0 && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                    <span style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>or select existing</span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                </div>
                                <div className="space-y-2">
                                    {resumes.map(r => (
                                        <label key={r.id} className={`hover-lift-sm flex items-center p-3 cursor-pointer border transition-colors duration-300 ${selectedResumeId === r.id ? 'border-foreground bg-foreground/5' : 'border-border hover:bg-foreground/5'}`} style={{ borderRadius: 'var(--r-sm)' }}>
                                            <input
                                                type="radio"
                                                name="resume"
                                                value={r.id}
                                                checked={selectedResumeId === r.id}
                                                onChange={() => { setSelectedResumeId(r.id); setUploadFile(null); setCandidateName(''); }}
                                                className="mr-3"
                                            />
                                            <span className="text-sm font-light text-foreground truncate">
                                                {r.candidate_name || (r.file_url ? r.file_url.split('/').pop() : `Resume ${r.id?.slice(0,8)}`)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Job Description */}
                <div className="card-modern transition-colors duration-300 flex flex-col h-64" style={{ borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <div className="p-4 border-b border-border transition-colors duration-300 flex items-center">
                        <FileText className="w-4 h-4 mr-3 text-text-secondary transition-colors duration-300" />
                        <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase text-foreground transition-colors duration-300">Job Description</h3>
                    </div>
                    <div style={{ padding: '15px 15px 0' }}>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="Job Title (e.g. Senior Frontend Engineer)"
                            className="focusable w-full bg-transparent border-b border-border p-2 focus:outline-none text-[12px] font-medium text-foreground transition-colors duration-300"
                            style={{ borderRadius: 'var(--r-sm)' }}
                        />
                    </div>
                    <textarea
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        className="focusable flex-1 w-full bg-transparent p-6 focus:outline-none resize-none text-sm font-light text-foreground placeholder-text-secondary/50 transition-colors duration-300"
                        style={{ borderRadius: 'var(--r-sm)' }}
                        placeholder="Paste the job requirements here..."
                    />
                </div>
            </div>

            {status && (
                <div className="card-modern text-[10px] uppercase tracking-[0.1em] text-text-secondary mb-6 p-3 text-center" style={{ borderRadius: 'var(--r-sm)' }}>
                    {status}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing || (!selectedResumeId && !uploadFile) || !jobText.trim()}
                    className="border border-border text-[11px] tracking-[0.2em] uppercase text-foreground px-8 py-4 hover:bg-foreground hover:text-background transition-colors duration-300 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground disabled:cursor-not-allowed flex items-center"
                    style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }}
                >
                    {analyzing ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-4 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : 'Run Deep Analysis'}
                </button>
            </div>
        </div>
    );
}
