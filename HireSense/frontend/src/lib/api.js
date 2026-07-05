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

// ── Lightweight client cache ───────────────────────────────────────────────
// Cuts redundant API + DB hits two ways: (1) de-duplicates concurrent identical
// GETs (coalesce into one network call), and (2) briefly caches a small allowlist
// of stable read endpoints. Any write clears the cache. Realtime-driven endpoints
// (/candidates, /applications/mine, /jobs/{id}/applications, /student/resumes, …)
// are intentionally NOT cached so live updates stay fresh.
const CACHE_TTL_MS = 4000;
const CACHEABLE_GETS = ['/feed/jobs', '/jobs', '/stats', '/student/profile'];
const _getCache = new Map();   // key -> { ts, data }
const _inflight = new Map();   // key -> Promise

function _isCacheableGet(path) {
    const p = path.split('?')[0];
    return CACHEABLE_GETS.includes(p);
}

/**
 * Caching wrapper around the raw fetch (_doRequest):
 * serves fresh cache for allowlisted GETs, coalesces in-flight GETs, and
 * invalidates the cache after any mutating request.
 */
async function request(path, opts = {}) {
    const method = opts.method || 'GET';
    const key = `${method} ${path}`;

    if (method === 'GET') {
        if (_isCacheableGet(path)) {
            const hit = _getCache.get(key);
            if (hit && (Date.now() - hit.ts) < CACHE_TTL_MS) return hit.data;
        }
        const pending = _inflight.get(key);
        if (pending) return pending;

        const p = _doRequest(path, opts);
        _inflight.set(key, p);
        try {
            const data = await p;
            if (_isCacheableGet(path)) _getCache.set(key, { ts: Date.now(), data });
            return data;
        } finally {
            _inflight.delete(key);
        }
    }

    // Mutating request: run it, then drop cached reads so the next read is fresh.
    try {
        return await _doRequest(path, opts);
    } finally {
        _getCache.clear();
    }
}

// ── Cold-start resilience ──────────────────────────────────────────────────
// On the free tier the backend dyno sleeps after ~15 min idle. While it wakes
// (~30-60s) the gateway either drops the connection (fetch throws a TypeError —
// surfaced in the console as a misleading "CORS policy / Failed to fetch" error,
// since the gateway error page carries no CORS headers) or returns 502/503/504.
// We retry those transient states with a short backoff so a sleeping dyno waking
// up doesn't break login or the first dashboard load. 4xx and other 5xx are real
// errors and are never retried.
const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 3;             // total attempts = MAX_RETRIES + 1
const RETRY_BASE_DELAY_MS = 2000;  // backoff: 2s, 4s, 6s (~12s, plus warmUp head start)

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Single fetch attempt. Marks transient failures with `err.__retryable = true`
 * so the retry loop in `_doRequest` knows which ones are worth re-trying.
 */
async function _attempt(path, {
    method = 'GET',
    body,
    auth = true,
    json = true,
    signal,
    timeoutMs,
    fallbackError,
    timeoutMessage = 'Request timed out. Please try again.',
    authHeaders,
    skipAuthRedirect = false,
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
            // `skipAuthRedirect` opts out — used by the profile probe, whose 401
            // is owned by Supabase's refresh cycle and must not force a logout.
            if (res.status === 401 && auth !== false && !skipAuthRedirect && typeof window !== 'undefined') {
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.assign('/login');
                }
            }
            const err = new Error(await parseError(res, fallbackError));
            if (RETRY_STATUSES.has(res.status)) err.__retryable = true;
            throw err;
        }
        return res.json();
    } catch (e) {
        if (timeout) clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error(timeoutMessage);
        // A TypeError from fetch means the request never got a response
        // (dyno asleep, offline, DNS) — transient, worth retrying.
        if (e.__retryable === undefined && e instanceof TypeError) e.__retryable = true;
        throw e;
    }
}

async function downloadBlob(path, filenameFallback = 'download.xlsx') {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) {
        if (res.status === 401 && typeof window !== 'undefined') {
            try { await supabase.auth.signOut(); } catch { /* ignore */ }
            if (!window.location.pathname.startsWith('/login')) {
                window.location.assign('/login');
            }
        }
        throw new Error(await parseError(res, 'Download failed'));
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || filenameFallback;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { filename };
}

