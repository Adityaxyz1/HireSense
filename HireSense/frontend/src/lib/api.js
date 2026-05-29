import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Get auth headers with Bearer token for all API calls.
 * This ensures every request is authenticated and user-scoped.
 */
async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { 'Authorization': `Bearer ${session.access_token}` };
}

/**
 * Safely extract an error message from a response. Unlike a bare
 * `await res.json()`, this never throws on non-JSON error bodies
 * (502/504/HTML gateway errors), so the real failure isn't masked.
 */
async function parseError(res, fallback) {
    const body = await res.json().catch(() => null);
    return (body && body.detail) || fallback || res.statusText || 'Request failed';
}

/**
 * Centralized fetch wrapper.
 *
 * - Spreads auth headers (unless `auth === false`).
 * - Sets JSON content-type (unless `json === false` or the body is FormData).
 * - Throws `Error(parseError(...))` on non-2xx responses.
 * - Optional `timeoutMs` aborts the request and surfaces `timeoutMessage`.
 */
async function request(path, {
    method = 'GET',
    body,
    auth = true,
    json = true,
    signal,
    timeoutMs,
    fallbackError,
    timeoutMessage = 'Request timed out. Please try again.',
    authHeaders,
} = {}) {
    const headers = {};
    if (json !== false && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    if (auth !== false) {
        Object.assign(headers, authHeaders || await getAuthHeaders());
    }

    let controller;
    let timeout;
    let reqSignal = signal;
    if (timeoutMs) {
        controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), timeoutMs);
        reqSignal = controller.signal;
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            ...(body !== undefined ? { body } : {}),
            ...(reqSignal ? { signal: reqSignal } : {}),
        });
        if (timeout) clearTimeout(timeout);
        if (!res.ok) {
            // Session expired / invalid token on an authenticated call:
            // clear the stale session and bounce to login once (no loop).
            if (res.status === 401 && auth !== false && typeof window !== 'undefined') {
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.assign('/login');
                }
            }
            throw new Error(await parseError(res, fallbackError));
        }
        return res.json();
    } catch (e) {
        if (timeout) clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error(timeoutMessage);
        throw e;
    }
}

