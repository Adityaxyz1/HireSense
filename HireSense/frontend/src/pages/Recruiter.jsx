import React, { useState, useRef } from 'react';
import { UploadCloud, Users, Filter } from 'lucide-react';
import { api } from '../lib/api';

export default function Recruiter() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [uploading, setUploading] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus(`Selected: ${e.target.files[0].name}`);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus("Please select a file first.");
            return;
        }

        setUploading(true);
        setStatus("Uploading to local backend...");

        try {
            const result = await api.uploadResume(file);
            setStatus(`Upload successful! Resume ID: ${result.resume_id} (Status: ${result.status})`);
            setFile(null);

            // Refresh resume list
            const resumes = await api.getResumes();
            setCandidates(resumes);
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Load candidates on first render
    React.useEffect(() => {
        api.getResumes().then(setCandidates).catch(console.error);
    }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pt-12">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-12 sm:mb-16">
                <div>
                    <h1 className="text-foreground mb-2 transition-colors duration-300" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em' }}>Recruiter Lounge</h1>
                    <p className="text-text-secondary transition-colors duration-300" style={{ fontSize: 13 }}>Upload PDF resumes for AI analysis.</p>
                </div>
                <button style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }} className="bg-transparent border border-border text-[10px] tracking-[0.15em] text-foreground uppercase px-6 py-3 flex items-center justify-center hover:bg-foreground hover:text-background w-full sm:w-auto">
                    <Filter className="w-3 h-3 mr-3" />
                    Filter Rankings
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 flex-1 min-h-0">
                <div className="lg:col-span-1 flex flex-col">
                    <div className="bg-transparent flex flex-col h-full">
                        <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase text-foreground mb-6 transition-colors duration-300">Upload Resume</h3>

                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{ borderRadius: 'var(--r)' }}
                            className={`flex-1 border-[1.5px] border-dashed border-border flex flex-col items-center justify-center p-6 text-center transition-colors cursor-pointer group mb-8 ${file ? 'bg-foreground/5' : 'hover:bg-foreground/5'}`}
                        >
                            <div className="w-12 h-12 border border-border rounded-full flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                                <UploadCloud className="w-4 h-4 text-text-secondary group-hover:text-foreground transition-colors" />
                            </div>
                            <p className="text-[11px] tracking-[0.1em] uppercase text-foreground transition-colors duration-300">
                                {file ? file.name : "Drop resumes here"}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-2 uppercase transition-colors duration-300">
                                {file ? "Click to change file" : "or click to browse"}
                            </p>
                        </div>

                        {status && (
                            <div style={{ borderRadius: 'var(--r-sm)' }} className="text-[10px] uppercase tracking-[0.1em] text-text-secondary mb-4 p-3 border border-border text-center">
                                {status}
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={uploading || !file}
                            style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }}
                            className={`w-full border border-border text-[11px] tracking-[0.15em] text-foreground py-4 uppercase ${(!uploading && file) ? 'hover:bg-foreground hover:text-background' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            {uploading ? 'Processing...' : 'Upload & Analyze'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="card-modern h-full flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center transition-colors duration-300">
                            <h3 className="text-[11px] tracking-[0.2em] font-medium uppercase text-foreground flex items-center transition-colors duration-300">
                                <Users className="w-4 h-4 mr-3 text-text-secondary" />
                                Candidate Leaderboard
                            </h3>
                            <span style={{ borderRadius: 999 }} className="text-[9px] tracking-[0.1em] text-text-secondary uppercase border border-border px-3 py-1 transition-colors duration-300">{candidates.length} Uploaded</span>
                        </div>
                        {candidates.length === 0 ? (
                            <div className="flex-1 p-6 flex flex-col items-center justify-center text-text-secondary transition-colors duration-300">
                                <Users className="w-8 h-8 mb-6 opacity-30" />
                                <p className="text-[11px] tracking-[0.1em] uppercase">Upload a resume to see it here</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto p-4">
                                {candidates.map((c, i) => (
                                    <div key={c.id} style={{ borderRadius: 'var(--r-sm)' }} className="hover-lift-sm flex items-center justify-between py-4 px-3 border-b border-border last:border-b-0">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-[10px] text-text-secondary w-6">{i + 1}.</span>
                                            <span className="text-sm font-light text-foreground truncate max-w-[200px]">
                                                {c.file_url ? c.file_url.split('/').pop() : 'Unknown'}
                                            </span>
                                        </div>
                                        <span style={{ borderRadius: 999 }} className={`text-[10px] uppercase tracking-[0.1em] px-3 py-1 border ${c.status === 'completed' ? 'text-foreground border-foreground' : c.status === 'failed' ? 'text-red-500 border-red-500' : 'text-text-secondary border-border'
                                            }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