/**
 * Centralized fetch wrapper.
 *
 * - Spreads auth headers (unless `auth === false`).
 * - Sets JSON content-type (unless `json === false` or the body is FormData).
 * - Throws `Error(parseError(...))` on non-2xx responses.
 * - Optional `timeoutMs` aborts the request and surfaces `timeoutMessage`.
 * - Retries transient cold-start failures with backoff. Defaults ON for GETs
 *   (idempotent); pass `retry: true` to opt a mutation in, `retry: false` to opt out.
 */
async function _doRequest(path, opts = {}) {
    const method = opts.method || 'GET';
    const retry = opts.retry !== undefined ? opts.retry : method === 'GET';
    const maxAttempts = retry ? MAX_RETRIES + 1 : 1;

    for (let attempt = 0; ; attempt++) {
        try {
            return await _attempt(path, opts);
        } catch (e) {
            const canRetry = attempt < maxAttempts - 1 && e.__retryable;
            if (!canRetry) throw e;
            // Linear backoff + jitter so a burst of parallel GETs (e.g. the
            // dashboard load) doesn't retry in lockstep and hammer the waking dyno.
            await _sleep(RETRY_BASE_DELAY_MS * (attempt + 1) + Math.random() * 500);
        }
    }
}

export const api = {
    // Wake a sleeping free-tier backend so the first real request (login,
    // profile, dashboard) doesn't pay the cold-start. Fire-and-forget — hits the
    // unauthenticated /health root and ignores the outcome.
    warmUp() {
        const base = API_BASE.replace(/\/api\/?$/, '');
        try { fetch(`${base}/health`, { method: 'GET', cache: 'no-store' }).catch(() => {}); }
        catch { /* ignore */ }
    },

    // Fetch the signed-in user's profile. `token` lets the login flow pass the
    // freshly-issued access token before the session is cached. Retries on a
    // cold start (inherited from the GET default in _doRequest).
    async getProfile(token = null) {
        return request('/profile', {
            fallbackError: 'Failed to load profile',
            // A 401 here is owned by Supabase's session/refresh cycle — don't let
            // it force a global sign-out + redirect (avoids spurious logout on a
            // token-refresh race during restore).
            skipAuthRedirect: true,
            ...(token ? { authHeaders: { Authorization: `Bearer ${token}` } } : {}),
        });
    },

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

    async chatAssistant(message, history = []) {
        return request('/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history }),
            fallbackError: 'Assistant search failed',
        });
    },

    // Admin Panel Routes
    // Capability check — resolves for admins, throws (403) for everyone else.
    async adminCheck() {
        return request('/admin/me', { fallbackError: 'Not authorized' });
    },

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

    async downloadJobApplicationsExcel(jobId, title = 'job') {
        const safeTitle = String(title || 'job').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'job';
        return downloadBlob(`/jobs/${jobId}/applications/export.xlsx`, `${safeTitle}_applicants.xlsx`);
    },

    async getApplicantProfile() {
        return request('/student/profile', { fallbackError: 'Failed to load applicant profile' });
    },

    async updateApplicantProfile(updates) {
        return request('/student/profile', {
            method: 'PUT',
            body: JSON.stringify(updates),
            fallbackError: 'Failed to update profile',
        });
    },

    // Manually (re)fetch the applicant's public GitHub profile from their saved URL.
    async syncApplicantGithub() {
        return request('/student/profile/github-sync', {
            method: 'POST',
            fallbackError: 'Failed to sync GitHub',
            timeoutMs: 20000,
            timeoutMessage: 'GitHub sync timed out. Please try again.',
        });
    },

    // Upload an (already client-optimized) applicant avatar. `token` lets the
    // signup flow upload before AuthContext has a session cached.
    async uploadApplicantAvatar(file, token = null) {
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
    },

    // ── Applicant ATS checker ───────────────────────────────────
    async applicantAtsCheck(file) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/student/ats-check', {
            method: 'POST',
            body: formData,
            json: false,
            fallbackError: 'ATS check failed',
            timeoutMs: 60000, // upload only — the scan runs in the background
            timeoutMessage: 'Upload timed out. Please try again.',
        });
    },

    async getApplicantResumes() {
        return request('/student/resumes', { fallbackError: 'Failed to load your resumes' });
    },

    async deleteApplicantResume(resumeId) {
        return request(`/student/resumes/${resumeId}`, { method: 'DELETE', fallbackError: 'Failed to remove resume' });
    },

    async replaceApplicantResume(resumeId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return request(`/student/resumes/${resumeId}`, {
            method: 'PUT',
            body: formData,
            json: false,
            fallbackError: 'Failed to replace resume',
            timeoutMs: 60000, // upload only — the re-scan runs in the background
            timeoutMessage: 'Upload timed out. Please try again.',
        });
    }
};
