import { supabase } from './supabase';

const API_BASE = 'http://localhost:8000/api';

/**
 * Get auth headers with Bearer token for all API calls.
 * This ensures every request is authenticated and user-scoped.
 */
async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { 'Authorization': `Bearer ${session.access_token}` };
}

export const api = {
    async uploadResume(file, userId = 'local-user', candidateName = '') {
        const authHeaders = await getAuthHeaders();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);
        if (candidateName) formData.append('candidate_name', candidateName.trim());

        const res = await fetch(`${API_BASE}/upload-resume`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Upload failed');
        }
        return res.json();
    },

    async uploadJob(jobText, title = '') {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/upload-job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ job_text: jobText, title }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Job upload failed');
        }
        return res.json();
    },

    async evaluate(resumeId, jobId, fairMode = false) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ resume_id: resumeId, job_id: jobId, fair_mode: fairMode }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Evaluation failed');
        }
        return res.json();
    },

    async getResumes() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/resumes`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error('Failed to fetch resumes');
        return res.json();
    },

    async getJobs() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/jobs`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
    },

    async deleteJob(jobId) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to delete job');
        }
        return res.json();
    },

    async getResults() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/results`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error('Failed to fetch results');
        return res.json();
    },

    async getCandidates() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/candidates`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error('Failed to fetch candidates');
        return res.json();
    },

    async updateResumeStatus(resumeId, status) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/resumes/${resumeId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to update status');
        }
        return res.json();
    },

    async deleteResume(resumeId) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/resumes/${resumeId}`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to delete candidate');
        }
        return res.json();
    },

    async rewriteText(text, mode = 'ats') {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/rewrite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ text, mode }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Rewrite failed');
        }
        return res.json();
    },

    async updateCandidateStatus(matchId, status) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/results/${matchId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to update candidate status');
        }
        return res.json();
    },

    async getAtsScore(resumeId) {
        const authHeaders = await getAuthHeaders();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s — racing engine returns faster
        try {
            const res = await fetch(`${API_BASE}/resumes/${resumeId}/ats`, {
                headers: { ...authHeaders },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to fetch ATS score');
            }
            return res.json();
        } catch (e) {
            clearTimeout(timeout);
            if (e.name === 'AbortError') throw new Error('Analysis timed out. Please try again.');
            throw e;
        }
    },

    async matchResume(resumeId, jdText, title = '') {
        const authHeaders = await getAuthHeaders();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s — racing engine returns faster
        try {
            const res = await fetch(`${API_BASE}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ resume_id: resumeId, jd_text: jdText, title }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Match analysis failed');
            }
            return res.json();
        } catch (e) {
            clearTimeout(timeout);
            if (e.name === 'AbortError') throw new Error('Match analysis timed out. Please try again.');
            throw e;
        }
    },

    async getStats() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/stats`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    // Admin Panel Routes
    async adminGetUsers() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to fetch users');
        }
        return res.json();
    },

    async adminDeleteUser(userId) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to delete user');
        }
        return res.json();
    },

    async adminWipeUserData(userId) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/users/${userId}/data`, {
            method: 'DELETE',
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to wipe user data');
        }
        return res.json();
    },

    async adminReassignData(sourceUserId, targetUserId) {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ source_user_id: sourceUserId, target_user_id: targetUserId }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to reassign data');
        }
        return res.json();
    },

    async adminGetLogs() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/logs`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to fetch logs');
        }
        return res.json();
    },

    async adminGetResumes() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/resumes`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to fetch global resumes');
        }
        return res.json();
    },

    async adminGetJobs() {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/admin/jobs`, {
            headers: { ...authHeaders },
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to fetch global jobs');
        }
        return res.json();
    }
};
