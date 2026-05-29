import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Database, Activity, Trash2, RefreshCw, XCircle, FileText, Briefcase, UserPlus, Search, Edit2, Power, Mail, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const ADMIN_EMAIL = 'aditya.poddar3698@gmail.com';
const EMPTY_RECRUITER = { company_name: '', full_name: '', email: '', phone: '', designation: '', company_website: '', linkedin_url: '', status: 'active' };

export default function Admin() {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('users');

    // Data States
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [globalResumes, setGlobalResumes] = useState([]);
    const [globalJobs, setGlobalJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Reassign State
    const [sourceUser, setSourceUser] = useState('');
    const [targetUser, setTargetUser] = useState('');
    const [reassignMsg, setReassignMsg] = useState('');

    // Recruiter Management State
    const [recruiters, setRecruiters] = useState([]);
    const [recSearch, setRecSearch] = useState('');
    const [recStatusFilter, setRecStatusFilter] = useState('');
    const [recModalOpen, setRecModalOpen] = useState(false);
    const [recForm, setRecForm] = useState(EMPTY_RECRUITER);
    const [recEditId, setRecEditId] = useState(null);
    const [recSaving, setRecSaving] = useState(false);
    const [recFormError, setRecFormError] = useState('');
    const [recNotice, setRecNotice] = useState('');

    useEffect(() => {
        if (user && user.email === ADMIN_EMAIL) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, user, recStatusFilter]);

    // Debounced refetch for recruiter search
    useEffect(() => {
        if (activeTab !== 'recruiters' || !user) return;
        const t = setTimeout(() => { fetchData(); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recSearch]);

    const openCreateRecruiter = () => {
        setRecForm(EMPTY_RECRUITER); setRecEditId(null); setRecFormError(''); setRecNotice(''); setRecModalOpen(true);
    };
    const openEditRecruiter = (r) => {
        setRecForm({
            company_name: r.company_name || '', full_name: r.full_name || '', email: r.email || '',
            phone: r.phone || '', designation: r.designation || '', company_website: r.company_website || '',
            linkedin_url: r.linkedin_url || '', status: r.status || 'active',
        });
        setRecEditId(r.id); setRecFormError(''); setRecNotice(''); setRecModalOpen(true);
    };

    const submitRecruiter = async (e) => {
        e.preventDefault();
        setRecSaving(true); setRecFormError(''); setRecNotice('');
        try {
            if (recEditId) {
                await api.adminUpdateRecruiter(recEditId, {
                    company_name: recForm.company_name, full_name: recForm.full_name, phone: recForm.phone,
                    designation: recForm.designation, company_website: recForm.company_website, linkedin_url: recForm.linkedin_url,
                });
                setRecModalOpen(false);
            } else {
                const res = await api.adminCreateRecruiter(recForm);
                if (res.onboarding_link) {
                    // SMTP unavailable — surface the set-password link for manual sharing
                    setRecNotice(`Account created. Email delivery unavailable — share this set-password link:\n${res.onboarding_link}`);
                } else {
                    setRecModalOpen(false);
                }
            }
            fetchData();
        } catch (err) {
            setRecFormError(err.message);
        } finally {
            setRecSaving(false);
        }
    };

    const toggleRecruiterStatus = async (r) => {
        const next = r.status === 'active' ? 'inactive' : 'active';
        try {
            await api.adminSetRecruiterStatus(r.id, next);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const deleteRecruiter = async (r) => {
        if (!window.confirm(`Delete recruiter ${r.email}? This removes their account and all data permanently.`)) return;
        try {
            await api.adminDeleteRecruiter(r.id);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const fetchData = async () => {
        // Reset error when starting a new fetch
        setError('');
        setIsLoading(true);
        
        try {
            let res;
            switch (activeTab) {
                case 'users':
                case 'data':
                    res = await api.adminGetUsers();
                    setUsers(res.users);
                    break;
                case 'logs':
                    res = await api.adminGetLogs();
                    setLogs(res.logs);
                    break;
                case 'resumes':
                    res = await api.adminGetResumes();
                    setGlobalResumes(res.resumes);
                    break;
                case 'jobs':
                    res = await api.adminGetJobs();
                    setGlobalJobs(res.jobs);
                    break;
                case 'recruiters':
                    res = await api.adminGetRecruiters(recSearch, recStatusFilter);
                    setRecruiters(res.recruiters || []);
                    break;
                default:
                    break;
            }
        } catch (err) {
            console.error(`Error fetching ${activeTab}:`, err);
            setError(err.message || `Failed to fetch ${activeTab}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    if (user.email !== 'aditya.poddar3698@gmail.com') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-[#121215] border border-red-200 dark:border-red-900/30 p-10 rounded-3xl shadow-2xl text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        You do not have administrative privileges to access this panel.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-4 rounded-2xl hover:opacity-90 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you absolutely sure? This will delete the user and ALL their data permanently.")) return;
        try {
            await api.adminDeleteUser(uid);
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleWipeData = async (uid) => {
        if (!window.confirm("Are you sure? This will delete all resumes, jobs, and matches for this user. The account will remain.")) return;
        try {
            await api.adminWipeUserData(uid);
            alert("Data wiped successfully.");
        } catch (err) {
            alert(err.message);
        }
    };

    const handleReassign = async (e) => {
        e.preventDefault();
        setReassignMsg('');
        if (!sourceUser || !targetUser) return;
        if (sourceUser === targetUser) {
            setReassignMsg("Source and target must be different.");
            return;
        }
        
        if (!window.confirm("Are you sure you want to transfer all data?")) return;
        
        try {
            const res = await api.adminReassignData(sourceUser, targetUser);
            setReassignMsg(`Success: Transferred ${res.stats.resumes_transferred} resumes and ${res.stats.jobs_transferred} jobs.`);
            setSourceUser('');
            setTargetUser('');
        } catch (err) {
            setReassignMsg(`Error: ${err.message}`);
        }
    };


    return (
        <div className="relative min-h-[calc(100vh-4rem)]">
            <AnimatePresence mode="wait">
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="p-6 w-full mx-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center" style={{ letterSpacing: '-.02em' }}>
                                    <Shield className="w-8 h-8 mr-3 text-amber-500" />
                                    Master Control
                                </h1>
                                <p className="text-gray-500 mt-1">Total system oversight and data management.</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-2 mb-8">
                            {[
                                { id: 'recruiters', label: 'Recruiter Management', icon: UserPlus },
                                { id: 'users', label: 'User Management', icon: Users },
                                { id: 'resumes', label: 'Global Resumes', icon: FileText },
                                { id: 'jobs', label: 'Global Jobs', icon: Briefcase },
                                { id: 'data', label: 'Data Allocation', icon: Database },
                                { id: 'logs', label: 'Security Logs', icon: Activity }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }}
                                    className={`flex items-center space-x-2 px-6 py-3 ${
                                        activeTab === tab.id
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                        : 'bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start space-x-3 text-red-500">
                                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-sm">Failed to Load Data</h3>
                                    <p className="text-sm opacity-90">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="card-modern overflow-hidden min-h-[500px]">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-[500px]">
                                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="p-6"
                                    >
                                    {/* RECRUITER MANAGEMENT TAB */}
                                    {activeTab === 'recruiters' && (
                                        <div>
                                            {/* Toolbar */}
                                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
                                                <div className="flex flex-1 gap-3">
                                                    <div className="relative flex-1 max-w-xs">
                                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            value={recSearch}
                                                            onChange={(e) => setRecSearch(e.target.value)}
                                                            placeholder="Search name, email, company…"
                                                            className="focusable w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white outline-none"
                                                        />
                                                    </div>
                                                    <select
                                                        value={recStatusFilter}
                                                        onChange={(e) => setRecStatusFilter(e.target.value)}
                                                        className="focusable px-3 py-2.5 rounded-xl bg-white dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white outline-none"
                                                    >
                                                        <option value="">All statuses</option>
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={openCreateRecruiter}
                                                    style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }}
                                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm"
                                                >
                                                    <UserPlus className="w-4 h-4" /> Create Recruiter
                                                </button>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                                            <th className="pb-4 font-medium">Recruiter</th>
                                                            <th className="pb-4 font-medium">Company</th>
                                                            <th className="pb-4 font-medium">Designation</th>
                                                            <th className="pb-4 font-medium">Status</th>
                                                            <th className="pb-4 font-medium text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                        {recruiters.length === 0 ? (
                                                            <tr><td colSpan="5" className="py-10 text-center text-gray-400">No recruiters found. Click “Create Recruiter” to add one.</td></tr>
                                                        ) : recruiters.map(r => (
                                                            <tr key={r.id} className="hover-lift-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                                <td className="py-4">
                                                                    <div className="font-medium">{r.full_name}</div>
                                                                    <div className="text-xs text-gray-500">{r.email}</div>
                                                                </td>
                                                                <td className="py-4 text-sm">{r.company_name}</td>
                                                                <td className="py-4 text-sm text-gray-500">{r.designation || '—'}</td>
                                                                <td className="py-4">
                                                                    <button
                                                                        onClick={() => toggleRecruiterStatus(r)}
                                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                                                                        title="Toggle status"
                                                                    >
                                                                        {r.status === 'active' ? 'Active' : 'Inactive'}
                                                                    </button>
                                                                </td>
                                                                <td className="py-4 flex justify-end space-x-2">
                                                                    <button onClick={() => openEditRecruiter(r)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit"><Edit2 className="w-4.5 h-4.5" /></button>
                                                                    <button onClick={() => toggleRecruiterStatus(r)} className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={r.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-4.5 h-4.5" /></button>
                                                                    <button onClick={() => deleteRecruiter(r)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 className="w-4.5 h-4.5" /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* USERS TAB */}
                                    {activeTab === 'users' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                                        <th className="pb-4 font-medium">Email</th>
                                                        <th className="pb-4 font-medium">Display Name</th>
                                                        <th className="pb-4 font-medium">User ID</th>
                                                        <th className="pb-4 font-medium">Last Login</th>
                                                        <th className="pb-4 font-medium text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                    {users.map(u => (
                                                        <tr key={u.id} className="hover-lift-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-4 font-medium">{u.email}</td>
                                                            <td className="py-4">{u.display_name || '-'}</td>
                                                            <td className="py-4 font-mono text-xs text-gray-500">{u.id}</td>
                                                            <td className="py-4 text-sm">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                                                            <td className="py-4 flex justify-end space-x-3">
                                                                <button 
                                                                    onClick={() => handleWipeData(u.id)}
                                                                    className="text-amber-500 hover:text-amber-600 transition-colors p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg group relative"
                                                                >
                                                                    <XCircle className="w-5 h-5" />
                                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Wipe Data</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    disabled={u.email === 'aditya.poddar3698@gmail.com'}
                                                                    className="text-red-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed group relative"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                    <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Delete Account</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* GLOBAL RESUMES TAB */}
                                    {activeTab === 'resumes' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                                        <th className="pb-4 font-medium">Candidate Name</th>
                                                        <th className="pb-4 font-medium">ATS Score</th>
                                                        <th className="pb-4 font-medium">Status</th>
                                                        <th className="pb-4 font-medium">Uploaded By</th>
                                                        <th className="pb-4 font-medium">Date</th>
                                                        <th className="pb-4 font-medium text-right">Resume ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                    {globalResumes.map(r => (
                                                        <tr key={r.id} className="hover-lift-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-4 font-medium">{r.candidate_name || 'Unnamed'}</td>
                                                            <td className="py-4">
                                                                {r.ats_score !== null ? (
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.ats_score >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : r.ats_score >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                        {r.ats_score}%
                                                                    </span>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="py-4 text-sm capitalize">{r.candidate_status || r.status || 'new'}</td>
                                                            <td className="py-4 text-sm text-gray-500">{r.user_email}</td>
                                                            <td className="py-4 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                                                            <td className="py-4 font-mono text-xs text-gray-500 text-right">{r.id}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* GLOBAL JOBS TAB */}
                                    {activeTab === 'jobs' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                                        <th className="pb-4 font-medium">Job Title</th>
                                                        <th className="pb-4 font-medium">Created By</th>
                                                        <th className="pb-4 font-medium">Status</th>
                                                        <th className="pb-4 font-medium">Docs</th>
                                                        <th className="pb-4 font-medium">Date</th>
                                                        <th className="pb-4 font-medium text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                    {globalJobs.map(j => (
                                                        <tr key={j.id} className="hover-lift-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-4 font-medium">{j.title || 'Untitled Job'}</td>
                                                            <td className="py-4 text-sm text-gray-500">{j.user_email}</td>
                                                            <td className="py-4 text-sm">
                                                                <button 
                                                                    onClick={async () => {
                                                                        const newStatus = j.status === 'active' ? 'closed' : 'active';
                                                                        try {
                                                                            await api.adminUpdateJob(j.id, { status: newStatus });
                                                                            fetchData();
                                                                        } catch(e) { alert('Update failed'); }
                                                                    }}
                                                                    className={`px-2 py-1 rounded text-xs font-medium ${j.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}
                                                                >
                                                                    {j.status || 'active'}
                                                                </button>
                                                            </td>
                                                            <td className="py-4 text-sm">{(j.recruitment_docs || []).length}</td>
                                                            <td className="py-4 text-sm">{new Date(j.created_at).toLocaleDateString()}</td>
                                                            <td className="py-4 flex justify-end space-x-3">
                                                                <button 
                                                                    onClick={async () => {
                                                                        if(!window.confirm('Delete job globally?')) return;
                                                                        try {
                                                                            await api.adminDeleteJob(j.id);
                                                                            fetchData();
                                                                        } catch(e) { alert('Delete failed'); }
                                                                    }}
                                                                    className="text-red-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg group relative"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                    <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Delete Job</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* DATA TAB */}
                                    {activeTab === 'data' && (
                                        <div className="max-w-2xl mx-auto py-8">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 p-6 rounded-xl mb-8">
                                                <h3 className="text-blue-800 dark:text-blue-300 font-semibold mb-2">Data Reassignment</h3>
                                                <p className="text-blue-600 dark:text-blue-400 text-sm">
                                                    Transfer all resumes, job descriptions, and analysis history from one user account to another. This action is irreversible.
                                                </p>
                                            </div>

                                            <form onSubmit={handleReassign} className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source User</label>
                                                        <select 
                                                            value={sourceUser}
                                                            onChange={(e) => setSourceUser(e.target.value)}
                                                            className="focusable w-full bg-white dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                                                        >
                                                            <option value="">Select source...</option>
                                                            {users.map(u => (
                                                                <option key={`src-${u.id}`} value={u.id}>{u.email}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target User</label>
                                                        <select 
                                                            value={targetUser}
                                                            onChange={(e) => setTargetUser(e.target.value)}
                                                            className="focusable w-full bg-white dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                                                        >
                                                            <option value="">Select target...</option>
                                                            {users.map(u => (
                                                                <option key={`tgt-${u.id}`} value={u.id}>{u.email}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {reassignMsg && (
                                                    <div className={`p-4 rounded-lg text-sm ${reassignMsg.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                        {reassignMsg}
                                                    </div>
                                                )}

                                                <button 
                                                    type="submit"
                                                    disabled={!sourceUser || !targetUser}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                                                >
                                                    Execute Transfer
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {/* LOGS TAB */}
                                    {activeTab === 'logs' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                                        <th className="pb-4 font-medium">Timestamp</th>
                                                        <th className="pb-4 font-medium">Action</th>
                                                        <th className="pb-4 font-medium">User (Email)</th>
                                                        <th className="pb-4 font-medium">IP Address</th>
                                                        <th className="pb-4 font-medium">User Agent</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                    {logs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="py-10 text-center text-gray-400">
                                                                No security logs found.
                                                            </td>
                                                        </tr>
                                                    ) : logs.map(log => (
                                                        <tr key={log.id} className="hover-lift-sm text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-3 text-sm whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                                            <td className="py-3">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                                    log.event_type === 'login' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                    log.event_type === 'signup' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                                }`}>
                                                                    {String(log.event_type || 'unknown').toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 font-medium text-xs">
                                                                <div className="flex flex-col">
                                                                    <span>{log.email || 'anonymous'}</span>
                                                                    <span className="text-[10px] opacity-50 font-mono">{log.user_id}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 text-sm font-mono">{log.ip_address}</td>
                                                            <td className="py-3 text-xs text-gray-500 max-w-xs truncate" title={log.user_agent}>{log.user_agent}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    </motion.div>
            </AnimatePresence>

            {/* ── Create / Edit Recruiter Modal ── */}
            <AnimatePresence>
                {recModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setRecModalOpen(false)}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="card-modern w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-amber-500" />
                                    {recEditId ? 'Edit Recruiter' : 'Create Recruiter Account'}
                                </h3>
                                <button onClick={() => setRecModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XCircle className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={submitRecruiter} className="p-6 space-y-4">
                                {[
                                    { k: 'company_name', label: 'Company Name', required: true },
                                    { k: 'full_name', label: 'Recruiter Full Name', required: true },
                                    { k: 'email', label: 'Official Email Address', required: true, type: 'email', disabled: !!recEditId },
                                    { k: 'phone', label: 'Phone Number' },
                                    { k: 'designation', label: 'Designation / Role' },
                                    { k: 'company_website', label: 'Company Website (Optional)' },
                                    { k: 'linkedin_url', label: 'LinkedIn Profile (Optional)' },
                                ].map(f => (
                                    <div key={f.k}>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
                                        <input
                                            type={f.type || 'text'}
                                            value={recForm[f.k]}
                                            disabled={f.disabled}
                                            required={f.required}
                                            onChange={(e) => setRecForm({ ...recForm, [f.k]: e.target.value })}
                                            className="focusable w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white outline-none disabled:opacity-50"
                                        />
                                        {f.k === 'email' && recEditId && <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed after creation.</p>}
                                    </div>
                                ))}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Account Status</label>
                                    <div className="flex gap-2">
                                        {['active', 'inactive'].map(s => (
                                            <button key={s} type="button" onClick={() => setRecForm({ ...recForm, status: s })}
                                                style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }}
                                                className={`flex-1 py-2.5 text-sm capitalize border ${recForm.status === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-[#0f0f0f] text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {!recEditId && (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-300">
                                        <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs leading-relaxed">An onboarding email will be sent. The recruiter sets their own password on first login — no password is generated or shared.</p>
                                    </div>
                                )}

                                {recFormError && <p className="text-sm text-red-500">{recFormError}</p>}
                                {recNotice && (
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 text-xs whitespace-pre-wrap break-all flex items-start gap-2">
                                        <Copy className="w-4 h-4 flex-shrink-0 mt-0.5 cursor-pointer" onClick={() => navigator.clipboard?.writeText(recNotice.split('\n').pop())} />
                                        <span>{recNotice}</span>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setRecModalOpen(false)} style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }} className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        {recNotice ? 'Close' : 'Cancel'}
                                    </button>
                                    <button type="submit" disabled={recSaving} style={{ borderRadius: 999, fontWeight: 600, transition: 'all .15s' }} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm disabled:opacity-60">
                                        {recSaving ? 'Saving…' : (recEditId ? 'Save Changes' : 'Create & Send Invite')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