export const api = {
    async uploadResume(file, candidateName = '') {
        const formData = new FormData();
        formData.append('file', file);
        if (candidateName) formData.append('candidate_name', candidateName.trim());
        return request('/upload-resume', { method: 'POST', body: formData, json: false, fallbackError: 'Upload failed' });
    },

    async uploadJob(jobText, title = '') {
        return request('/upload-job', {
            method: 'POST',
            body: JSON.stringify({ job_text: jobText, title }),
            fallbackError: 'Job upload failed',
        });
    },

    async evaluate(resumeId, jobId, fairMode = false) {
        return request('/evaluate', {
            method: 'POST',
            body: JSON.stringify({ resume_id: resumeId, job_id: jobId, fair_mode: fairMode }),
            fallbackError: 'Evaluation failed',
        });
    },

    async getResumes() {
        return request('/resumes', { fallbackError: 'Failed to fetch resumes' });
    },

    async getJobs() {
        return request('/jobs', { fallbackError: 'Failed to fetch jobs' });
    },

    async deleteJob(jobId) {
        return request(`/jobs/${jobId}`, { method: 'DELETE', fallbackError: 'Failed to delete job' });
    },

    async updateJob(jobId, updates) {
        return request(`/jobs/${jobId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
            fallbackError: 'Failed to update job',
        });
    },

    async uploadJobDocument(jobId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return request(`/jobs/${jobId}/upload-document`, {
            method: 'POST',
            body: formData,
            json: false,
            fallbackError: 'Failed to upload document',
        });
    },

    async triggerJobMatch(jobId) {
        return request(`/jobs/${jobId}/match`, { method: 'POST', fallbackError: 'Failed to trigger match' });
    },

    async getResults() {
        return request('/results', { fallbackError: 'Failed to fetch results' });
    },

    async getCandidates() {
        return request('/candidates', { fallbackError: 'Failed to fetch candidates' });
    },

    async updateResumeStatus(resumeId, status) {
        return request(`/resumes/${resumeId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
            fallbackError: 'Failed to update status',
        });
    },

    async deleteResume(resumeId) {
        return request(`/resumes/${resumeId}`, { method: 'DELETE', fallbackError: 'Failed to delete candidate' });
    },

    async rewriteText(text, mode = 'ats') {
        return request('/rewrite', {
            method: 'POST',
            body: JSON.stringify({ text, mode }),
            fallbackError: 'Rewrite failed',
        });
    },

    async updateCandidateStatus(matchId, status) {
        return request(`/results/${matchId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
            fallbackError: 'Failed to update candidate status',
        });
    },

    async getAtsScore(resumeId) {
        return request(`/resumes/${resumeId}/ats`, {
            fallbackError: 'Failed to fetch ATS score',
            timeoutMs: 30000, // 30s — racing engine returns faster
            timeoutMessage: 'Analysis timed out. Please try again.',
        });
    },

    async matchResume(resumeId, jdText, title = '') {
        return request('/match', {
            method: 'POST',
            body: JSON.stringify({ resume_id: resumeId, jd_text: jdText, title }),
            fallbackError: 'Match analysis failed',
            timeoutMs: 45000, // 45s — racing engine returns faster
            timeoutMessage: 'Match analysis timed out. Please try again.',
        });
    },

    async getStats() {
        return request('/stats', { fallbackError: 'Failed to fetch stats' });
    },

    // Admin Panel Routes
    async adminGetUsers() {
        return request('/admin/users', { fallbackError: 'Failed to fetch users' });
    },

    async adminDeleteUser(userId) {
        return request(`/admin/users/${userId}`, { method: 'DELETE', fallbackError: 'Failed to delete user' });
    },

    async adminWipeUserData(userId) {
        return request(`/admin/users/${userId}/data`, { method: 'DELETE', fallbackError: 'Failed to wipe user data' });
    },

    async adminReassignData(sourceUserId, targetUserId) {
        return request('/admin/reassign', {
            method: 'POST',
            body: JSON.stringify({ source_user_id: sourceUserId, target_user_id: targetUserId }),
            fallbackError: 'Failed to reassign data',
        });
    },

    async adminGetLogs() {
        return request('/admin/logs', { fallbackError: 'Failed to fetch logs' });
    },

    async adminGetResumes() {
        return request('/admin/resumes', { fallbackError: 'Failed to fetch global resumes' });
    },

    async adminGetJobs() {
        return request('/admin/jobs', { fallbackError: 'Failed to fetch global jobs' });
    },

    async adminUpdateJob(jobId, updates) {
        return request(`/admin/jobs/${jobId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
            fallbackError: 'Failed to update job',
        });
    },

    async adminDeleteJob(jobId) {
        return request(`/admin/jobs/${jobId}`, { method: 'DELETE', fallbackError: 'Failed to delete job' });
    },

    // ── Admin: Recruiter Management ─────────────────────────────
    async adminGetRecruiters(search = '', status = '') {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        return request(`/admin/recruiters?${params.toString()}`, { fallbackError: 'Failed to fetch recruiters' });
    },

    async adminCreateRecruiter(data) {
        return request('/admin/recruiters', {
            method: 'POST',
            body: JSON.stringify(data),
            fallbackError: 'Failed to create recruiter',
        });
    },

    async adminUpdateRecruiter(rid, updates) {
        return request(`/admin/recruiters/${rid}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
            fallbackError: 'Failed to update recruiter',
        });
    },

    async adminSetRecruiterStatus(rid, status) {
        return request(`/admin/recruiters/${rid}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
            fallbackError: 'Failed to update status',
        });
    },

    async adminDeleteRecruiter(rid) {
        return request(`/admin/recruiters/${rid}`, { method: 'DELETE', fallbackError: 'Failed to delete recruiter' });
    },

    async adminGetAuditLogs() {
        return request('/admin/audit-logs', { fallbackError: 'Failed to fetch audit logs' });
    },

    // ── Student Region ──────────────────────────────────────────
    async getJobFeed() {
        return request('/feed/jobs', { auth: false, fallbackError: 'Failed to load job feed' });
    },

    async getJobFeedDetail(jobId) {
        return request(`/feed/jobs/${jobId}`, { auth: false, fallbackError: 'Failed to load job' });
    },

    async applyToJob(jobId, file) {
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('file', file);
        return request('/applications/apply', {
            method: 'POST',
            body: formData,
            json: false,
            fallbackError: 'Application failed',
        });
    },

    async getMyApplications() {
        return request('/applications/mine', { fallbackError: 'Failed to load applications' });
    },

    async getJobApplications(jobId) {
        return request(`/jobs/${jobId}/applications`, { fallbackError: 'Failed to load applicants' });
    },

    async getStudentProfile() {
        return request('/student/profile', { fallbackError: 'Failed to load student profile' });
    },

    async updateStudentProfile(updates) {
        return request('/student/profile', {
            method: 'PUT',
            body: JSON.stringify(updates),
            fallbackError: 'Failed to update profile',
        });
    },

    // Upload an (already client-optimized) student avatar. `token` lets the
    // signup flow upload before AuthContext has a session cached.
    async uploadStudentAvatar(file, token = null) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/student/profile/avatar', {
            method: 'POST',
            body: formData,
            json: false,
            fallbackError: 'Failed to upload profile picture',
            // When a token is passed, use it directly instead of the session.
            ...(token ? { authHeaders: { Authorization: `Bearer ${token}` } } : {}),
        });
    }
};
