/**
 * Centralized API client.
 * - Base URL from VITE_API_BASE_URL (set on Cloudflare Pages Dashboard for prod)
 * - Fix #2: no secrets in source — admin key passed in at call site from sessionStorage
 * - Fix #3: CORS is handled server-side; this client sends the right headers
 * - Fix #4: renderProject is public — no admin key required for end-user creation
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { ...(options.headers ?? {}) },
    });

    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            msg = body.error ?? msg;
        } catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json();
}

// ── Public endpoints (no auth required) ──────────────────────────────────────

/** List all registered templates. */
export async function listTemplates() {
    return apiFetch('/api/template/list');
}

/**
 * Render (create/update) a user project page.
 * Public endpoint — accessible by end users, no admin key needed.
 * Rate-limit / abuse protection should be added server-side (Turnstile in P2).
 */
export async function renderProject(payload) {
    return apiFetch('/api/project/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// ── Admin endpoints (require admin key) ──────────────────────────────────────

/** Upload a new template — admin only. */
export async function uploadTemplate(formData, adminKey) {
    return apiFetch('/api/template/upload', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
        body: formData,
    });
}

/** Get raw project config from KV — admin only. */
export async function getProject(subdomain, adminKey) {
    return apiFetch(`/api/project/${subdomain}`, {
        headers: { 'X-Admin-Key': adminKey },
    });
}
